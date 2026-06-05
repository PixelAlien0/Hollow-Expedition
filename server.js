const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const SAVES_DIR = path.join(__dirname, 'saves');
const DATABASE_DIR = path.join(__dirname, 'database');
const ITEMS_FILE = path.join(DATABASE_DIR, 'items.json');
const YOKAI_FILE = path.join(DATABASE_DIR, 'yokai.json');
const ACTIONS_FILE = path.join(DATABASE_DIR, 'actions.json');
const AREAS_FILE = path.join(DATABASE_DIR, 'areas.json');
const SKILLS_FILE = path.join(DATABASE_DIR, 'skills.json');
const BACKUPS_DIR = path.join(DATABASE_DIR, 'backups');
const DB_FILE = path.join(DATABASE_DIR, 'game.db');
let db;
let skillsDatabase = {};

// === SAFETY NET: Tier 3 — Schema Structural Integrity Validators ===
function validateItemsSchema(data) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return 'Items database must be a JSON object (not an array or null).';
    }
    const keys = Object.keys(data);
    if (keys.length === 0) {
        return 'Items database cannot be empty. At least one item entry is required.';
    }
    for (const key of keys) {
        const item = data[key];
        if (typeof item !== 'object' || item === null) {
            return `Item "${key}" must be an object.`;
        }
        if (typeof item.name !== 'string' || !item.name.trim()) {
            return `Item "${key}" is missing a valid "name" (string).`;
        }
        if (typeof item.type !== 'string' || !item.type.trim()) {
            return `Item "${key}" is missing a valid "type" (string). Expected: material, consumable, weapon, helmet, shield, armor, accessory, or avatar.`;
        }
        if (typeof item.rarity !== 'string' || !item.rarity.trim()) {
            return `Item "${key}" is missing a valid "rarity" (string). Expected: common, uncommon, rare, or epic.`;
        }
        if (item.recipe) {
            if (typeof item.recipe !== 'object' || item.recipe === null || Array.isArray(item.recipe)) {
                return `Item "${key}" recipe must be an object.`;
            }
            if (item.recipe.cost !== undefined && (typeof item.recipe.cost !== 'number' || item.recipe.cost < 0)) {
                return `Item "${key}" recipe cost must be a non-negative number.`;
            }
            if (typeof item.recipe.ingredients !== 'object' || item.recipe.ingredients === null || Array.isArray(item.recipe.ingredients)) {
                return `Item "${key}" recipe ingredients must be an object map of key-quantities.`;
            }
            const ingKeys = Object.keys(item.recipe.ingredients);
            if (ingKeys.length === 0) {
                return `Item "${key}" recipe must have at least one ingredient.`;
            }
            for (const ingKey of ingKeys) {
                const qty = item.recipe.ingredients[ingKey];
                if (typeof qty !== 'number' || qty <= 0 || !Number.isInteger(qty)) {
                    return `Item "${key}" recipe ingredient "${ingKey}" quantity must be a positive integer.`;
                }
            }
        }
        if (item.skills !== undefined) {
            if (item.type !== 'weapon') {
                return `Item "${key}" of type "${item.type}" cannot have skills. Skills are assignable to weapons only.`;
            }
            if (!Array.isArray(item.skills)) {
                return `Item "${key}" skills must be an array of skill keys.`;
            }
            for (const sKey of item.skills) {
                if (typeof sKey !== 'string' || !sKey.trim()) {
                    return `Item "${key}" has an invalid skill key (must be a non-empty string).`;
                }
            }
        }
    }
    return null; // Valid
}

function validateSkillsSchema(data) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return 'Skills database must be a JSON object (not an array or null).';
    }
    const keys = Object.keys(data);
    for (const key of keys) {
        const skill = data[key];
        if (typeof skill !== 'object' || skill === null) {
            return `Skill "${key}" must be an object.`;
        }
        if (typeof skill.name !== 'string' || !skill.name.trim()) {
            return `Skill "${key}" is missing a valid "name" (string).`;
        }
        if (typeof skill.desc !== 'string') {
            return `Skill "${key}" must have a "desc" string.`;
        }
        if (typeof skill.staminaCost !== 'number' || skill.staminaCost < 0) {
            return `Skill "${key}" must have a non-negative "staminaCost" number.`;
        }
        if (typeof skill.cooldown !== 'number' || skill.cooldown < 0) {
            return `Skill "${key}" must have a non-negative "cooldown" number.`;
        }
    }
    return null; // Valid
}

function validateYokaiSchema(data) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return 'Yokai database must be a JSON object (not an array or null).';
    }
    const keys = Object.keys(data);
    if (keys.length === 0) {
        return 'Yokai database cannot be empty. At least one monster entry is required.';
    }
    for (const key of keys) {
        const yokai = data[key];
        if (typeof yokai !== 'object' || yokai === null) {
            return `Yokai "${key}" must be an object.`;
        }
        if (typeof yokai.name !== 'string' || !yokai.name.trim()) {
            return `Yokai "${key}" is missing a valid "name" (string).`;
        }
        const numericFields = ['hp', 'attack', 'defense', 'speed'];
        for (const field of numericFields) {
            if (typeof yokai[field] !== 'number' || yokai[field] <= 0) {
                return `Yokai "${key}" requires "${field}" to be a positive number. Got: ${JSON.stringify(yokai[field])}`;
            }
        }
    }
    return null; // Valid
}

function validateActionsSchema(data) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return 'Actions database must be a JSON object (not an array or null).';
    }
    const requiredBlocks = ['strike', 'parry', 'flee', 'rest', 'startingState', 'leveling', 'explore', 'scavenge'];
    for (const block of requiredBlocks) {
        if (!data[block] || typeof data[block] !== 'object') {
            return `Actions database is missing required block "${block}". Deleting core engine configuration blocks is not permitted.`;
        }
    }
    // Validate startingState has critical nested fields
    const ss = data.startingState;
    if (typeof ss.level !== 'number' || typeof ss.experienceNeeded !== 'number') {
        return '"startingState" must contain numeric "level" and "experienceNeeded" fields.';
    }
    if (!ss.stats || typeof ss.stats !== 'object') {
        return '"startingState" must contain a "stats" object with health, maxHealth, attack, and defense.';
    }
    return null; // Valid
}

function validateAreasSchema(data) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return 'Areas database must be a JSON object (not an array or null).';
    }
    const keys = Object.keys(data);
    if (keys.length === 0) {
        return 'Areas database cannot be empty. At least one area entry is required.';
    }
    for (const key of keys) {
        const area = data[key];
        if (typeof area !== 'object' || area === null) {
            return `Area "${key}" must be an object.`;
        }
        if (typeof area.name !== 'string' || !area.name.trim()) {
            return `Area "${key}" is missing a valid "name" (string).`;
        }
        if (typeof area.minLevel !== 'number' || area.minLevel < 1) {
            return `Area "${key}" requires "minLevel" to be a positive number.`;
        }
        if (!Array.isArray(area.yokaiPool) || area.yokaiPool.length === 0) {
            return `Area "${key}" must have a non-empty "yokaiPool" array.`;
        }
        if (!Array.isArray(area.lootPool) || area.lootPool.length === 0) {
            return `Area "${key}" must have a non-empty "lootPool" array.`;
        }
        if (area.background !== undefined && typeof area.background !== 'string') {
            return `Area "${key}" has an invalid background property (must be a string URL or path).`;
        }
    }
    return null; // Valid
}

const DEFAULT_ITEMS = {
    "green_tea_leaves": {
        "name": "Green Tea Leaves",
        "desc": "Fresh green leaves. Highly demanded by tea masters.",
        "value": 5,
        "type": "material",
        "rarity": "common",
        "sprite": "green_tea_leaves.png"
    },
    "bamboo_shoots": {
        "name": "Bamboo Shoots",
        "desc": "Crisp and edible. A common forest ingredient.",
        "value": 5,
        "type": "material",
        "rarity": "common",
        "sprite": "bamboo_shoots.png"
    },
    "wild_fruit": {
        "name": "Wild Fruit",
        "desc": "Sweet forest fruit.",
        "value": 5,
        "type": "material",
        "rarity": "common",
        "sprite": "wild_fruit.png"
    },
    "wild_root": {
        "name": "Wild Root",
        "desc": "A crunchy root foraged from muddy ponds.",
        "value": 8,
        "type": "material",
        "rarity": "uncommon",
        "sprite": "wild_root.png"
    },
    "healing_herbs": {
        "name": "Healing Herbs",
        "desc": "Restores 15 HP.",
        "value": 4,
        "type": "consumable",
        "rarity": "common",
        "sprite": "healing_herbs.png",
        "effects": {
            "hpRestore": 15
        }
    },
    "energy_tea": {
        "name": "Energy Tea",
        "desc": "Restores 25 Stamina.",
        "value": 6,
        "type": "consumable",
        "rarity": "common",
        "sprite": "energy_tea.png",
        "effects": {
            "staminaRestore": 25
        }
    },
    "rice_bowl": {
        "name": "Rice Bowl",
        "desc": "Savory meal. Restores 30 HP and 15 Stamina.",
        "value": 10,
        "type": "consumable",
        "rarity": "uncommon",
        "sprite": "rice_bowl.png",
        "effects": {
            "hpRestore": 30,
            "staminaRestore": 15
        }
    },
    "water_shell": {
        "name": "Water Shell",
        "desc": "A smooth water-resistant shell.",
        "value": 20,
        "type": "material",
        "rarity": "rare",
        "sprite": "water_shell.png"
    },
    "wind_feather": {
        "name": "Wind Feather",
        "desc": "A glossy dark feather carrying currents of wind.",
        "value": 35,
        "type": "material",
        "rarity": "rare",
        "sprite": "wind_feather.png"
    },
    "demon_horn": {
        "name": "Demon Horn",
        "desc": "A heavy, dark crimson horn vibrating with power.",
        "value": 50,
        "type": "material",
        "rarity": "epic",
        "sprite": "demon_horn.png"
    },
    "wooden_sword": {
        "name": "Wooden Sword",
        "desc": "A heavy wooden training sword. Adds +3 Attack.",
        "value": 15,
        "type": "weapon",
        "rarity": "common",
        "sprite": "wooden_sword.png",
        "effects": {
            "attackBonus": 3
        }
    },
    "steel_sword": {
        "name": "Steel Sword",
        "desc": "A legendary, razor-sharp steel blade. Adds +8 Attack.",
        "value": 150,
        "type": "weapon",
        "rarity": "epic",
        "sprite": "steel_sword.png",
        "effects": {
            "attackBonus": 8
        }
    },
    "golden_elixir": {
        "name": "Golden Elixir",
        "desc": "An elixir. Fully restores Health and Stamina.",
        "value": 100,
        "type": "consumable",
        "rarity": "epic",
        "sprite": "golden_elixir.gif",
        "effects": {
            "hpRestore": 999,
            "staminaRestore": 999
        }
    },
    "wooden_staff": {
        "name": "Wooden Staff",
        "desc": "A simple, light wooden staff. Adds +2 Attack.",
        "value": 10,
        "type": "weapon",
        "rarity": "common",
        "sprite": "wooden_staff.png",
        "effects": {
            "attackBonus": 2
        }
    },
    "refined_blade": {
        "name": "Refined Blade",
        "desc": "A battle-worn curved blade. Perfect Condition. Adds +6 Attack.",
        "value": 50,
        "type": "weapon",
        "rarity": "rare",
        "sprite": "refined_blade.png",
        "effects": {
            "attackBonus": 6
        }
    },
    "rusted_blade": {
        "name": "Rusted Blade",
        "desc": "An old, battle-worn curved blade. Adds +4 Attack.",
        "value": 25,
        "type": "weapon",
        "rarity": "uncommon",
        "sprite": "rusted_blade.png",
        "effects": {
            "attackBonus": 4
        }
    },
    "agile_dagger": {
        "name": "Agile Dagger",
        "desc": "A short, agile steel sword. Adds +6 Attack.",
        "value": 65,
        "type": "weapon",
        "rarity": "rare",
        "sprite": "agile_dagger.png",
        "effects": {
            "attackBonus": 6
        }
    },
    "iron_club": {
        "name": "Iron Club",
        "desc": "A spiked club capable of crushing bone. Adds +10 Attack.",
        "value": 200,
        "type": "weapon",
        "rarity": "epic",
        "sprite": "iron_club.png",
        "effects": {
            "attackBonus": 10
        }
    },
    "straw_hat": {
        "name": "Straw Hat",
        "desc": "A simple woven straw hat. Adds +1 Defense.",
        "value": 8,
        "type": "helmet",
        "rarity": "common",
        "sprite": "straw_hat.png",
        "effects": {
            "defenseBonus": 1
        }
    },
    "wooden_shield": {
        "name": "Wooden Shield",
        "desc": "A round wooden shield. Adds +2 Defense.",
        "value": 15,
        "type": "shield",
        "rarity": "common",
        "sprite": "wooden_shield.png",
        "effects": {
            "defenseBonus": 2
        }
    },
    "iron_plate_armor": {
        "name": "Iron Plate Armor",
        "desc": "Traditional iron plate armor. Adds +5 Defense.",
        "value": 120,
        "type": "armor",
        "rarity": "rare",
        "sprite": "iron_plate_armor.png",
        "effects": {
            "defenseBonus": 5
        }
    },
    "lucky_amulet": {
        "name": "Lucky Amulet",
        "desc": "A protective amulet. Adds +1 Attack and +1 Defense.",
        "value": 30,
        "type": "accessory",
        "rarity": "uncommon",
        "sprite": "lucky_amulet.png",
        "effects": {
            "attackBonus": 1,
            "defenseBonus": 1
        }
    }
};

const DEFAULT_YOKAI = {
    "kappa": {
        "name": "Kappa",
        "hp": 40,
        "maxHp": 40,
        "attack": 4,
        "defense": 3,
        "speed": 3000,
        "xpReward": 35,
        "coinReward": 10,
        "loot": {
            "pool": ["water_shell"],
            "bonusChance": 0.35
        }
    },
    "tengu": {
        "name": "Tengu",
        "hp": 60,
        "maxHp": 60,
        "attack": 6,
        "defense": 4,
        "speed": 2500,
        "xpReward": 55,
        "coinReward": 15,
        "loot": {
            "pool": ["wind_feather"],
            "bonusChance": 0.35
        }
    },
    "kitsune": {
        "name": "Kitsune",
        "hp": 50,
        "maxHp": 50,
        "attack": 5,
        "defense": 5,
        "speed": 2000,
        "xpReward": 50,
        "coinReward": 12,
        "loot": {
            "pool": ["rice_bowl"],
            "bonusChance": 0.35
        }
    },
    "oni": {
        "name": "Oni",
        "hp": 80,
        "maxHp": 80,
        "attack": 8,
        "defense": 6,
        "speed": 3500,
        "xpReward": 75,
        "coinReward": 20,
        "loot": {
            "pool": ["demon_horn"],
            "bonusChance": 0.35,
            "drops": [
                { "pool": ["golden_elixir"], "chance": 0.05 }
            ]
        }
    }
};

const DEFAULT_ACTIONS = {
    "strike": {
        "cooldown": 800,
        "damageVariance": 3,
        "baseMinDamage": 2
    },
    "parry": {
        "cooldown": 2500,
        "perfectWindow": 700,
        "earlyWindow": 1800,
        "perfectMitigation": 0.1,
        "earlyMitigation": 0.5,
        "missMultiplier": 1.4,
        "counterMultiplier": 1.5,
        "counterMinDamage": 3,
        "missMinDamage": 2
    },
    "flee": {
        "staminaCost": 15,
        "successRate": 0.5
    },
    "rest": {
        "coinCost": 5,
        "innHealPercent": 1.0
    },
    "startingState": {
        "level": 1,
        "experience": 0,
        "experienceNeeded": 100,
        "coins": 0,
        "stamina": 100,
        "maxStamina": 100,
        "stats": { "health": 50, "maxHealth": 50, "attack": 5, "defense": 5 },
        "inventory": {},
        "sprite": "Avatars/yashinzen_180342.png"
    },
    "leveling": {
        "xpMultiplier": 1.5,
        "maxHealthIncrease": 10,
        "attackIncrease": 2,
        "defenseIncrease": 2
    },
    "passiveRegen": {
        "interval": 5000,
        "staminaAmount": 2
    },
    "combatDefeat": {
        "minCoinsLost": 5,
        "maxCoinsLost": 15,
        "healthRestore": 10,
        "staminaRestorePercent": 0.2
    },
    "combat": {
        "bonusLootChance": 0.35,
        "bonusLootPool": ["healing_herbs", "energy_tea", "rice_bowl"],
        "defenseMitigationFactor": 2.0
    },
    "raritySettings": {
        "weights": {
            "common": 0.70,
            "uncommon": 0.20,
            "rare": 0.08,
            "epic": 0.02
        },
        "valueMultipliers": {
            "common": 1.0,
            "uncommon": 1.5,
            "rare": 2.5,
            "epic": 4.0
        }
    },
    "explore": {
        "staminaCost": 10,
        "sneakStaminaCost": 5,
        "cooldown": 1500,
        "encounterChance": 0.4,
        "forageChance": 0.35,
        "shrineChance": 0.15,
        "springChance": 0.1,
        "legendaryEncounterChance": 0.03,
        "legendaryEvents": {
            "sword_master": {
                "name": "Wandering Sword Master",
                "xpReward": 50,
                "weaponChance": 0.50,
                "weaponPool": ["wooden_sword", "steel_sword"]
            },
            "legendary_shrine": {
                "name": "Ancient Shinto Shrine",
                "xpReward": 100,
                "minCoins": 25,
                "maxCoins": 50,
                "consumablePool": ["healing_herbs", "energy_tea", "rice_bowl", "golden_elixir"]
            }
        },
        "forageXpMin": 12,
        "forageXpMax": 20,
        "forageCoinsMin": 2,
        "forageCoinsMax": 6,
        "foragePool": {
            "material": ["green_tea_leaves", "bamboo_shoots", "wild_fruit", "wild_root"],
            "consumable": ["healing_herbs", "energy_tea"],
            "materialChance": 0.8
        },
        "shrineStaminaMin": 20,
        "shrineStaminaMax": 40,
        "shrineXpReward": 10,
        "springHealthMin": 20,
        "springHealthMax": 40
    },
    "scavenge": {
        "staminaCost": 15,
        "cooldown": 3000,
        "successChance": 0.70,
        "xpMin": 15,
        "xpMax": 30,
        "coinsMin": 5,
        "coinsMax": 20,
        "lootPool": ["bamboo_shoots", "wild_root", "water_shell", "wind_feather", "rusted_blade", "straw_hat"]
    }
};

let itemDatabase = {};
let yokaiPool = {};
let actionDatabase = {};
let areaDatabase = {};

const activeParties = {};
const playerPartyMap = {};

const DEFAULT_AREAS = {
    "bamboo_grove": {
        "name": "Bamboo Grove",
        "desc": "A tranquil path lined with rustling bamboo stalks. Sights of common Yokai here.",
        "minLevel": 1,
        "encounterChance": 0.35,
        "forageChance": 0.4,
        "yokaiPool": ["kappa", "kitsune"],
        "lootPool": ["matcha_leaves", "persimmons", "healing_herbs"],
        "scavengeLootPool": ["bamboo_shoots", "wild_root"],
        "difficultyMultiplier": 1,
        "background": "Map_Markers_Tree_Forest.png"
    },
    "windy_peaks": {
        "name": "Windy Peaks",
        "desc": "A high cliffside trail swept by howling winds. More dangerous entities reside here.",
        "minLevel": 3,
        "encounterChance": 0.45,
        "forageChance": 0.3,
        "yokaiPool": ["tengu", "kitsune"],
        "lootPool": ["tengu_feather", "rice_ball", "matcha_tea", "lotus_root"],
        "scavengeLootPool": ["wind_feather", "rusted_blade"],
        "difficultyMultiplier": 1.3,
        "background": "Map_Markers_Mountains_Hills_Cliffs_Terrain.png"
    },
    "demon_mount": {
        "name": "Demon Mountain",
        "desc": "A volcanic peak covered in ash. Home to the strongest Oni.",
        "minLevel": 5,
        "encounterChance": 0.5,
        "forageChance": 0.25,
        "yokaiPool": ["oni", "tengu"],
        "lootPool": ["oni_horn", "training_sword", "steel_katana", "golden_elixir"],
        "scavengeLootPool": ["demon_horn", "iron_plate_armor"],
        "difficultyMultiplier": 1.7,
        "background": "Map_Markers_Volcano.png"
    }
};

const DEFAULT_SKILLS = {
    "heavy_slash": {
        "name": "Heavy Slash",
        "desc": "A sweeping heavy strike. Deals 1.6x weapon damage.",
        "staminaCost": 15,
        "cooldown": 4000,
        "effects": {
            "damageMultiplier": 1.6
        }
    },
    "flame_strike": {
        "name": "Flame Strike",
        "desc": "Ignites the blade. Deals 1.2x damage and inflicts Burn (8 dmg/tick for 3 ticks).",
        "staminaCost": 20,
        "cooldown": 6000,
        "effects": {
            "damageMultiplier": 1.2,
            "inflictEffect": "burned",
            "effectTicks": 3
        }
    },
    "remedy_light": {
        "name": "Healing Remedy",
        "desc": "Chants a minor healing spell, restoring 20 Health.",
        "staminaCost": 25,
        "cooldown": 8000,
        "effects": {
            "healAmount": 20
        }
    },
    "piercing_stab": {
        "name": "Piercing Stab",
        "desc": "Ignores Yokai defense entirely. Deals flat 1.1x attack damage.",
        "staminaCost": 12,
        "cooldown": 5000,
        "effects": {
            "damageMultiplier": 1.1,
            "ignoreDefense": true
        }
    }
};

async function loadGameDatabase() {
    try {
        await fs.mkdir(DATABASE_DIR, { recursive: true });

        // Load items database with fallback generator
        try {
            itemDatabase = JSON.parse(await fs.readFile(ITEMS_FILE, 'utf8'));
        } catch (err) {
            console.log("[Game Database] items.json missing. Generating default...");
            itemDatabase = DEFAULT_ITEMS;
            await fs.writeFile(ITEMS_FILE, JSON.stringify(DEFAULT_ITEMS, null, 2), 'utf8');
        }

        // Load yokai database with fallback generator
        try {
            yokaiPool = JSON.parse(await fs.readFile(YOKAI_FILE, 'utf8'));
        } catch (err) {
            console.log("[Game Database] yokai.json missing. Generating default...");
            yokaiPool = DEFAULT_YOKAI;
            await fs.writeFile(YOKAI_FILE, JSON.stringify(DEFAULT_YOKAI, null, 2), 'utf8');
        }

        // Load actions database with fallback generator
        try {
            actionDatabase = JSON.parse(await fs.readFile(ACTIONS_FILE, 'utf8'));
        } catch (err) {
            console.log("[Game Database] actions.json missing. Generating default...");
            actionDatabase = DEFAULT_ACTIONS;
            await fs.writeFile(ACTIONS_FILE, JSON.stringify(DEFAULT_ACTIONS, null, 2), 'utf8');
        }

        // Load areas database with fallback generator
        try {
            areaDatabase = JSON.parse(await fs.readFile(AREAS_FILE, 'utf8'));
        } catch (err) {
            console.log("[Game Database] areas.json missing. Generating default...");
            areaDatabase = DEFAULT_AREAS;
            await fs.writeFile(AREAS_FILE, JSON.stringify(DEFAULT_AREAS, null, 2), 'utf8');
        }

        // Load skills database with fallback generator
        try {
            skillsDatabase = JSON.parse(await fs.readFile(SKILLS_FILE, 'utf8'));
        } catch (err) {
            console.log("[Game Database] skills.json missing. Generating default...");
            skillsDatabase = DEFAULT_SKILLS;
            await fs.writeFile(SKILLS_FILE, JSON.stringify(DEFAULT_SKILLS, null, 2), 'utf8');
        }

        console.log("[Game Database] Successfully loaded items, Yokai, actions, areas, and skills!");
    } catch (err) {
        console.error("[Game Database] Boot Error:", err);
    }
}

function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_FILE, async (err) => {
            if (err) {
                console.error("[Database] Initialization failed:", err);
                return reject(err);
            }
            console.log("[Database] Connected to SQLite database.");

            db.serialize(() => {
                db.run("PRAGMA journal_mode=WAL;");
                db.run("PRAGMA busy_timeout=5000;");

                db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        username TEXT PRIMARY KEY,
                        password TEXT NOT NULL,
                        is_admin INTEGER DEFAULT 0
                    )
                `);

                db.run(`
                    CREATE TABLE IF NOT EXISTS market_listings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        seller TEXT NOT NULL,
                        item_key TEXT NOT NULL,
                        quantity INTEGER NOT NULL,
                        price INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Index optimizations for market listing lookups and sorting
                db.run("CREATE INDEX IF NOT EXISTS idx_market_listings_seller ON market_listings(seller);");
                db.run("CREATE INDEX IF NOT EXISTS idx_market_listings_created_at ON market_listings(created_at DESC);");

                db.run(`
                    CREATE TABLE IF NOT EXISTS saves (
                        username TEXT PRIMARY KEY,
                        state TEXT NOT NULL,
                        FOREIGN KEY (username) REFERENCES users(username)
                    )
                `, async (tableErr) => {
                    if (tableErr) return reject(tableErr);

                    try {
                        await migrateJsonToSqlite();
                        resolve();
                    } catch (migrationErr) {
                        reject(migrationErr);
                    }
                });
            });
        });
    });
}

async function migrateJsonToSqlite() {
    let usersJsonExists = false;
    try {
        await fs.access(USERS_FILE);
        usersJsonExists = true;
    } catch (e) { }

    if (usersJsonExists) {
        console.log("[Migration] Found users.json. Migrating data to SQLite...");
        try {
            const rawUsers = await fs.readFile(USERS_FILE, 'utf8');
            const users = JSON.parse(rawUsers);

            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");

                    const userStmt = db.prepare("INSERT OR IGNORE INTO users (username, password, is_admin) VALUES (?, ?, ?)");
                    const saveStmt = db.prepare("INSERT OR REPLACE INTO saves (username, state) VALUES (?, ?)");

                    const promises = [];

                    for (const [username, userData] of Object.entries(users)) {
                        const lowerUsername = username.toLowerCase();
                        const password = userData.password;
                        const isAdmin = userData.isAdmin ? 1 : 0;

                        userStmt.run(lowerUsername, password, isAdmin);

                        const savePath = path.join(SAVES_DIR, `${lowerUsername}.json`);
                        promises.push(
                            fs.readFile(savePath, 'utf8')
                                .then(saveData => {
                                    saveStmt.run(lowerUsername, saveData);
                                })
                                .catch(err => {
                                    const defaultState = getInitialPlayerState();
                                    saveStmt.run(lowerUsername, JSON.stringify(defaultState));
                                    console.log(`[Migration] Created default save state for ${lowerUsername}`);
                                })
                        );
                    }

                    Promise.all(promises).then(() => {
                        userStmt.finalize();
                        saveStmt.finalize();
                        db.run("COMMIT", (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    }).catch(reject);
                });
            });

            const backupSuffix = `_migrated_${new Date().toISOString().replace(/[:.]/g, '-')}`;
            await fs.rename(USERS_FILE, `${USERS_FILE}${backupSuffix}`);

            try {
                await fs.rename(SAVES_DIR, `${SAVES_DIR}${backupSuffix}`);
                console.log(`[Migration] Saves directory backed up to saves${backupSuffix}`);
            } catch (savesErr) {
                console.error("[Migration] Failed to backup saves folder:", savesErr.message);
            }

            console.log("[Migration] Migration completed successfully!");
        } catch (err) {
            console.error("[Migration] Error during migration:", err);
            db.run("ROLLBACK");
            throw err;
        }
    }
}

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/sprites', express.static(path.join(__dirname, '1-bit_Pixel_Icons', 'Sprites_Cropped')));

const sessionMiddleware = session({
    secret: 'super_secret_skeleton_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
});

app.use(sessionMiddleware);

// Share session with Socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// Middleware to enforce admin role via direct SQLite lookup
function requireAdmin(req, res, next) {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const lowerUsername = req.session.username.toLowerCase();
    db.get("SELECT is_admin FROM users WHERE username = ?", [lowerUsername], (err, row) => {
        if (err) {
            console.error("[Database] Admin check failed:", err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!row || row.is_admin !== 1) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    });
}

// XSS Prevention: escape HTML characters
function sanitizeString(str, key = '') {
    if (typeof str !== 'string') return '';

    // Do not HTML-escape file paths, to avoid breaking links with '&' in them.
    // Also, auto-repair any paths that were previously corrupted by double-encoding.
    if (key === 'sprite' || key === 'background') {
        let cleanStr = str.replace(/&amp;/g, "&");
        return cleanStr.replace(/[<>"]/g, "");
    }

    return str
        .replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Recursively sanitize objects (Prototype Pollution & XSS protection)
function sanitizeObject(obj, currentKey = '') {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        return sanitizeString(obj, currentKey);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, currentKey));
    }
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue;
            }
            const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
            if (safeKey) {
                sanitized[safeKey] = sanitizeObject(value, safeKey);
            }
        }
        return sanitized;
    }
    return obj;
}

// Helper functions
async function getUsers() {
    return new Promise((resolve) => {
        db.all("SELECT username, password, is_admin FROM users", [], (err, rows) => {
            if (err) {
                console.error("[Database] getUsers failed:", err);
                return resolve({});
            }
            const users = {};
            for (const row of rows) {
                users[row.username] = {
                    password: row.password,
                    isAdmin: row.is_admin === 1
                };
            }
            resolve(users);
        });
    });
}

async function saveUsers(users) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare("INSERT OR REPLACE INTO users (username, password, is_admin) VALUES (?, ?, ?)");
            for (const [username, userData] of Object.entries(users)) {
                stmt.run(username, userData.password, userData.isAdmin ? 1 : 0);
            }
            stmt.finalize();
            db.run("COMMIT", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

const playerCache = {};
const dirtyPlayers = new Set();

// Lock management to prevent race conditions during concurrent user operations
const playerLocks = {};
const lockQueues = {};

async function acquireLock(username) {
    if (!playerLocks[username]) {
        playerLocks[username] = true;
        return;
    }
    if (!lockQueues[username]) {
        lockQueues[username] = [];
    }
    return new Promise(resolve => {
        lockQueues[username].push(resolve);
    });
}

function releaseLock(username) {
    if (lockQueues[username] && lockQueues[username].length > 0) {
        const nextResolve = lockQueues[username].shift();
        nextResolve();
    } else {
        delete playerLocks[username];
        delete lockQueues[username];
    }
}
async function acquireLocks(usernames) {
    const sorted = [...new Set(usernames)].sort();
    for (const u of sorted) {
        await acquireLock(u);
    }
}
function releaseLocks(usernames) {
    const sorted = [...new Set(usernames)].sort();
    for (const u of sorted) {
        releaseLock(u);
    }
}

// Broadcast active market listings to all connected clients
function broadcastMarketListings() {
    db.all("SELECT * FROM market_listings ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            console.error("[Market Error] Failed to broadcast listings:", err);
            return;
        }
        io.emit('marketListings', { success: true, listings: rows });
    });
}

function getXpNeededForLevel(level) {
    return Math.floor(100 * Math.pow(1.2, level - 1));
}

async function getPlayerState(username) {
    if (playerCache[username]) {
        return playerCache[username];
    }
    return new Promise((resolve) => {
        db.get("SELECT state FROM saves WHERE username = ?", [username], (err, row) => {
            if (err || !row) {
                return resolve(null);
            }
            try {
                const state = JSON.parse(row.state);
                // Backward compatibility fallback for new stats
                if (state.stamina === undefined) state.stamina = 100;
                if (state.maxStamina === undefined) state.maxStamina = 100;
                state.experienceNeeded = getXpNeededForLevel(state.level || 1);
                if (state.stats && state.stats.maxHealth === undefined) {
                    state.stats.maxHealth = state.stats.health || 50;
                }
                if (!state.equipment) {
                    state.equipment = {};
                }
                EQUIPPABLE_TYPES.forEach(slot => {
                    if (state.equipment[slot] === undefined) {
                        state.equipment[slot] = null;
                    }
                });
                if (!state.currentArea) {
                    const areaKeys = Object.keys(areaDatabase);
                    state.currentArea = areaKeys[0] || 'bamboo_grove';
                }
                if (!state.quests) {
                    state.quests = { active: [], available: [] };
                }
                if (!Array.isArray(state.quests.active)) state.quests.active = [];
                if (!Array.isArray(state.quests.available)) state.quests.available = [];
                if (!state.quickBelt) {
                    state.quickBelt = [null, null, null];
                }
                if (!state.sprite && (!state.equipment || !state.equipment.avatar)) {
                    state.sprite = 'Avatars/yashinzen_180342.png';
                }

                playerCache[username] = state;
                resolve(state);
            } catch (parseErr) {
                resolve(null);
            }
        });
    });
}

async function savePlayerState(username, state) {
    playerCache[username] = state;
    dirtyPlayers.add(username);
}

function getInitialPlayerState() {
    const areaKeys = Object.keys(areaDatabase);
    const fallbackAreaKey = areaKeys[0] || 'bamboo_grove';
    const defaultState = actionDatabase.startingState || {
        level: 1,
        experience: 0,
        experienceNeeded: 100,
        coins: 0,
        stamina: 100,
        maxStamina: 100,
        stats: { health: 50, maxHealth: 50, attack: 5, defense: 5 },
        inventory: {},
        currentArea: fallbackAreaKey,
        quests: { active: [], available: [] }
    };
    const stateObj = JSON.parse(JSON.stringify(defaultState)); // Deep copy
    if (!stateObj.currentArea) stateObj.currentArea = fallbackAreaKey;
    if (!stateObj.quests) stateObj.quests = { active: [], available: [] };
    if (!Array.isArray(stateObj.quests.active)) stateObj.quests.active = [];
    if (!Array.isArray(stateObj.quests.available)) stateObj.quests.available = [];
    if (!stateObj.quickBelt) stateObj.quickBelt = [null, null, null];
    if (!stateObj.sprite) stateObj.sprite = 'Avatars/yashinzen_180342.png';
    return stateObj;
}

function generateRandomQuest(playerLevel) {
    const types = ['slay', 'explore', 'gather'];
    const questType = types[Math.floor(Math.random() * types.length)];
    const questId = 'q_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    if (questType === 'slay') {
        const yokaiKeys = Object.keys(yokaiPool);
        if (yokaiKeys.length === 0) return null;
        const randomKey = yokaiKeys[Math.floor(Math.random() * yokaiKeys.length)];
        const yokai = yokaiPool[randomKey];
        const required = Math.floor(Math.random() * 4) + 2; // 2 to 5
        const xp = Math.floor((yokai.xpReward || 30) * required * 1.5);
        const coins = Math.floor((yokai.coinReward || 10) * required * 1.5);

        return {
            id: questId,
            type: 'slay',
            title: `Bounty: ${yokai.name}`,
            desc: `Exorcise ${required} wild ${yokai.name} threatening travelers in the area.`,
            target: randomKey,
            targetName: yokai.name,
            count: 0,
            required: required,
            reward: {
                xp,
                coins
            }
        };
    } else if (questType === 'explore') {
        const areaKeys = Object.keys(areaDatabase).filter(key => {
            const area = areaDatabase[key];
            return !area.minLevel || area.minLevel <= playerLevel;
        });
        const activeAreaKeys = areaKeys.length > 0 ? areaKeys : Object.keys(areaDatabase);
        const randomKey = activeAreaKeys[Math.floor(Math.random() * activeAreaKeys.length)];
        const area = areaDatabase[randomKey] || { name: 'Faraway Land' };
        const required = Math.floor(Math.random() * 6) + 3; // 3 to 8
        const xp = required * 25;
        const coins = required * 15;

        return {
            id: questId,
            type: 'explore',
            title: `Scout: ${area.name}`,
            desc: `Investigate the ${area.name} thoroughly by exploring it ${required} times.`,
            target: randomKey,
            targetName: area.name,
            count: 0,
            required: required,
            reward: {
                xp,
                coins
            }
        };
    } else { // gather
        const materialKeys = Object.keys(itemDatabase).filter(key => {
            const item = itemDatabase[key];
            return item && item.type === 'material';
        });
        const activeMaterialKeys = materialKeys.length > 0 ? materialKeys : Object.keys(itemDatabase);
        const randomKey = activeMaterialKeys[Math.floor(Math.random() * activeMaterialKeys.length)];
        const item = itemDatabase[randomKey] || { name: 'Matcha Leaves', value: 5 };
        const required = Math.floor(Math.random() * 5) + 2; // 2 to 6
        const xp = Math.floor((item.value || 5) * required * 3.0);
        const coins = Math.floor((item.value || 5) * required * 2.0);

        return {
            id: questId,
            type: 'gather',
            title: `Deliver: ${item.name}`,
            desc: `Procure and deliver ${required}x ${item.name} for the village supply network.`,
            target: randomKey,
            targetName: item.name,
            count: 0,
            required: required,
            reward: {
                xp,
                coins
            }
        };
    }
}

function populateAvailableQuests(state) {
    if (!state.quests) {
        state.quests = { active: [], available: [] };
    }
    if (!Array.isArray(state.quests.available)) {
        state.quests.available = [];
    }
    if (!Array.isArray(state.quests.active)) {
        state.quests.active = [];
    }
    while (state.quests.available.length < 3) {
        const quest = generateRandomQuest(state.level || 1);
        if (quest) {
            state.quests.available.push(quest);
        } else {
            break;
        }
    }
}

async function forceSavePlayer(username) {
    if (activeCombats[username]) {
        if (activeCombats[username].timerId) {
            clearTimeout(activeCombats[username].timerId);
        }
        delete activeCombats[username];
    }
    if (pendingEncounters[username]) {
        delete pendingEncounters[username];
    }
    if (dirtyPlayers.has(username)) {
        const state = playerCache[username];
        if (state) {
            try {
                await new Promise((resolve, reject) => {
                    db.run("INSERT OR REPLACE INTO saves (username, state) VALUES (?, ?)", [username, JSON.stringify(state)], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                dirtyPlayers.delete(username);
            } catch (err) {
                console.error(`[Force Save Error] Failed to save ${username}:`, err);
            }
        }
    }
}

// Periodic Autosave Loop (every 30 seconds)
setInterval(async () => {
    if (dirtyPlayers.size === 0) return;
    const playersToSave = Array.from(dirtyPlayers);
    dirtyPlayers.clear();

    for (const username of playersToSave) {
        const state = playerCache[username];
        if (state) {
            try {
                const stateStr = JSON.stringify(state);
                await new Promise((resolve, reject) => {
                    db.run("INSERT OR REPLACE INTO saves (username, state) VALUES (?, ?)", [username, stateStr], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } catch (err) {
                console.error(`[Autosave Error] Failed to save player ${username}:`, err);
                dirtyPlayers.add(username); // Re-queue on failure
            }
        }
    }
}, 30000);

// API Routes
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password must be strings.' });
    }

    const trimmedUsername = username.trim();
    const trimmedPassword = password;
    if (!trimmedUsername || !trimmedPassword) {
        return res.status(400).json({ error: 'Username and password cannot be empty.' });
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        return res.status(400).json({ error: 'Username must be between 3 and 20 characters.' });
    }

    const lowerUsername = trimmedUsername.toLowerCase();
    const users = await getUsers();

    if (users[lowerUsername]) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    users[lowerUsername] = { password: hashedPassword };

    await saveUsers(users);
    await savePlayerState(lowerUsername, getInitialPlayerState());

    res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password must be strings.' });
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
        return res.status(400).json({ error: 'Username and password cannot be empty.' });
    }

    const lowerUsername = trimmedUsername.toLowerCase();
    const users = await getUsers();

    if (!users[lowerUsername]) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, users[lowerUsername].password);
    if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.username = lowerUsername;
    const isAdmin = !!(users[lowerUsername] && users[lowerUsername].isAdmin);
    res.json({ success: true, username: lowerUsername, isAdmin });
});

app.post('/api/logout', async (req, res) => {
    if (req.session.username) {
        await forceSavePlayer(req.session.username);
    }
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/check-auth', async (req, res) => {
    if (req.session.username) {
        const state = await getPlayerState(req.session.username);
        const users = await getUsers();
        const isAdmin = !!(users[req.session.username] && users[req.session.username].isAdmin);
        res.json({ authenticated: true, username: req.session.username, state, isAdmin });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/api/admin/database', requireAdmin, async (req, res) => {
    db.all("SELECT u.username, u.is_admin, s.state FROM users u LEFT JOIN saves s ON u.username = s.username", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Failed to load players database: " + err.message });
        }
        const players = {};
        rows.forEach(row => {
            let state = {};
            try {
                if (row.state) state = JSON.parse(row.state);
            } catch (e) { }
            players[row.username] = {
                isAdmin: row.is_admin === 1,
                state: state
            };
        });
        res.json({
            items: itemDatabase,
            yokai: yokaiPool,
            actions: actionDatabase,
            areas: areaDatabase,
            skills: skillsDatabase,
            players: players
        });
    });
});

async function getFilesRecursive(dir, baseDir = dir) {
    let results = [];
    try {
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const file of list) {
            const fullPath = path.join(dir, file.name);
            const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            if (file.isDirectory()) {
                const subResults = await getFilesRecursive(fullPath, baseDir);
                results = results.concat(subResults);
            } else {
                results.push(relPath);
            }
        }
    } catch (e) { }
    return results;
}

async function getAvailableSpriteFiles() {
    const dir1 = path.join(__dirname, 'public', 'sprites');
    const dir2 = path.join(__dirname, '1-bit_Pixel_Icons', 'Sprites_Cropped');
    let files1 = await getFilesRecursive(dir1);
    let files2 = await getFilesRecursive(dir2);
    return Array.from(new Set([...files1, ...files2])).sort();
}

app.get('/api/admin/sprites', requireAdmin, async (req, res) => {
    try {
        const files = await getAvailableSpriteFiles();
        const images = files.filter(file => /\.(png|gif|jpg|jpeg|webp)$/i.test(file));
        res.json({ success: true, sprites: images });
    } catch (err) {
        res.status(500).json({ error: `Failed to list sprites: ${err.message}` });
    }
});

app.get('/api/sprites', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const state = await getPlayerState(req.session.username);
        if (!state) {
            return res.json({ success: true, sprites: [] });
        }

        // Collect all item keys owned in inventory or currently equipped
        const ownedItemKeys = new Set();
        if (state.inventory) {
            for (const [itemKey, quantity] of Object.entries(state.inventory)) {
                if (quantity > 0) {
                    ownedItemKeys.add(itemKey);
                }
            }
        }
        if (state.equipment) {
            for (const itemKey of Object.values(state.equipment)) {
                if (itemKey) {
                    ownedItemKeys.add(itemKey);
                }
            }
        }

        // Gather all sprites associated with those owned items of type 'avatar'
        const ownedSprites = new Set();
        for (const itemKey of ownedItemKeys) {
            const item = itemDatabase[itemKey];
            if (item && item.type === 'avatar' && item.sprite) {
                ownedSprites.add(item.sprite);
            }
        }

        const files = await getAvailableSpriteFiles();
        // filter by owned item sprites and exclude background assets
        const sprites = files.filter(file => {
            const basename = path.basename(file);
            return ownedSprites.has(file) &&
                /\.(png|gif|jpg|jpeg|webp)$/i.test(file) &&
                !basename.startsWith('background_') &&
                basename !== 'the_end_of_the_world_104602.png';
        });
        res.json({ success: true, sprites });
    } catch (err) {
        res.status(500).json({ error: `Failed to list sprites: ${err.message}` });
    }
});

app.post('/api/admin/database/update', requireAdmin, async (req, res) => {
    const { type, data } = req.body;
    if (!['items', 'yokai', 'actions', 'areas', 'skills', 'players'].includes(type)) {
        return res.status(400).json({ error: 'Invalid database type' });
    }

    try {
        let parsedData = data;
        if (typeof data === 'string') {
            parsedData = JSON.parse(data);
        }

        // Input Sanitization: XSS & Prototype Pollution Protection
        parsedData = sanitizeObject(parsedData);

        if (type === 'players') {
            // Get all usernames in the database first to handle deletions
            const defaultHashedPassword = await bcrypt.hash("password", 10);
            db.all("SELECT username FROM users", [], async (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: "Failed to read database: " + err.message });
                }
                const existingUsernames = rows.map(r => r.username.toLowerCase());
                const submittedUsernames = new Set(Object.keys(parsedData).map(k => k.toLowerCase()));

                const deleteQueries = [];
                existingUsernames.forEach(uname => {
                    if (!submittedUsernames.has(uname)) {
                        deleteQueries.push(new Promise((resolveDel) => {
                            db.run("DELETE FROM saves WHERE username = ?", [uname], () => {
                                db.run("DELETE FROM market_listings WHERE seller = ?", [uname], () => {
                                    db.run("DELETE FROM users WHERE username = ?", [uname], () => {
                                        delete playerCache[uname];
                                        const socketIds = Object.keys(activeUsers).filter(sid => activeUsers[sid] === uname);
                                        socketIds.forEach(sid => {
                                            const s = io.sockets.sockets.get(sid);
                                            if (s) {
                                                s.emit('forceLogout', { message: "Your account has been deleted by an administrator." });
                                                s.disconnect(true);
                                            }
                                        });
                                        resolveDel();
                                    });
                                });
                            });
                        }));
                    }
                });
                await Promise.all(deleteQueries);

                const queries = [];
                for (const [uname, udata] of Object.entries(parsedData)) {
                    if (!udata || typeof udata !== 'object') continue;
                    const lowerUname = uname.toLowerCase();
                    const is_admin = udata.isAdmin ? 1 : 0;
                    const stateStr = JSON.stringify(udata.state || {});

                    queries.push(new Promise((resolveQuery, rejectQuery) => {
                        db.run("INSERT OR IGNORE INTO users (username, password, is_admin) VALUES (?, ?, ?)", [lowerUname, defaultHashedPassword, is_admin], (err) => {
                            if (err) return rejectQuery(err);
                            db.run("UPDATE users SET is_admin = ? WHERE username = ?", [is_admin, lowerUname], (errUpdate) => {
                                if (errUpdate) return rejectQuery(errUpdate);
                                db.run("INSERT OR REPLACE INTO saves (username, state) VALUES (?, ?)", [lowerUname, stateStr], (err2) => {
                                    if (err2) return rejectQuery(err2);
                                    playerCache[lowerUname] = udata.state;

                                    const activeSocketId = Object.keys(activeUsers).find(sid => activeUsers[sid] === lowerUname);
                                    if (activeSocketId) {
                                        const activeSocket = io.sockets.sockets.get(activeSocketId);
                                        if (activeSocket) {
                                            activeSocket.emit('statUpdate', udata.state);
                                        }
                                    }
                                    resolveQuery();
                                });
                            });
                        });
                    }));
                }

                try {
                    await Promise.all(queries);
                    broadcastPlayerList();
                    console.log(`[Database] ${req.session.username} successfully updated players database.`);
                    res.json({ success: true, message: `Successfully updated players database! New accounts default to password 'password'.` });
                } catch (saveErr) {
                    res.status(500).json({ error: "Failed to update players: " + saveErr.message });
                }
            });
            return;
        }

        // === SAFETY NET: Tier 3 — Schema Structural Integrity Validation ===
        let validationError = null;
        if (type === 'items') {
            validationError = validateItemsSchema(parsedData);
        } else if (type === 'yokai') {
            validationError = validateYokaiSchema(parsedData);
        } else if (type === 'actions') {
            validationError = validateActionsSchema(parsedData);
        } else if (type === 'areas') {
            validationError = validateAreasSchema(parsedData);
        } else if (type === 'skills') {
            validationError = validateSkillsSchema(parsedData);
        }

        if (validationError) {
            console.log(`[SAFETY NET] Schema validation REJECTED for ${type}: ${validationError}`);
            return res.status(400).json({
                error: `[VALIDATION FAILED] ${validationError} Save aborted — the active database remains intact.`
            });
        }

        // === SAFETY NET: Tier 2 — Automated Timestamped Backup ===
        let targetFile;
        if (type === 'items') {
            targetFile = ITEMS_FILE;
        } else if (type === 'yokai') {
            targetFile = YOKAI_FILE;
        } else if (type === 'actions') {
            targetFile = ACTIONS_FILE;
        } else if (type === 'areas') {
            targetFile = AREAS_FILE;
        } else if (type === 'skills') {
            targetFile = SKILLS_FILE;
        }

        try {
            await fs.mkdir(BACKUPS_DIR, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `${type}_backup_${timestamp}.json`;
            const backupPath = path.join(BACKUPS_DIR, backupFileName);
            await fs.copyFile(targetFile, backupPath);
            console.log(`[SAFETY NET] Backup created: ${backupFileName}`);
        } catch (backupErr) {
            console.error(`[SAFETY NET] Backup warning (non-blocking): ${backupErr.message}`);
        }

        // Apply changes to in-memory cache
        if (type === 'items') {
            itemDatabase = parsedData;
        } else if (type === 'yokai') {
            yokaiPool = parsedData;
        } else if (type === 'actions') {
            actionDatabase = parsedData;
        } else if (type === 'areas') {
            areaDatabase = parsedData;
        } else if (type === 'skills') {
            skillsDatabase = parsedData;
        }

        await fs.writeFile(targetFile, JSON.stringify(parsedData, null, 2), 'utf8');

        // Broadcast the live synced database changes to ALL connected clients!
        io.emit('gameDatabase', { items: itemDatabase, actions: actionDatabase, yokai: yokaiPool, areas: areaDatabase, skills: skillsDatabase, updatedBy: req.session.username, updatedType: type });

        console.log(`[SAFETY NET] ${req.session.username} successfully updated ${type} database.`);
        res.json({ success: true, message: `Successfully updated ${type} database! A backup was created automatically.` });
    } catch (err) {
        res.status(400).json({ error: `JSON compilation failure or write error: ${err.message}` });
    }
});

// === BACKUP STORAGE: List all available backups ===
app.get('/api/admin/database/backups', requireAdmin, async (req, res) => {
    try {
        await fs.mkdir(BACKUPS_DIR, { recursive: true });
        const files = await fs.readdir(BACKUPS_DIR);
        const backups = [];

        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const filePath = path.join(BACKUPS_DIR, file);
            const stat = await fs.stat(filePath);

            // Parse type and timestamp from filename: <type>_backup_<timestamp>.json
            const match = file.match(/^(items|yokai|actions|areas|skills)_backup_(.+)\.json$/);
            if (!match) continue;

            backups.push({
                filename: file,
                type: match[1],
                timestamp: match[2].replace(/-/g, function (m, offset) {
                    return m;
                }),
                size: stat.size,
                created: stat.mtime.toISOString()
            });
        }

        // Sort newest first
        backups.sort((a, b) => new Date(b.created) - new Date(a.created));

        res.json({ backups });
    } catch (err) {
        res.status(500).json({ error: `Failed to list backups: ${err.message}` });
    }
});

// === BACKUP STORAGE: Restore a backup ===
app.post('/api/admin/database/restore', requireAdmin, async (req, res) => {
    const { filename } = req.body;
    if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Missing backup filename.' });
    }

    // Security: prevent path traversal
    const safeFilename = path.basename(filename);
    const backupPath = path.join(BACKUPS_DIR, safeFilename);

    // Validate filename format
    const match = safeFilename.match(/^(items|yokai|actions|areas|skills)_backup_.+\.json$/);
    if (!match) {
        return res.status(400).json({ error: 'Invalid backup filename format.' });
    }

    const type = match[1];

    try {
        const rawData = await fs.readFile(backupPath, 'utf8');
        let parsedData = JSON.parse(rawData);

        // Input Sanitization: XSS & Prototype Pollution Protection
        parsedData = sanitizeObject(parsedData);

        // Validate the backup data before restoring
        let validationError = null;
        if (type === 'items') {
            validationError = validateItemsSchema(parsedData);
        } else if (type === 'yokai') {
            validationError = validateYokaiSchema(parsedData);
        } else if (type === 'actions') {
            validationError = validateActionsSchema(parsedData);
        } else if (type === 'areas') {
            validationError = validateAreasSchema(parsedData);
        } else if (type === 'skills') {
            validationError = validateSkillsSchema(parsedData);
        }

        if (validationError) {
            return res.status(400).json({
                error: `[RESTORE BLOCKED] Backup file failed schema validation: ${validationError}`
            });
        }

        // Create a pre-restore backup of the CURRENT state before overwriting
        let targetFile;
        if (type === 'items') {
            targetFile = ITEMS_FILE;
        } else if (type === 'yokai') {
            targetFile = YOKAI_FILE;
        } else if (type === 'actions') {
            targetFile = ACTIONS_FILE;
        } else if (type === 'areas') {
            targetFile = AREAS_FILE;
        } else if (type === 'skills') {
            targetFile = SKILLS_FILE;
        }

        try {
            const preRestoreTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const preRestoreBackupName = `${type}_backup_${preRestoreTimestamp}.json`;
            await fs.copyFile(targetFile, path.join(BACKUPS_DIR, preRestoreBackupName));
            console.log(`[BACKUP RESTORE] Pre-restore backup created: ${preRestoreBackupName}`);
        } catch (preErr) {
            console.error(`[BACKUP RESTORE] Pre-restore backup warning: ${preErr.message}`);
        }

        // Apply the restore
        if (type === 'items') {
            itemDatabase = parsedData;
        } else if (type === 'yokai') {
            yokaiPool = parsedData;
        } else if (type === 'actions') {
            actionDatabase = parsedData;
        } else if (type === 'areas') {
            areaDatabase = parsedData;
        } else if (type === 'skills') {
            skillsDatabase = parsedData;
        }

        await fs.writeFile(targetFile, JSON.stringify(parsedData, null, 2), 'utf8');

        // Broadcast changes to all clients
        io.emit('gameDatabase', { items: itemDatabase, actions: actionDatabase, yokai: yokaiPool, areas: areaDatabase, skills: skillsDatabase, updatedBy: req.session.username, updatedType: type });

        console.log(`[BACKUP RESTORE] ${req.session.username} restored ${type} from backup: ${safeFilename}`);
        res.json({ success: true, message: `Successfully restored ${type} database from backup!`, type });
    } catch (err) {
        res.status(400).json({ error: `Restore failed: ${err.message}` });
    }
});

// === BACKUP STORAGE: Delete a backup ===
app.delete('/api/admin/database/backups/:filename', requireAdmin, async (req, res) => {
    const safeFilename = path.basename(req.params.filename);
    const match = safeFilename.match(/^(items|yokai|actions|areas|skills)_backup_.+\.json$/);
    if (!match) {
        return res.status(400).json({ error: 'Invalid backup filename.' });
    }

    try {
        await fs.unlink(path.join(BACKUPS_DIR, safeFilename));
        console.log(`[BACKUP] ${req.session.username} deleted backup: ${safeFilename}`);
        res.json({ success: true, message: `Backup "${safeFilename}" deleted.` });
    } catch (err) {
        res.status(400).json({ error: `Delete failed: ${err.message}` });
    }
});

// Multiplayer / Gameplay Logic
const activeUsers = {};
const activeCombats = {};
const pendingEncounters = {};
const activeExplores = {}; // Map of username -> { timerId, startTime, duration }
const lastExploreTime = {};
const lastChatTime = {};


// Build a rich player info payload for the Players tab
function buildPlayerListPayload() {
    const seen = new Set();
    const payload = [];
    for (const username of Object.values(activeUsers)) {
        if (seen.has(username)) continue;
        seen.add(username);
        const state = playerCache[username];
        let status = 'Standby';
        if (activeExplores[username]) status = 'Exploring';
        else if (activeCombats[username]) status = 'In Combat';
        else if (pendingEncounters[username]) status = 'Encounter!';
        const equipment = {};
        if (state && state.equipment) {
            for (const [slot, itemKey] of Object.entries(state.equipment)) {
                if (itemKey && itemDatabase[itemKey]) {
                    equipment[slot] = {
                        name: itemDatabase[itemKey].name,
                        rarity: itemDatabase[itemKey].rarity || 'common'
                    };
                }
            }
        }
        payload.push({
            username,
            level: state ? (state.level || 1) : 1,
            hp: state ? (state.stats?.health || 0) : 0,
            maxHp: state ? (state.stats?.maxHealth || 50) : 50,
            stamina: state ? (state.stamina || 0) : 0,
            maxStamina: state ? (state.maxStamina || 100) : 100,
            attack: state ? getActiveAttack(state) : 5,
            defense: state ? getActiveDefense(state) : 5,
            coins: state ? (state.coins || 0) : 0,
            status,
            equipment,
            sprite: (() => {
                let s = state ? (state.sprite || null) : null;
                if (!s && state && state.equipment && state.equipment.avatar) {
                    const avatarItem = itemDatabase[state.equipment.avatar];
                    if (avatarItem && avatarItem.sprite) {
                        s = avatarItem.sprite;
                    }
                }
                return s;
            })(),
            lobbyCode: playerPartyMap[username] || null
        });
    }
    return payload;
}

function broadcastPlayerList() {
    io.emit('update-player-list', buildPlayerListPayload());
}


async function handleCombatVictory(username, socket, combat, state) {
    if (combat.timerId) {
        clearTimeout(combat.timerId);
    }

    const xpGain = combat.yokai.xpReward;
    const coinsGain = combat.yokai.coinReward;

    state.experience += xpGain;
    state.coins += coinsGain;

    // Award loot drops
    if (!state.inventory) state.inventory = {};
    let lootMessage = "";

    const yokaiKey = combat.yokai.key;

    // Slay Quest progress tracking
    if (state.quests && Array.isArray(state.quests.active)) {
        state.quests.active.forEach(quest => {
            if (quest.type === 'slay' && quest.target === yokaiKey) {
                if (quest.count < quest.required) {
                    quest.count++;
                }
            }
        });
    }

    const yokaiDbEntry = yokaiPool[yokaiKey];
    const guaranteedItems = yokaiDbEntry?.loot?.pool || (yokaiDbEntry?.loot?.guaranteed ? [yokaiDbEntry.loot.guaranteed] : []);

    for (const itemKey of guaranteedItems) {
        if (itemDatabase[itemKey]) {
            state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;
            lootMessage += ` Spoils: Obtained 1x ${itemDatabase[itemKey].name}.`;
        }
    }

    if (yokaiDbEntry?.loot?.drops && Array.isArray(yokaiDbEntry.loot.drops)) {
        for (const drop of yokaiDbEntry.loot.drops) {
            if (Math.random() < drop.chance && drop.pool && drop.pool.length > 0) {
                const itemKey = drop.pool[Math.floor(Math.random() * drop.pool.length)];
                if (itemDatabase[itemKey]) {
                    state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;
                    lootMessage += ` Rare Drop: Found 1x ${itemDatabase[itemKey].name}!`;
                }
            }
        }
    }

    // Rare bonus drop (read bonusChance and loot pool dynamically)
    const combConfig = actionDatabase.combat || { bonusLootChance: 0.35, bonusLootPool: ["healing_herbs", "energy_tea", "rice_bowl"] };
    const bonusChance = yokaiDbEntry?.loot?.bonusChance !== undefined ? yokaiDbEntry.loot.bonusChance : combConfig.bonusLootChance;
    if (Math.random() < bonusChance) {
        const bonusConsumables = combConfig.bonusLootPool;
        const bonusItem = bonusConsumables[Math.floor(Math.random() * bonusConsumables.length)];
        if (itemDatabase[bonusItem]) {
            state.inventory[bonusItem] = (state.inventory[bonusItem] || 0) + 1;
            lootMessage += ` Bonus: Found 1x ${itemDatabase[bonusItem].name}!`;
        }
    }

    let leveledUp = false;
    const lvlConfig = actionDatabase.leveling || { xpMultiplier: 1.5, maxHealthIncrease: 10, attackIncrease: 2, defenseIncrease: 2 };
    while (state.experience >= state.experienceNeeded) {
        state.experience -= state.experienceNeeded;
        state.level++;
        state.experienceNeeded = Math.floor(state.experienceNeeded * lvlConfig.xpMultiplier);
        state.stats.maxHealth = (state.stats.maxHealth || 50) + lvlConfig.maxHealthIncrease;
        state.stats.health = state.stats.maxHealth;
        state.stats.attack += lvlConfig.attackIncrease;
        state.stats.defense += lvlConfig.defenseIncrease;
        leveledUp = true;
    }

    delete activeCombats[username];
    await savePlayerState(username, state);
    broadcastPlayerList();

    socket.emit('combatEnd', {
        success: true,
        message: `[VICTORY] You defeated the wild ${combat.yokai.name}! Gained ${xpGain} XP and ${coinsGain} coins.${lootMessage}`,
        state,
        leveledUp
    });
}

function randomizeSpeed(baseSpeed) {
    const variance = 0.25; // ±25% variation
    const min = baseSpeed * (1 - variance);
    const max = baseSpeed * (1 + variance);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const EQUIPPABLE_TYPES = ["weapon", "armor", "helmet", "shield", "accessory", "avatar"];

function getActiveAttack(state) {
    let atk = state.stats.attack || 5;
    if (state.equipment) {
        for (const slot of EQUIPPABLE_TYPES) {
            const itemKey = state.equipment[slot];
            if (itemKey) {
                const item = itemDatabase[itemKey];
                if (item && item.effects && typeof item.effects.attackBonus === 'number') {
                    atk += item.effects.attackBonus;
                }
            }
        }
    }
    return atk;
}

function getActiveDefense(state) {
    let def = state.stats.defense || 5;
    if (state.equipment) {
        for (const slot of EQUIPPABLE_TYPES) {
            const itemKey = state.equipment[slot];
            if (itemKey) {
                const item = itemDatabase[itemKey];
                if (item && item.effects && typeof item.effects.defenseBonus === 'number') {
                    def += item.effects.defenseBonus;
                }
            }
        }
    }
    return def;
}

function getActiveCritChance(state) {
    let chance = 0.05; // 5% base crit
    if (state.equipment) {
        for (const slot of EQUIPPABLE_TYPES) {
            const itemKey = state.equipment[slot];
            if (itemKey) {
                const item = itemDatabase[itemKey];
                if (item && item.effects && typeof item.effects.critChance === 'number') {
                    chance += item.effects.critChance / 100;
                }
            }
        }
    }
    return Math.min(0.50, chance); // Cap Crit Chance at 50%
}

function getActiveLifesteal(state) {
    let lifesteal = 0;
    if (state.equipment) {
        for (const slot of EQUIPPABLE_TYPES) {
            const itemKey = state.equipment[slot];
            if (itemKey) {
                const item = itemDatabase[itemKey];
                if (item && item.effects && typeof item.effects.lifesteal === 'number') {
                    lifesteal += item.effects.lifesteal / 100;
                }
            }
        }
    }
    return Math.min(0.25, lifesteal); // Cap Lifesteal at 25%
}

function getActivePoisonChance(state) {
    let chance = 0;
    if (state.equipment) {
        for (const slot of EQUIPPABLE_TYPES) {
            const itemKey = state.equipment[slot];
            if (itemKey) {
                const item = itemDatabase[itemKey];
                if (item && item.effects && typeof item.effects.poisonChance === 'number') {
                    chance += item.effects.poisonChance / 100;
                }
            }
        }
    }
    return Math.min(0.40, chance); // Cap Poison Chance at 40%
}

function getActiveBurnChance(state) {
    let chance = 0;
    if (state.equipment) {
        for (const slot of EQUIPPABLE_TYPES) {
            const itemKey = state.equipment[slot];
            if (itemKey) {
                const item = itemDatabase[itemKey];
                if (item && item.effects && typeof item.effects.burnChance === 'number') {
                    chance += item.effects.burnChance / 100;
                }
            }
        }
    }
    return Math.min(0.40, chance); // Cap Burn Chance at 40%
}

function startMonsterAttackLoop(username, socket) {
    const combat = activeCombats[username];
    if (!combat) return;

    if (combat.timerId) {
        clearTimeout(combat.timerId);
    }

    async function triggerAttack() {
        const liveCombat = activeCombats[username];
        if (!liveCombat) return;

        const state = await getPlayerState(username);
        if (!state) {
            delete activeCombats[username];
            return;
        }

        // Apply DOT damage (poison, burn) if active
        let dotDamage = 0;
        let dotType = null;
        if (liveCombat.yokai.poisoned && liveCombat.yokai.poisonTicks > 0) {
            dotDamage = 5; // 5 damage per tick
            liveCombat.yokai.poisonTicks--;
            if (liveCombat.yokai.poisonTicks <= 0) liveCombat.yokai.poisoned = false;
            dotType = 'poison';
        } else if (liveCombat.yokai.burned && liveCombat.yokai.burnTicks > 0) {
            dotDamage = 8; // 8 damage per tick
            liveCombat.yokai.burnTicks--;
            if (liveCombat.yokai.burnTicks <= 0) liveCombat.yokai.burned = false;
            dotType = 'burn';
        }

        if (dotDamage > 0) {
            liveCombat.yokai.hp = Math.max(0, liveCombat.yokai.hp - dotDamage);
            socket.emit('combatFeedback', {
                message: `* The Yokai takes ${dotDamage} ${dotType} damage!`,
                yokaiHp: liveCombat.yokai.hp
            });

            if (liveCombat.yokai.hp <= 0) {
                await savePlayerState(username, state);
                await handleCombatVictory(username, socket, liveCombat, state);
                return;
            }
        }

        let damage = liveCombat.yokai.attack;
        let eventType = "hit";
        let counterDamage = 0;

        const combConfig = actionDatabase.combat || { defenseMitigationFactor: 2.0 };
        const defFactor = combConfig.defenseMitigationFactor || 2.0;
        const activeDef = getActiveDefense(state);
        const defBonus = Math.floor(activeDef / defFactor);
        const normalDamage = Math.max(1, damage - defBonus);

        const parryConfig = actionDatabase.parry;

        if (liveCombat.lastParryTime) {
            const msSinceParry = Date.now() - liveCombat.lastParryTime;

            if (msSinceParry <= parryConfig.perfectWindow) {
                // Perfect Parry: Block & counter-attack!
                damage = Math.max(1, Math.floor(normalDamage * parryConfig.perfectMitigation));
                eventType = "perfect_parry";

                const playerAtk = getActiveAttack(state);
                const counterMin = parryConfig.counterMinDamage !== undefined ? parryConfig.counterMinDamage : 3;
                counterDamage = Math.max(counterMin, Math.floor(playerAtk * parryConfig.counterMultiplier));
                liveCombat.yokai.hp = Math.max(0, liveCombat.yokai.hp - counterDamage);
            } else if (msSinceParry <= parryConfig.earlyWindow) {
                // Early Parry: Block partial
                damage = Math.max(1, Math.floor(normalDamage * parryConfig.earlyMitigation));
                eventType = "early_parry";
            } else {
                // Whiffed Parry (Expired): Staggered hit
                const missMin = parryConfig.missMinDamage !== undefined ? parryConfig.missMinDamage : 2;
                damage = Math.max(missMin, Math.floor(normalDamage * parryConfig.missMultiplier));
                eventType = "staggered_hit";
            }

            delete liveCombat.lastParryTime;
        } else {
            damage = normalDamage;
            eventType = "hit";
        }

        state.stats.health = Math.max(0, state.stats.health - damage);

        if (state.stats.health <= 0) {
            delete activeCombats[username];

            const defConfig = actionDatabase.combatDefeat || { minCoinsLost: 5, maxCoinsLost: 15, healthRestore: 10, staminaRestorePercent: 0.2 };
            const range = defConfig.maxCoinsLost - defConfig.minCoinsLost + 1;
            const coinsLost = Math.min(state.coins, Math.floor(Math.random() * range) + defConfig.minCoinsLost);

            state.coins -= coinsLost;
            state.stats.health = defConfig.healthRestore;
            state.stamina = Math.floor(state.maxStamina * defConfig.staminaRestorePercent);

            await savePlayerState(username, state);
            broadcastPlayerList();

            socket.emit('combatEnd', {
                success: false,
                message: `[DEFEAT] The wild ${liveCombat.yokai.name} knocked you unconscious! You lost ${coinsLost} coins and were brought to the village inn to recover.`,
                state
            });
        } else if (liveCombat.yokai.hp <= 0) {
            // Defeated by Parry counter-attack!
            await savePlayerState(username, state);
            socket.emit('combatMonsterAttack', {
                damage,
                eventType,
                counterDamage,
                yokaiHp: liveCombat.yokai.hp,
                nextSpeed: 0,
                state
            });
            await handleCombatVictory(username, socket, liveCombat, state);
        } else {
            await savePlayerState(username, state);

            // Randomize the next attack speed!
            const nextSpeed = randomizeSpeed(liveCombat.yokai.speed);
            socket.emit('combatMonsterAttack', {
                damage,
                eventType,
                counterDamage,
                yokaiHp: liveCombat.yokai.hp,
                nextSpeed,
                state
            });

            // Schedule the next attack!
            liveCombat.timerId = setTimeout(triggerAttack, nextSpeed);
        }
    }

    // Schedule the first attack!
    const firstSpeed = randomizeSpeed(combat.yokai.speed);
    combat.firstAttackSpeed = firstSpeed;
    combat.timerId = setTimeout(triggerAttack, firstSpeed);
}

function startPassiveRegenLoop() {
    const regenConfig = actionDatabase.passiveRegen || { interval: 5000, staminaAmount: 2 };
    setInterval(() => {
        const onlinePlayers = Array.from(new Set(Object.values(activeUsers)));
        for (const username of onlinePlayers) {
            const state = playerCache[username];
            if (state) {
                const maxStam = state.maxStamina || 100;
                if (state.stamina < maxStam) {
                    state.stamina = Math.min(maxStam, state.stamina + regenConfig.staminaAmount);
                    dirtyPlayers.add(username);
                    // Broadcast updated stats to all sockets of this player
                    for (const [sid, name] of Object.entries(activeUsers)) {
                        if (name === username) {
                            io.to(sid).emit('statUpdate', state);
                        }
                    }
                }
            }
        }
    }, regenConfig.interval);

    // Slower periodic broadcast (every 30 seconds) to sync passive changes globally
    setInterval(() => {
        const onlinePlayers = Array.from(new Set(Object.values(activeUsers)));
        if (onlinePlayers.length > 0) {
            broadcastPlayerList();
        }
    }, 30000);
}

async function handleExplorationComplete(username, socket) {
    const exploreRecord = activeExplores[username];
    if (!exploreRecord) return;

    // Clean up active exploration status first
    delete activeExplores[username];

    const state = await getPlayerState(username);
    if (!state) return;

    const expConfig = actionDatabase.explore;
    const areaKeys = Object.keys(areaDatabase);
    const fallbackAreaKey = areaKeys[0] || 'bamboo_grove';
    const areaKey = state.currentArea || fallbackAreaKey;
    const defaultArea = areaDatabase[fallbackAreaKey] || { name: 'Bamboo Grove', desc: 'A tranquil path lined with rustling bamboo stalks.' };
    const area = areaDatabase[areaKey] || {
        name: defaultArea.name,
        desc: defaultArea.desc,
        minLevel: 1,
        encounterChance: expConfig.encounterChance || 0.35,
        forageChance: expConfig.forageChance || 0.4,
        yokaiPool: Object.keys(yokaiPool),
        lootPool: Object.keys(itemDatabase),
        difficultyMultiplier: 1.0
    };

    // Draw from random event
    const legendaryChance = expConfig.legendaryEncounterChance !== undefined ? expConfig.legendaryEncounterChance : 0.03;
    const rand = Math.random();
    let gainedXP = 0;
    let gainedCoins = 0;
    let healthGain = 0;
    let staminaGain = 0;
    let eventMessage = "";
    let leveledUp = false;

    if (Math.random() < legendaryChance) {
        // Trigger Rare Legendary Encounter Event!
        const events = expConfig.legendaryEvents || {
            "sword_master": {
                "name": "Wandering Sword Master",
                "xpReward": 50,
                "weaponChance": 0.50,
                "weaponPool": ["wooden_sword", "steel_sword"]
            },
            "legendary_shrine": {
                "name": "Ancient Shinto Shrine",
                "xpReward": 100,
                "minCoins": 25,
                "maxCoins": 50,
                "consumablePool": ["healing_herbs", "energy_tea", "rice_bowl", "golden_elixir"]
            }
        };

        const eventKeys = Object.keys(events);
        const rolledEvent = eventKeys[Math.floor(Math.random() * eventKeys.length)];

        if (rolledEvent === 'sword_master') {
            const config = events.sword_master;
            state.stamina = state.maxStamina || 100;
            gainedXP = config.xpReward || 50;
            state.experience += gainedXP;

            let lootMessage = "";
            if (Math.random() < (config.weaponChance !== undefined ? config.weaponChance : 0.50)) {
                const pool = config.weaponPool || ["wooden_sword", "steel_sword"];
                const weaponKey = pool[Math.floor(Math.random() * pool.length)];
                if (!state.inventory) state.inventory = {};
                state.inventory[weaponKey] = (state.inventory[weaponKey] || 0) + 1;
                const weaponItem = itemDatabase[weaponKey] || { name: "Bokken" };
                const weaponRarity = (weaponItem.rarity || "common").toUpperCase();
                lootMessage = ` In appreciation, he bequeaths a premium [${weaponRarity}] ${weaponItem.name}!`;
            }

            eventMessage = `[LEGENDARY] You encountered a Wandering Sword Master in a quiet bamboo clearing. He patiently coaches your technique, restoring all Stamina (+${gainedXP} XP).${lootMessage}`;
        } else {
            // Ancient Shinto Shrine
            const config = events.legendary_shrine;
            state.stats.health = state.stats.maxHealth || 50;
            state.stamina = state.maxStamina || 100;
            gainedXP = config.xpReward || 100;
            state.experience += gainedXP;

            const coinMin = config.minCoins !== undefined ? config.minCoins : 25;
            const coinMax = config.maxCoins !== undefined ? config.maxCoins : 50;
            gainedCoins = Math.floor(Math.random() * (coinMax - coinMin + 1)) + coinMin;
            state.coins += gainedCoins;

            const pool = config.consumablePool || ["healing_herbs", "energy_tea", "rice_bowl", "golden_elixir"];
            const itemKey = pool[Math.floor(Math.random() * pool.length)];
            if (!state.inventory) state.inventory = {};
            state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;

            const droppedItem = itemDatabase[itemKey] || { name: "Healing Herbs" };
            const droppedRarity = (droppedItem.rarity || "common").toUpperCase();

            eventMessage = `[LEGENDARY] You discovered a hidden, glowing Ancient Shinto Shrine covered in sacred runes. Whispering spirits fully restore your Health & Stamina (+${gainedXP} XP, +${gainedCoins} coins) and award a [${droppedRarity}] ${droppedItem.name}!`;
        }
    } else {
        // Standard explore events
        const yokaiChance = area.encounterChance !== undefined ? area.encounterChance : expConfig.encounterChance;
        const forageChance = area.forageChance !== undefined ? area.forageChance : expConfig.forageChance;

        const yokaiThreshold = yokaiChance;
        const forageThreshold = yokaiThreshold + forageChance;
        const shrineThreshold = forageThreshold + (expConfig.shrineChance || 0.15);

        if (rand < yokaiThreshold) {
            // Encounter Yokai (Combat) - Open Confirmation Screen first!
            let yokaiKeys = area.yokaiPool || Object.keys(yokaiPool);
            if (!Array.isArray(yokaiKeys) || yokaiKeys.length === 0) {
                yokaiKeys = Object.keys(yokaiPool);
            }
            const key = yokaiKeys[Math.floor(Math.random() * yokaiKeys.length)];
            const template = yokaiPool[key] || yokaiPool[Object.keys(yokaiPool)[0]];

            pendingEncounters[username] = key;

            await savePlayerState(username, state);
            broadcastPlayerList();

            socket.emit('combatEncounter', {
                yokai: {
                    name: template.name,
                    sprite: template.sprite,
                    speed: template.speed,
                    hp: template.hp
                },
                state
            });
            return;
        } else if (rand < forageThreshold) {
            // Foraging (Resource discovery)
            const xpRange = expConfig.forageXpMax - expConfig.forageXpMin + 1;
            gainedXP = Math.floor(Math.random() * xpRange) + expConfig.forageXpMin;

            const coinsRange = expConfig.forageCoinsMax - expConfig.forageCoinsMin + 1;
            gainedCoins = Math.floor(Math.random() * coinsRange) + expConfig.forageCoinsMin;

            state.experience += gainedXP;
            state.coins += gainedCoins;

            // Roll item rarity dynamically based on weights
            const rarSettings = actionDatabase.raritySettings || { weights: { common: 0.7, uncommon: 0.2, rare: 0.08, epic: 0.02 } };
            const rRoll = Math.random();
            let rolledRarity = "common";
            let cumulative = 0;
            for (const [tier, weight] of Object.entries(rarSettings.weights)) {
                cumulative += weight;
                if (rRoll < cumulative) {
                    rolledRarity = tier;
                    break;
                }
            }

            // Find all items in the area lootPool matching this rarity
            const areaLoot = area.lootPool || Object.keys(itemDatabase);
            let itemsInTier = areaLoot.filter(k => itemDatabase[k] && (itemDatabase[k].rarity || "common") === rolledRarity);

            if (itemsInTier.length === 0) {
                itemsInTier = areaLoot.filter(k => itemDatabase[k]);
            }
            if (itemsInTier.length === 0) {
                itemsInTier = Object.keys(itemDatabase).filter(k => (itemDatabase[k].rarity || "common") === rolledRarity);
            }
            if (itemsInTier.length === 0) {
                itemsInTier = Object.keys(itemDatabase).filter(k => (itemDatabase[k].rarity || "common") === "common");
            }
            const itemKey = itemsInTier[Math.floor(Math.random() * itemsInTier.length)];

            if (!state.inventory) state.inventory = {};
            state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;

            const itemDetails = itemDatabase[itemKey];
            const rarityBadge = `[${rolledRarity.toUpperCase()}]`;
            eventMessage = `[FORAGE] You foraged in the ${area.name} and harvested ${rarityBadge} ${itemDetails.name}. (+${gainedXP} XP, +${gainedCoins} coins)`;
        } else if (rand < shrineThreshold) {
            // Shrine of Inari (Restoration)
            const staminaRange = expConfig.shrineStaminaMax - expConfig.shrineStaminaMin + 1;
            staminaGain = Math.floor(Math.random() * staminaRange) + expConfig.shrineStaminaMin;
            gainedXP = expConfig.shrineXpReward;

            state.stamina = Math.min(state.maxStamina || 100, state.stamina + staminaGain);
            state.experience += gainedXP;
            eventMessage = `[SHRINE] You offered prayers at a stone Shrine of Inari. A peaceful energy restores your spirit. (+${staminaGain} Stamina, +${gainedXP} XP)`;
        } else {
            // Hot Spring (Healing)
            const healthRange = expConfig.springHealthMax - expConfig.springHealthMin + 1;
            healthGain = Math.floor(Math.random() * healthRange) + expConfig.springHealthMin;

            const maxHP = state.stats.maxHealth || 50;
            state.stats.health = Math.min(maxHP, state.stats.health + healthGain);
            eventMessage = `[HEAL] You found a hidden hot spring. The soothing hot waters restore your health! (+${healthGain} Health)`;
        }
    }

    // Level up checks
    const lvlConfig = actionDatabase.leveling || { xpMultiplier: 1.5, maxHealthIncrease: 10, attackIncrease: 2, defenseIncrease: 2 };
    while (state.experience >= state.experienceNeeded) {
        state.experience -= state.experienceNeeded;
        state.level++;
        state.experienceNeeded = getXpNeededForLevel(state.level);
        state.stats.maxHealth = (state.stats.maxHealth || 50) + lvlConfig.maxHealthIncrease;
        state.stats.health = state.stats.maxHealth; // Full heal
        state.stats.attack += lvlConfig.attackIncrease;
        state.stats.defense += lvlConfig.defenseIncrease;
        leveledUp = true;
    }

    await savePlayerState(username, state);
    broadcastPlayerList();

    socket.emit('exploreResult', {
        success: true,
        message: eventMessage,
        state,
        leveledUp
    });
}

async function handleScavengeComplete(username, socket) {
    const exploreRecord = activeExplores[username];
    if (!exploreRecord) return;
    delete activeExplores[username];

    const state = await getPlayerState(username);
    if (!state) return;

    const scavConfig = actionDatabase.scavenge || { successChance: 0.70, xpMin: 15, xpMax: 30, coinsMin: 5, coinsMax: 20, lootPool: [] };
    const areaKey = state.currentArea || Object.keys(areaDatabase)[0] || 'bamboo_grove';
    const area = areaDatabase[areaKey] || {};

    let eventMessage = "";
    let leveledUp = false;

    if (Math.random() < (scavConfig.successChance !== undefined ? scavConfig.successChance : 0.70)) {
        const xpRange = (scavConfig.xpMax || 30) - (scavConfig.xpMin || 15) + 1;
        const gainedXP = Math.floor(Math.random() * xpRange) + (scavConfig.xpMin || 15);

        const coinsRange = (scavConfig.coinsMax || 20) - (scavConfig.coinsMin || 5) + 1;
        const gainedCoins = Math.floor(Math.random() * coinsRange) + (scavConfig.coinsMin || 5);

        state.experience += gainedXP;
        state.coins += gainedCoins;

        let lootMessage = "";
        const activeLootPool = (area.scavengeLootPool && area.scavengeLootPool.length > 0) ? area.scavengeLootPool : (scavConfig.lootPool || []);

        if (activeLootPool && activeLootPool.length > 0) {
            const itemKey = activeLootPool[Math.floor(Math.random() * activeLootPool.length)];
            if (!state.inventory) state.inventory = {};
            state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;

            const itemDetails = itemDatabase[itemKey] || { name: itemKey, rarity: 'common' };
            const rarityBadge = `[${(itemDetails.rarity || 'common').toUpperCase()}]`;
            lootMessage = ` Found ${rarityBadge} ${itemDetails.name}!`;
        }

        eventMessage = `[SCAVENGE] You scavenged the area and recovered supplies. (+${gainedXP} XP, +${gainedCoins} coins)${lootMessage}`;
    } else {
        eventMessage = `[SCAVENGE] You searched the area but found nothing of value.`;
    }

    const lvlConfig = actionDatabase.leveling || { xpMultiplier: 1.5, maxHealthIncrease: 10, attackIncrease: 2, defenseIncrease: 2 };
    while (state.experience >= state.experienceNeeded) {
        state.experience -= state.experienceNeeded;
        state.level++;
        state.experienceNeeded = getXpNeededForLevel(state.level);
        state.stats.maxHealth = (state.stats.maxHealth || 50) + lvlConfig.maxHealthIncrease;
        state.stats.health = state.stats.maxHealth;
        state.stats.attack += lvlConfig.attackIncrease;
        state.stats.defense += lvlConfig.defenseIncrease;
        leveledUp = true;
    }

    await savePlayerState(username, state);
    broadcastPlayerList();

    socket.emit('exploreResult', {
        success: true,
        message: eventMessage,
        state,
        leveledUp
    });
}

async function broadcastPartyCombatUpdate(lobbyCode) {
    const party = activeParties[lobbyCode];
    if (!party) return;

    const combat = party.combatInstance;
    const memberStatuses = [];
    for (const member of party.members) {
        if (activeCombats[member] === combat) {
            const state = await getPlayerState(member);
            if (state) {
                memberStatuses.push({
                    username: member,
                    health: state.stats.health,
                    maxHealth: state.stats.maxHealth,
                    stamina: state.stamina,
                    maxStamina: state.maxStamina
                });
            }
        }
    }
    io.to(`party_${lobbyCode}`).emit('partyCombatUpdate', {
        members: memberStatuses
    });
}

async function handleBossVictory(lobbyCode) {
    const party = activeParties[lobbyCode];
    if (!party) return;

    const combat = party.combatInstance;
    if (combat && combat.timerId) {
        clearTimeout(combat.timerId);
    }

    const bossKey = (combat && combat.yokai && combat.yokai.key) || Object.keys(yokaiPool)[0] || 'dragon_lord';
    const bossTemplate = yokaiPool[bossKey] || { xpReward: 300, coinReward: 100 };
    const baseXP = bossTemplate.xpReward || 300;
    const baseCoins = bossTemplate.coinReward || 100;

    for (const member of party.members) {
        if (activeCombats[member] === combat) {
            const state = await getPlayerState(member);
            if (state) {
                state.experience += baseXP;
                state.coins += baseCoins;

                let lootEarned = [];
                if (bossTemplate.loot) {
                    const guaranteedItems = bossTemplate.loot.pool || (bossTemplate.loot.guaranteed ? [bossTemplate.loot.guaranteed] : []);
                    for (const itemKey of guaranteedItems) {
                        if (itemDatabase[itemKey]) {
                            state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;
                            lootEarned.push(itemDatabase[itemKey].name);
                        }
                    }

                    if (bossTemplate.loot.drops && Array.isArray(bossTemplate.loot.drops)) {
                        for (const drop of bossTemplate.loot.drops) {
                            if (Math.random() < drop.chance && drop.pool && drop.pool.length > 0) {
                                const itemKey = drop.pool[Math.floor(Math.random() * drop.pool.length)];
                                if (itemDatabase[itemKey]) {
                                    state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;
                                    lootEarned.push(`${itemDatabase[itemKey].name} (Rare)`);
                                }
                            }
                        }
                    }

                    if (Math.random() < bossTemplate.loot.bonusChance) {
                        const firstItem = guaranteedItems.length > 0 ? guaranteedItems[0] : null;
                        if (firstItem && itemDatabase[firstItem]) {
                            state.inventory[firstItem] = (state.inventory[firstItem] || 0) + 1;
                            lootEarned.push(`${itemDatabase[firstItem].name} (Bonus)`);
                        }
                    }
                }

                let leveledUp = false;
                const lvlConfig = actionDatabase.leveling || { xpMultiplier: 1.5, maxHealthIncrease: 10, attackIncrease: 2, defenseIncrease: 2 };
                while (state.experience >= state.experienceNeeded) {
                    state.experience -= state.experienceNeeded;
                    state.level++;
                    state.experienceNeeded = Math.floor(state.experienceNeeded * lvlConfig.xpMultiplier);
                    state.stats.maxHealth = (state.stats.maxHealth || 50) + lvlConfig.maxHealthIncrease;
                    state.stats.health = state.stats.maxHealth;
                    state.stats.attack += lvlConfig.attackIncrease;
                    state.stats.defense += lvlConfig.defenseIncrease;
                    leveledUp = true;
                }

                await savePlayerState(member, state);

                let lootMsg = lootEarned.length > 0 ? ` Received drops: ${lootEarned.join(', ')}.` : '';
                const bossName = (combat && combat.yokai && combat.yokai.name) || 'the boss';
                const winMsg = `[VICTORY] You and your party defeated ${bossName}! Gained ${baseXP} XP and ${baseCoins} coins.${lootMsg}`;

                for (const [sid, name] of Object.entries(activeUsers)) {
                    if (name === member) {
                        io.to(sid).emit('combatEnd', {
                            success: true,
                            message: winMsg,
                            state
                        });
                        io.to(sid).emit('chatMessage', { user: 'System', message: winMsg });
                    }
                }
            }
        }
        delete activeCombats[member];
    }

    party.state = 'lobby';
    party.combatInstance = null;
    broadcastPartyUpdate(lobbyCode);
    broadcastPlayerList();
}

async function handleBossDefeat(lobbyCode) {
    const party = activeParties[lobbyCode];
    if (!party) return;

    const combat = party.combatInstance;
    if (combat && combat.timerId) {
        clearTimeout(combat.timerId);
    }

    const defConfig = actionDatabase.combatDefeat || { minCoinsLost: 5, maxCoinsLost: 15, healthRestore: 10, staminaRestorePercent: 0.2 };

    for (const member of party.members) {
        if (activeCombats[member] === combat) {
            const state = await getPlayerState(member);
            if (state) {
                const range = defConfig.maxCoinsLost - defConfig.minCoinsLost + 1;
                const coinsLost = Math.min(state.coins, Math.floor(Math.random() * range) + defConfig.minCoinsLost);

                state.coins -= coinsLost;
                state.stats.health = defConfig.healthRestore;
                state.stamina = Math.floor(state.maxStamina * defConfig.staminaRestorePercent);
                const areaKeys = Object.keys(areaDatabase);
                const fallbackAreaKey = areaKeys[0] || 'bamboo_grove';
                state.currentArea = fallbackAreaKey;

                await savePlayerState(member, state);

                const bossName = (combat && combat.yokai && combat.yokai.name) || 'the boss';
                const fallbackAreaName = (areaDatabase[fallbackAreaKey] && areaDatabase[fallbackAreaKey].name) || 'Faraway Land';

                for (const [sid, name] of Object.entries(activeUsers)) {
                    if (name === member) {
                        io.to(sid).emit('combatEnd', {
                            success: false,
                            message: `[DEFEAT] ${bossName} knocked your entire party unconscious! You lost ${coinsLost} coins and fled back to the safety of the ${fallbackAreaName}.`,
                            state
                        });
                    }
                }
            }
        }
        delete activeCombats[member];
    }

    party.state = 'lobby';
    party.combatInstance = null;
    broadcastPartyUpdate(lobbyCode);
    broadcastPlayerList();
}

function startBossAttackLoop(lobbyCode) {
    const party = activeParties[lobbyCode];
    if (!party || !party.combatInstance) return;

    const combat = party.combatInstance;
    if (combat.timerId) {
        clearTimeout(combat.timerId);
    }

    async function triggerBossAttack() {
        const liveParty = activeParties[lobbyCode];
        if (!liveParty || !liveParty.combatInstance) return;
        const liveCombat = liveParty.combatInstance;

        if (liveCombat.yokai.hp <= 0) return;

        const aliveMembers = [];
        const memberStates = {};
        for (const member of liveParty.members) {
            if (activeCombats[member] === liveCombat) {
                const mState = await getPlayerState(member);
                if (mState && mState.stats.health > 0) {
                    aliveMembers.push(member);
                    memberStates[member] = mState;
                }
            }
        }

        if (aliveMembers.length === 0) {
            await handleBossDefeat(lobbyCode);
            return;
        }

        // DOT damage
        let dotDamage = 0;
        let dotType = null;
        if (liveCombat.yokai.poisoned && liveCombat.yokai.poisonTicks > 0) {
            dotDamage = 5;
            liveCombat.yokai.poisonTicks--;
            if (liveCombat.yokai.poisonTicks <= 0) liveCombat.yokai.poisoned = false;
            dotType = 'poison';
        } else if (liveCombat.yokai.burned && liveCombat.yokai.burnTicks > 0) {
            dotDamage = 8;
            liveCombat.yokai.burnTicks--;
            if (liveCombat.yokai.burnTicks <= 0) liveCombat.yokai.burned = false;
            dotType = 'burn';
        }

        if (dotDamage > 0) {
            liveCombat.yokai.hp = Math.max(0, liveCombat.yokai.hp - dotDamage);
            io.to(`party_${lobbyCode}`).emit('combatFeedback', {
                message: `* The Boss takes ${dotDamage} ${dotType} damage!`,
                yokaiHp: liveCombat.yokai.hp
            });
            await broadcastPartyCombatUpdate(lobbyCode);
            if (liveCombat.yokai.hp <= 0) {
                await handleBossVictory(lobbyCode);
                return;
            }
        }

        const targetUsername = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
        const state = memberStates[targetUsername];

        let damage = liveCombat.yokai.attack;
        let eventType = "hit";
        let counterDamage = 0;

        const combConfig = actionDatabase.combat || { defenseMitigationFactor: 2.0 };
        const defFactor = combConfig.defenseMitigationFactor || 2.0;
        const activeDef = getActiveDefense(state);
        const defBonus = Math.floor(activeDef / defFactor);
        const normalDamage = Math.max(1, damage - defBonus);

        const parryConfig = actionDatabase.parry;
        const playerCombatRecord = liveCombat.players[targetUsername] || {};

        if (playerCombatRecord.lastParryTime) {
            const msSinceParry = Date.now() - playerCombatRecord.lastParryTime;

            if (msSinceParry <= parryConfig.perfectWindow) {
                damage = Math.max(1, Math.floor(normalDamage * parryConfig.perfectMitigation));
                eventType = "perfect_parry";

                const playerAtk = getActiveAttack(state);
                const counterMin = parryConfig.counterMinDamage !== undefined ? parryConfig.counterMinDamage : 3;
                counterDamage = Math.max(counterMin, Math.floor(playerAtk * parryConfig.counterMultiplier));
                liveCombat.yokai.hp = Math.max(0, liveCombat.yokai.hp - counterDamage);
            } else if (msSinceParry <= parryConfig.earlyWindow) {
                damage = Math.max(1, Math.floor(normalDamage * parryConfig.earlyMitigation));
                eventType = "early_parry";
            } else {
                const missMin = parryConfig.missMinDamage !== undefined ? parryConfig.missMinDamage : 2;
                damage = Math.max(missMin, Math.floor(normalDamage * parryConfig.missMultiplier));
                eventType = "staggered_hit";
            }
            delete playerCombatRecord.lastParryTime;
        } else {
            damage = normalDamage;
            eventType = "hit";
        }

        state.stats.health = Math.max(0, state.stats.health - damage);
        await savePlayerState(targetUsername, state);
        broadcastPlayerList();

        if (liveCombat.yokai.hp <= 0) {
            io.to(`party_${lobbyCode}`).emit('combatMonsterAttack', {
                damage,
                eventType,
                counterDamage,
                yokaiHp: liveCombat.yokai.hp,
                target: targetUsername,
                nextSpeed: 0,
                state: null
            });
            for (const [sid, name] of Object.entries(activeUsers)) {
                if (name === targetUsername) {
                    io.to(sid).emit('statUpdate', state);
                }
            }
            await handleBossVictory(lobbyCode);
        } else {
            const nextSpeed = randomizeSpeed(liveCombat.yokai.speed);
            let msg = "";
            if (eventType === "perfect_parry") {
                msg = `* [PERFECT PARRY] ${targetUsername} blocked and countered the Boss for ${counterDamage} damage! (Took ${damage} dmg)`;
            } else if (eventType === "early_parry") {
                msg = `* [PARRY] ${targetUsername} partially blocked the Boss's attack. (Took ${damage} dmg)`;
            } else if (eventType === "staggered_hit") {
                msg = `* [STAGGER] ${targetUsername}'s parry missed. (Took ${damage} dmg)`;
            } else {
                msg = `[BOSS] The Boss struck ${targetUsername} for ${damage} damage.`;
            }
            if (state.stats.health <= 0) {
                msg += ` [KNOCKED OUT] ${targetUsername} has fallen unconscious!`;
            }

            io.to(`party_${lobbyCode}`).emit('combatMonsterAttack', {
                damage,
                eventType,
                counterDamage,
                yokaiHp: liveCombat.yokai.hp,
                target: targetUsername,
                nextSpeed,
                message: msg
            });

            for (const [sid, name] of Object.entries(activeUsers)) {
                if (name === targetUsername) {
                    io.to(sid).emit('statUpdate', state);
                }
            }

            await broadcastPartyCombatUpdate(lobbyCode);
            liveCombat.timerId = setTimeout(triggerBossAttack, nextSpeed);
        }
    }

    const firstSpeed = randomizeSpeed(combat.yokai.speed);
    combat.timerId = setTimeout(triggerBossAttack, firstSpeed);
}

function broadcastPartyUpdate(lobbyCode) {
    const party = activeParties[lobbyCode];
    if (!party) return;
    io.to(`party_${lobbyCode}`).emit('partyUpdate', {
        lobbyCode,
        leader: party.leader,
        members: party.members,
        state: party.state
    });
}

io.on('connection', (socket) => {
    const session = socket.request.session;

    if (!session || !session.username) {
        socket.disconnect();
        return;
    }

    const username = session.username;

    // Single-session enforcement (kick older connections/tabs)
    for (const [sid, name] of Object.entries(activeUsers)) {
        if (name === username && sid !== socket.id) {
            io.to(sid).emit('kicked', { message: "You have been logged in from another location." });
            const oldSocket = io.sockets.sockets.get(sid);
            if (oldSocket) {
                oldSocket.disconnect(true);
            }
            delete activeUsers[sid];
        }
    }

    activeUsers[socket.id] = username;

    // === Socket Rate Limiter ===
    const rateBuckets = {};
    const RATE_LIMITS = {
        exploreStart: { max: 3, windowMs: 2000 },
        rest: { max: 2, windowMs: 3000 },
        combatAction: { max: 6, windowMs: 1000 },
        combatConfirm: { max: 3, windowMs: 2000 },
        useItem: { max: 4, windowMs: 2000 },
        buyItem: { max: 4, windowMs: 2000 },
        craftItem: { max: 4, windowMs: 2000 },
        equipItem: { max: 4, windowMs: 2000 },
        unequipItem: { max: 4, windowMs: 2000 },
        marketCreateListing: { max: 3, windowMs: 3000 },
        marketBuyListing: { max: 3, windowMs: 3000 },
        marketCancelListing: { max: 3, windowMs: 3000 },
        chatMessage: { max: 5, windowMs: 3000 },
        changeSprite: { max: 3, windowMs: 3000 },
        travelArea: { max: 3, windowMs: 2000 },
        questGetBoard: { max: 5, windowMs: 2000 },
        questAccept: { max: 3, windowMs: 2000 },
        questAbandon: { max: 3, windowMs: 2000 },
        questComplete: { max: 3, windowMs: 2000 },
        combatUseSkill: { max: 6, windowMs: 1000 },
        scavengeStart: { max: 3, windowMs: 2000 }
    };

    function isRateLimited(eventName) {
        const config = RATE_LIMITS[eventName];
        if (!config) return false;

        const now = Date.now();
        if (!rateBuckets[eventName]) {
            rateBuckets[eventName] = { count: 1, windowStart: now };
            return false;
        }

        const bucket = rateBuckets[eventName];
        if (now - bucket.windowStart > config.windowMs) {
            bucket.count = 1;
            bucket.windowStart = now;
            return false;
        }

        bucket.count++;
        if (bucket.count > config.max) {
            return true;
        }
        return false;
    }

    // Send Game Database configs to client dynamically
    socket.emit('gameDatabase', { items: itemDatabase, actions: actionDatabase, yokai: yokaiPool, areas: areaDatabase, skills: skillsDatabase });

    // Broadcast updated player list
    io.emit('update-player-list', buildPlayerListPayload());

    socket.on('ping-check', () => {
        socket.emit('pong-check');
    });

    // Auto-join party room on reconnect
    const reconnectLobbyCode = playerPartyMap[username];
    if (reconnectLobbyCode && activeParties[reconnectLobbyCode]) {
        socket.join(`party_${reconnectLobbyCode}`);
        socket.emit('partyUpdate', {
            lobbyCode: reconnectLobbyCode,
            leader: activeParties[reconnectLobbyCode].leader,
            members: activeParties[reconnectLobbyCode].members,
            state: activeParties[reconnectLobbyCode].state
        });
    }

    socket.on('partyCreate', () => {
        if (playerPartyMap[username]) {
            socket.emit('partyFeedback', { success: false, message: "You are already in a party." });
            return;
        }

        let lobbyCode;
        do {
            lobbyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        } while (activeParties[lobbyCode]);

        activeParties[lobbyCode] = {
            leader: username,
            members: [username],
            state: 'lobby',
            combatInstance: null
        };
        playerPartyMap[username] = lobbyCode;

        socket.join(`party_${lobbyCode}`);
        broadcastPartyUpdate(lobbyCode);
        socket.emit('partyFeedback', { success: true, message: `Party created with code: ${lobbyCode}` });
    });

    socket.on('partyJoin', (data) => {
        const { lobbyCode } = data || {};
        if (typeof lobbyCode !== 'string') return;
        const cleanCode = lobbyCode.trim().toUpperCase();

        if (playerPartyMap[username]) {
            socket.emit('partyFeedback', { success: false, message: "You are already in a party." });
            return;
        }

        const party = activeParties[cleanCode];
        if (!party) {
            socket.emit('partyFeedback', { success: false, message: "Invalid lobby code." });
            return;
        }

        if (party.members.length >= 4) {
            socket.emit('partyFeedback', { success: false, message: "Party is full (max 4 players)." });
            return;
        }

        if (party.state !== 'lobby') {
            socket.emit('partyFeedback', { success: false, message: "Party is already in combat." });
            return;
        }

        party.members.push(username);
        playerPartyMap[username] = cleanCode;

        socket.join(`party_${cleanCode}`);
        broadcastPartyUpdate(cleanCode);
        socket.emit('partyFeedback', { success: true, message: "Successfully joined the party!" });
    });

    socket.on('partyLeave', () => {
        const lobbyCode = playerPartyMap[username];
        if (!lobbyCode) return;

        const party = activeParties[lobbyCode];
        if (party) {
            if (party.state === 'combat') {
                socket.emit('partyFeedback', { success: false, message: "You cannot leave a party during combat!" });
                return;
            }

            party.members = party.members.filter(m => m !== username);
            delete playerPartyMap[username];
            socket.leave(`party_${lobbyCode}`);

            if (party.members.length === 0) {
                delete activeParties[lobbyCode];
            } else {
                if (party.leader === username) {
                    party.leader = party.members[0]; // promote first member
                }
                broadcastPartyUpdate(lobbyCode);
            }
            socket.emit('partyUpdate', null); // clear party on client
            socket.emit('partyFeedback', { success: true, message: "Left party." });
        }
    });

    socket.on('partyInvite', async (data) => {
        const { targetUsername } = data || {};
        if (typeof targetUsername !== 'string') return;

        let lobbyCode = playerPartyMap[username];
        if (!lobbyCode) {
            do {
                lobbyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            } while (activeParties[lobbyCode]);

            activeParties[lobbyCode] = {
                leader: username,
                members: [username],
                state: 'lobby',
                combatInstance: null
            };
            playerPartyMap[username] = lobbyCode;
            socket.join(`party_${lobbyCode}`);
            broadcastPartyUpdate(lobbyCode);
            socket.emit('partyFeedback', { success: true, message: `Party created with code: ${lobbyCode}` });
            io.emit('update-player-list', buildPlayerListPayload());
        }

        const party = activeParties[lobbyCode];
        if (party.members.length >= 4) {
            socket.emit('partyFeedback', { success: false, message: "Your party is full." });
            return;
        }

        if (party.state !== 'lobby') {
            socket.emit('partyFeedback', { success: false, message: "Cannot invite during combat." });
            return;
        }

        let sent = false;
        for (const [sid, name] of Object.entries(activeUsers)) {
            if (name === targetUsername) {
                io.to(sid).emit('partyInvitation', { from: username, lobbyCode });
                sent = true;
            }
        }

        if (sent) {
            socket.emit('partyFeedback', { success: true, message: `Invitation sent to ${targetUsername}.` });
        } else {
            socket.emit('partyFeedback', { success: false, message: `Player ${targetUsername} is offline.` });
        }
    });

    socket.on('changeSprite', async (data) => {
        if (isRateLimited('changeSprite')) return;
        if (activeExplores[username]) {
            socket.emit('spriteChangeResult', { success: false, message: "You cannot change your sprite while exploring!" });
            return;
        }
        const { sprite } = data || {};
        if (typeof sprite !== 'string') return;

        const safeSprite = sprite.replace(/\\/g, '/');

        try {
            const state = await getPlayerState(username);
            if (!state) return;

            // Find which itemKey in the inventory/equipment matches this sprite and is owned
            let matchedItemKey = null;
            if (state.equipment && state.equipment.avatar) {
                const equippedItem = itemDatabase[state.equipment.avatar];
                if (equippedItem && equippedItem.type === 'avatar' && equippedItem.sprite === safeSprite) {
                    matchedItemKey = state.equipment.avatar;
                }
            }

            if (!matchedItemKey) {
                if (state.inventory) {
                    for (const [itemKey, quantity] of Object.entries(state.inventory)) {
                        if (quantity > 0) {
                            const item = itemDatabase[itemKey];
                            if (item && item.type === 'avatar' && item.sprite === safeSprite) {
                                matchedItemKey = itemKey;
                                break;
                            }
                        }
                    }
                }
            }

            if (!matchedItemKey) {
                socket.emit('spriteChangeResult', { success: false, message: "You do not own the item associated with this sprite." });
                return;
            }

            // Check that file physically exists
            const files = await getAvailableSpriteFiles();
            const basename = path.basename(safeSprite);
            if (!files.includes(safeSprite) || basename.startsWith('background_') || basename === 'the_end_of_the_world_104602.png') {
                socket.emit('spriteChangeResult', { success: false, message: "Invalid sprite file." });
                return;
            }

            // Perform the equipment swap
            if (!state.equipment) {
                state.equipment = {};
                EQUIPPABLE_TYPES.forEach(t => state.equipment[t] = null);
            }

            let messagePart = "";
            if (state.equipment.avatar !== matchedItemKey) {
                // Return old equipped avatar to inventory
                if (state.equipment.avatar) {
                    const oldAvatarKey = state.equipment.avatar;
                    state.inventory[oldAvatarKey] = (state.inventory[oldAvatarKey] || 0) + 1;
                    const oldItem = itemDatabase[oldAvatarKey];
                    messagePart = ` Unequipped ${oldItem ? oldItem.name : oldAvatarKey}.`;
                }

                // Equip the new avatar
                state.equipment.avatar = matchedItemKey;
                state.inventory[matchedItemKey]--;
                if (state.inventory[matchedItemKey] === 0) {
                    delete state.inventory[matchedItemKey];
                }
            }

            state.sprite = safeSprite;
            await savePlayerState(username, state);
            broadcastPlayerList();

            const item = itemDatabase[matchedItemKey];
            socket.emit('spriteChangeResult', {
                success: true,
                message: `Equipped avatar ${item ? item.name : matchedItemKey}.${messagePart}`,
                state
            });
        } catch (err) {
            console.error(err);
            socket.emit('spriteChangeResult', { success: false, message: "Error changing sprite." });
        }
    });

    socket.on('marketGetListings', () => {
        db.all("SELECT * FROM market_listings ORDER BY created_at DESC", [], (err, rows) => {
            if (err) {
                console.error("[Market Error] Failed to retrieve listings:", err);
                socket.emit('marketListings', { success: false, listings: [] });
                return;
            }
            socket.emit('marketListings', { success: true, listings: rows });
        });
    });

    socket.on('marketCreateListing', async (data) => {
        if (isRateLimited('marketCreateListing')) return;
        if (activeExplores[username]) {
            socket.emit('marketCreateResult', { success: false, message: "[SYSTEM] You cannot list items on the market while exploring!" });
            return;
        }
        if (activeCombats[username] || pendingEncounters[username]) {
            socket.emit('marketCreateResult', { success: false, message: "[SYSTEM] You cannot list items on the market while in combat!" });
            return;
        }

        const { itemKey, quantity, price } = data || {};
        if (typeof itemKey !== 'string' || typeof quantity !== 'number' || typeof price !== 'number') {
            socket.emit('marketCreateResult', { success: false, message: "Invalid parameters." });
            return;
        }

        if (quantity <= 0 || price <= 0) {
            socket.emit('marketCreateResult', { success: false, message: "Quantity and price must be positive integers." });
            return;
        }

        const item = itemDatabase[itemKey];
        if (!item) {
            socket.emit('marketCreateResult', { success: false, message: "Item does not exist." });
            return;
        }

        await acquireLock(username);
        try {
            const state = await getPlayerState(username);
            if (!state) {
                releaseLock(username);
                socket.emit('marketCreateResult', { success: false, message: "Player state not found." });
                return;
            }

            if (!state.inventory || !state.inventory[itemKey] || state.inventory[itemKey] < quantity) {
                releaseLock(username);
                socket.emit('marketCreateResult', { success: false, message: "Insufficient items in inventory." });
                return;
            }

            db.run(
                "INSERT INTO market_listings (seller, item_key, quantity, price) VALUES (?, ?, ?, ?)",
                [username, itemKey, quantity, price],
                async function (insertErr) {
                    if (insertErr) {
                        releaseLock(username);
                        socket.emit('marketCreateResult', { success: false, message: "Database error listing item." });
                        return;
                    }

                    const listingId = this.lastID;
                    try {
                        state.inventory[itemKey] -= quantity;
                        if (state.inventory[itemKey] <= 0) {
                            delete state.inventory[itemKey];
                        }
                        await savePlayerState(username, state);

                        // Push update to all sockets of this player
                        for (const [sid, name] of Object.entries(activeUsers)) {
                            if (name === username) {
                                io.to(sid).emit('statUpdate', state);
                            }
                        }

                        socket.emit('marketCreateResult', { success: true, message: `Listed ${quantity}x ${item.name} for ${price} coins.` });
                        broadcastMarketListings();
                    } catch (saveErr) {
                        // Rollback listing
                        db.run("DELETE FROM market_listings WHERE id = ?", [listingId]);
                        socket.emit('marketCreateResult', { success: false, message: "Transaction failed. State could not be saved." });
                    } finally {
                        releaseLock(username);
                    }
                }
            );
        } catch (err) {
            releaseLock(username);
            socket.emit('marketCreateResult', { success: false, message: "An unexpected error occurred." });
        }
    });

    socket.on('marketCancelListing', async (data) => {
        if (isRateLimited('marketCancelListing')) return;
        if (activeExplores[username]) {
            socket.emit('marketCancelResult', { success: false, message: "[SYSTEM] You cannot cancel listings while exploring!" });
            return;
        }
        if (activeCombats[username] || pendingEncounters[username]) {
            socket.emit('marketCancelResult', { success: false, message: "[SYSTEM] You cannot cancel listings while in combat!" });
            return;
        }

        const { listingId } = data || {};
        if (typeof listingId !== 'number') {
            socket.emit('marketCancelResult', { success: false, message: "Invalid parameter." });
            return;
        }

        db.get("SELECT * FROM market_listings WHERE id = ?", [listingId], async (err, listing) => {
            if (err || !listing) {
                socket.emit('marketCancelResult', { success: false, message: "Listing not found." });
                return;
            }

            if (listing.seller !== username) {
                socket.emit('marketCancelResult', { success: false, message: "You do not own this listing." });
                return;
            }

            await acquireLock(username);
            db.run("DELETE FROM market_listings WHERE id = ? AND seller = ?", [listingId, username], async function (delErr) {
                if (delErr || this.changes === 0) {
                    releaseLock(username);
                    socket.emit('marketCancelResult', { success: false, message: "Listing could not be cancelled." });
                    return;
                }

                try {
                    const state = await getPlayerState(username);
                    const itemKey = listing.item_key;
                    const quantity = listing.quantity;

                    state.inventory[itemKey] = (state.inventory[itemKey] || 0) + quantity;
                    await savePlayerState(username, state);

                    // Notify user
                    for (const [sid, name] of Object.entries(activeUsers)) {
                        if (name === username) {
                            io.to(sid).emit('statUpdate', state);
                        }
                    }

                    socket.emit('marketCancelResult', { success: true, message: `Cancelled listing and returned items to inventory.` });
                    broadcastMarketListings();
                } catch (saveErr) {
                    // Rollback delete
                    db.run("INSERT INTO market_listings (id, seller, item_key, quantity, price) VALUES (?, ?, ?, ?, ?)",
                        [listingId, username, listing.item_key, listing.quantity, listing.price]);
                    socket.emit('marketCancelResult', { success: false, message: "Transaction failed. Listing restored." });
                } finally {
                    releaseLock(username);
                }
            });
        });
    });

    socket.on('marketBuyListing', async (data) => {
        if (isRateLimited('marketBuyListing')) return;
        if (activeExplores[username]) {
            socket.emit('marketBuyResult', { success: false, message: "[SYSTEM] You cannot purchase items while exploring!" });
            return;
        }
        if (activeCombats[username] || pendingEncounters[username]) {
            socket.emit('marketBuyResult', { success: false, message: "[SYSTEM] You cannot purchase items while in combat!" });
            return;
        }

        const { listingId } = data || {};
        if (typeof listingId !== 'number') {
            socket.emit('marketBuyResult', { success: false, message: "Invalid parameter." });
            return;
        }

        db.get("SELECT * FROM market_listings WHERE id = ?", [listingId], async (err, listing) => {
            if (err || !listing) {
                socket.emit('marketBuyResult', { success: false, message: "Listing not found or already sold." });
                return;
            }

            if (listing.seller === username) {
                socket.emit('marketBuyResult', { success: false, message: "You cannot buy your own listing. Cancel it instead." });
                return;
            }

            const price = listing.price;
            const seller = listing.seller;
            const itemKey = listing.item_key;
            const quantity = listing.quantity;
            const item = itemDatabase[itemKey];

            // Pre-check buyer coins
            const buyerState = await getPlayerState(username);
            if (!buyerState) {
                socket.emit('marketBuyResult', { success: false, message: "Failed to retrieve buyer state." });
                return;
            }
            if (buyerState.coins < price) {
                socket.emit('marketBuyResult', { success: false, message: `Insufficient coins. You need ${price} coins.` });
                return;
            }

            await acquireLocks([username, seller]);

            db.run("DELETE FROM market_listings WHERE id = ?", [listingId], async function (delErr) {
                if (delErr || this.changes === 0) {
                    releaseLocks([username, seller]);
                    socket.emit('marketBuyResult', { success: false, message: "Listing could not be purchased." });
                    return;
                }

                try {
                    const bState = await getPlayerState(username);
                    if (bState.coins < price) {
                        // Rollback listing deletion
                        db.run("INSERT INTO market_listings (id, seller, item_key, quantity, price) VALUES (?, ?, ?, ?, ?)",
                            [listingId, seller, itemKey, quantity, price]);
                        releaseLocks([username, seller]);
                        socket.emit('marketBuyResult', { success: false, message: "Insufficient coins." });
                        return;
                    }

                    const sState = await getPlayerState(seller);
                    if (!sState) {
                        throw new Error("Failed to load seller state.");
                    }

                    // Perform exchange
                    bState.coins -= price;
                    bState.inventory[itemKey] = (bState.inventory[itemKey] || 0) + quantity;

                    sState.coins += price;

                    await savePlayerState(username, bState);
                    await savePlayerState(seller, sState);

                    // Notify buyer
                    for (const [sid, name] of Object.entries(activeUsers)) {
                        if (name === username) {
                            io.to(sid).emit('statUpdate', bState);
                        }
                    }

                    // Notify seller if online
                    for (const [sid, name] of Object.entries(activeUsers)) {
                        if (name === seller) {
                            io.to(sid).emit('statUpdate', sState);
                            io.to(sid).emit('chatMessage', { user: 'System', message: `[MARKET] Your listing of ${quantity}x ${item ? item.name : itemKey} was purchased by ${username} for ${price} coins.` });
                        }
                    }

                    socket.emit('marketBuyResult', { success: true, message: `Successfully purchased ${quantity}x ${item ? item.name : itemKey} for ${price} coins.` });
                    broadcastMarketListings();
                } catch (buyErr) {
                    console.error("[Market Error] Buy transaction failed:", buyErr);
                    // Rollback delete
                    db.run("INSERT INTO market_listings (id, seller, item_key, quantity, price) VALUES (?, ?, ?, ?, ?)",
                        [listingId, seller, itemKey, quantity, price]);
                    socket.emit('marketBuyResult', { success: false, message: "Transaction failed. Listing restored." });
                } finally {
                    releaseLocks([username, seller]);
                }
            });
        });
    });

    socket.on('questGetBoard', async () => {
        if (isRateLimited('questGetBoard')) return;
        const state = await getPlayerState(username);
        if (!state) return;
        populateAvailableQuests(state);
        socket.emit('questBoard', { active: state.quests.active, available: state.quests.available });
    });

    socket.on('questAccept', async (data) => {
        if (isRateLimited('questAccept')) return;
        if (activeExplores[username]) {
            socket.emit('questResult', { success: false, message: "You cannot accept quests while exploring." });
            return;
        }
        const { questId } = data || {};
        if (!questId) return;

        await acquireLock(username);
        try {
            const state = await getPlayerState(username);
            if (!state) return;

            if (state.quests.active.length >= 3) {
                socket.emit('questResult', { success: false, message: "You can only have up to 3 active quests at a time." });
                return;
            }

            const qIdx = state.quests.available.findIndex(q => q.id === questId);
            if (qIdx === -1) {
                socket.emit('questResult', { success: false, message: "Quest is no longer available on the board." });
                return;
            }

            const quest = state.quests.available.splice(qIdx, 1)[0];
            state.quests.active.push(quest);

            populateAvailableQuests(state);

            await savePlayerState(username, state);
            socket.emit('questResult', { success: true, message: `Accepted quest: ${quest.title}` });
            socket.emit('questBoard', { active: state.quests.active, available: state.quests.available });
            socket.emit('statUpdate', state);
        } catch (err) {
            console.error("[Quest Accept Error]:", err);
        } finally {
            releaseLock(username);
        }
    });

    socket.on('questAbandon', async (data) => {
        if (isRateLimited('questAbandon')) return;
        if (activeExplores[username]) {
            socket.emit('questResult', { success: false, message: "You cannot abandon quests while exploring." });
            return;
        }
        const { questId } = data || {};
        if (!questId) return;

        await acquireLock(username);
        try {
            const state = await getPlayerState(username);
            if (!state) return;

            const qIdx = state.quests.active.findIndex(q => q.id === questId);
            if (qIdx === -1) {
                socket.emit('questResult', { success: false, message: "Active quest not found." });
                return;
            }

            const quest = state.quests.active.splice(qIdx, 1)[0];
            await savePlayerState(username, state);

            socket.emit('questResult', { success: true, message: `Abandoned quest: ${quest.title}` });
            socket.emit('questBoard', { active: state.quests.active, available: state.quests.available });
            socket.emit('statUpdate', state);
        } catch (err) {
            console.error("[Quest Abandon Error]:", err);
        } finally {
            releaseLock(username);
        }
    });

    socket.on('questComplete', async (data) => {
        if (isRateLimited('questComplete')) return;
        if (activeExplores[username]) {
            socket.emit('questResult', { success: false, message: "You cannot complete quests while exploring." });
            return;
        }
        const { questId } = data || {};
        if (!questId) return;

        await acquireLock(username);
        try {
            const state = await getPlayerState(username);
            if (!state) return;

            const qIdx = state.quests.active.findIndex(q => q.id === questId);
            if (qIdx === -1) {
                socket.emit('questResult', { success: false, message: "Quest is not in your active list." });
                return;
            }

            const quest = state.quests.active[qIdx];

            if (quest.type === 'gather') {
                const ownedQty = state.inventory[quest.target] || 0;
                if (ownedQty < quest.required) {
                    socket.emit('questResult', { success: false, message: `You do not have enough ${quest.targetName}. Need ${quest.required}, but have ${ownedQty}.` });
                    return;
                }
                state.inventory[quest.target] -= quest.required;
                if (state.inventory[quest.target] <= 0) {
                    delete state.inventory[quest.target];
                }
            } else {
                if (quest.count < quest.required) {
                    socket.emit('questResult', { success: false, message: `Quest requirements not met yet (${quest.count}/${quest.required}).` });
                    return;
                }
            }

            state.quests.active.splice(qIdx, 1);

            const xpReward = quest.reward.xp || 0;
            const coinsReward = quest.reward.coins || 0;

            state.coins += coinsReward;
            state.experience += xpReward;

            let leveledUp = false;
            const lvlConfig = actionDatabase.leveling || { xpMultiplier: 1.5, maxHealthIncrease: 10, attackIncrease: 2, defenseIncrease: 2 };
            while (state.experience >= state.experienceNeeded) {
                state.experience -= state.experienceNeeded;
                state.level++;
                state.experienceNeeded = Math.floor(state.experienceNeeded * lvlConfig.xpMultiplier);
                state.stats.maxHealth = (state.stats.maxHealth || 50) + lvlConfig.maxHealthIncrease;
                state.stats.health = state.stats.maxHealth;
                state.stats.attack += lvlConfig.attackIncrease;
                state.stats.defense += lvlConfig.defenseIncrease;
                leveledUp = true;
            }

            await savePlayerState(username, state);

            socket.emit('questResult', { success: true, message: `Completed quest: ${quest.title}! Gained ${coinsReward} coins and ${xpReward} XP.` });
            socket.emit('questBoard', { active: state.quests.active, available: state.quests.available });
            socket.emit('statUpdate', state);
            if (leveledUp) {
                broadcastPlayerList();
            }
            socket.emit('chatMessage', { user: 'System', message: `[QUEST] You completed the quest "${quest.title}" and earned ${coinsReward} coins and ${xpReward} XP!` });
        } catch (err) {
            console.error("[Quest Complete Error]:", err);
        } finally {
            releaseLock(username);
        }
    });

    socket.on('chatMessage', (message) => {
        if (typeof message !== 'string') return;
        const trimmed = message.trim();
        if (!trimmed || trimmed.length > 200) return;

        const now = Date.now();
        if (now - (lastChatTime[username] || 0) < 1000) {
            socket.emit('chatMessage', { user: 'System', message: 'You are sending messages too quickly.' });
            return;
        }
        lastChatTime[username] = now;

        const escapeHtml = (unsafe) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        io.emit('chatMessage', { user: username, message: escapeHtml(trimmed) });
    });

    socket.on('exploreStart', async () => {
        if (isRateLimited('exploreStart')) return;

        if (activeExplores[username]) {
            socket.emit('exploreResult', {
                success: false,
                message: "[SYSTEM] You are already exploring!"
            });
            return;
        }

        if (activeCombats[username]) {
            socket.emit('exploreResult', {
                success: false,
                message: "[SYSTEM] You cannot explore while in active combat!"
            });
            return;
        }

        if (pendingEncounters[username]) {
            socket.emit('exploreResult', {
                success: false,
                message: "[SYSTEM] You must deal with the sighted Yokai first!"
            });
            return;
        }

        const expConfig = actionDatabase.explore;
        const now = Date.now();
        if (now - (lastExploreTime[username] || 0) < expConfig.cooldown) {
            socket.emit('exploreResult', {
                success: false,
                message: "Slow down! You are exploring too quickly."
            });
            return;
        }

        const state = await getPlayerState(username);
        if (!state) return;

        const areaKeys = Object.keys(areaDatabase);
        const fallbackAreaKey = areaKeys[0] || 'bamboo_grove';
        const areaKey = state.currentArea || fallbackAreaKey;

        const currentAreaObj = areaDatabase[areaKey];
        let bossKey = null;
        if (currentAreaObj && currentAreaObj.yokaiPool) {
            for (const yKey of currentAreaObj.yokaiPool) {
                if (yokaiPool[yKey] && yokaiPool[yKey].isBoss) {
                    bossKey = yKey;
                    break;
                }
            }
        }

        if (bossKey) {
            const bossTemplate = yokaiPool[bossKey];
            const areaName = (currentAreaObj && currentAreaObj.name) || areaKey;
            const lobbyCode = playerPartyMap[username];
            if (!lobbyCode) {
                socket.emit('exploreResult', { success: false, message: `${areaName} is a Co-op Boss area. You must be in a party to enter.` });
                return;
            }
            const party = activeParties[lobbyCode];
            if (!party) {
                socket.emit('exploreResult', { success: false, message: "Party not found." });
                return;
            }
            if (party.leader !== username) {
                socket.emit('exploreResult', { success: false, message: "Only the party leader can initiate the Boss encounter." });
                return;
            }

            const onlinePlayers = Object.values(activeUsers);
            for (const member of party.members) {
                if (!onlinePlayers.includes(member)) {
                    socket.emit('exploreResult', { success: false, message: `All party members must be online to start! (${member} is offline)` });
                    return;
                }
                const memberState = await getPlayerState(member);
                if (!memberState || memberState.currentArea !== areaKey) {
                    socket.emit('exploreResult', { success: false, message: `All party members must be at the ${areaName} to start! (${member} is not here)` });
                    return;
                }
                if (activeCombats[member] || pendingEncounters[member]) {
                    socket.emit('exploreResult', { success: false, message: `All party members must be out of combat to start! (${member} is currently busy)` });
                    return;
                }
            }

            const staminaCost = expConfig.staminaCost;
            if (state.stamina < staminaCost) {
                socket.emit('exploreResult', { success: false, message: "[EXHAUSTED] You are too exhausted to explore. Rest at the Inn or wait for your Stamina to recover!" });
                return;
            }
            state.stamina -= staminaCost;
            await savePlayerState(username, state);
            socket.emit('statUpdate', state);

            const template = yokaiPool[bossKey];
            if (!template) {
                socket.emit('exploreResult', { success: false, message: "Boss configuration not found." });
                return;
            }

            const partySize = party.members.length;
            const scaledHp = template.hp * partySize;
            const scaledMaxHp = template.maxHp * partySize;
            const scaledAttack = template.attack;
            const scaledDefense = template.defense;

            const bossCombatInstance = {
                isBoss: true,
                lobbyCode: lobbyCode,
                yokai: {
                    key: bossKey,
                    name: template.name,
                    sprite: template.sprite,
                    hp: scaledHp,
                    maxHp: scaledMaxHp,
                    attack: scaledAttack,
                    defense: scaledDefense,
                    speed: template.speed,
                    xpReward: template.xpReward,
                    coinReward: template.coinReward,
                    loot: template.loot
                },
                players: {},
                lastMonsterAttack: Date.now(),
                timerId: null
            };

            for (const member of party.members) {
                bossCombatInstance.players[member] = {
                    lastStrikeTime: 0,
                    lastParryActionTime: 0,
                    lastParryTime: 0,
                    lastSkillTimes: {}
                };
                activeCombats[member] = bossCombatInstance;
                delete pendingEncounters[member];
            }

            party.state = 'combat';
            party.combatInstance = bossCombatInstance;
            broadcastPartyUpdate(lobbyCode);

            for (const member of party.members) {
                const memberState = await getPlayerState(member);
                for (const [sid, name] of Object.entries(activeUsers)) {
                    if (name === member) {
                        io.to(sid).emit('combatStart', {
                            yokai: {
                                name: bossCombatInstance.yokai.name,
                                sprite: bossCombatInstance.yokai.sprite,
                                hp: bossCombatInstance.yokai.hp,
                                maxHp: bossCombatInstance.yokai.maxHp,
                                speed: bossCombatInstance.yokai.speed
                            },
                            state: memberState
                        });
                    }
                }
            }

            startBossAttackLoop(lobbyCode);
            return;
        }

        const defaultArea = areaDatabase[fallbackAreaKey] || { name: 'Bamboo Grove', desc: 'A tranquil path lined with rustling bamboo stalks.' };
        const area = areaDatabase[areaKey] || {
            name: defaultArea.name,
            desc: defaultArea.desc,
            minLevel: 1,
            encounterChance: expConfig.encounterChance || 0.35,
            forageChance: expConfig.forageChance || 0.4,
            yokaiPool: Object.keys(yokaiPool),
            lootPool: Object.keys(itemDatabase),
            difficultyMultiplier: 1.0
        };

        if (state.level < area.minLevel) {
            state.currentArea = fallbackAreaKey;
            await savePlayerState(username, state);
            const fallbackArea = areaDatabase[fallbackAreaKey] || { name: 'Bamboo Grove' };
            socket.emit('exploreResult', {
                success: false,
                message: `[AREA RESTRICTED] You were forced back to ${fallbackArea.name} because you do not meet the level requirement for ${area.name} (Requires Level ${area.minLevel}).`,
                state
            });
            return;
        }

        const staminaCost = expConfig.staminaCost;
        if (state.stamina < staminaCost) {
            socket.emit('exploreResult', {
                success: false,
                message: "[EXHAUSTED] You are too exhausted to explore. Rest at the Inn or wait for your Stamina to recover!"
            });
            return;
        }

        state.stamina -= staminaCost;

        // Explore Quest progress tracking
        if (state.quests && Array.isArray(state.quests.active)) {
            state.quests.active.forEach(quest => {
                if (quest.type === 'explore' && quest.target === areaKey) {
                    if (quest.count < quest.required) {
                        quest.count++;
                    }
                }
            });
        }

        lastExploreTime[username] = now;
        await savePlayerState(username, state);

        const duration = expConfig.cooldown || 1500;
        const timerId = setTimeout(async () => {
            await handleExplorationComplete(username, socket);
        }, duration);

        activeExplores[username] = {
            timerId,
            startTime: now,
            duration
        };

        broadcastPlayerList();

        socket.emit('exploreStarted', {
            success: true,
            duration,
            state
        });
    });

    socket.on('scavengeStart', async () => {
        if (isRateLimited('scavengeStart')) return;

        if (activeExplores[username]) {
            socket.emit('exploreResult', {
                success: false,
                message: "[SYSTEM] You are already performing an action!"
            });
            return;
        }

        if (activeCombats[username] || pendingEncounters[username]) {
            socket.emit('exploreResult', {
                success: false,
                message: "[SYSTEM] You cannot scavenge while busy with Yokai!"
            });
            return;
        }

        const scavConfig = actionDatabase.scavenge || { staminaCost: 15, cooldown: 3000 };
        const now = Date.now();
        if (now - (lastExploreTime[username] || 0) < (scavConfig.cooldown || 3000)) {
            socket.emit('exploreResult', {
                success: false,
                message: "Slow down! You are acting too quickly."
            });
            return;
        }

        const state = await getPlayerState(username);
        if (!state) return;

        const staminaCost = scavConfig.staminaCost || 15;
        if (state.stamina < staminaCost) {
            socket.emit('exploreResult', {
                success: false,
                message: "[EXHAUSTED] You are too exhausted to scavenge. Rest at the Inn!"
            });
            return;
        }

        state.stamina -= staminaCost;
        lastExploreTime[username] = now;
        await savePlayerState(username, state);

        const duration = scavConfig.cooldown || 3000;
        const timerId = setTimeout(async () => {
            await handleScavengeComplete(username, socket);
        }, duration);

        activeExplores[username] = { timerId, startTime: now, duration, type: 'scavenge' };
        broadcastPlayerList();

        socket.emit('exploreStarted', { success: true, duration, type: 'scavenge', state });
    });

    socket.on('combatAction', async (data) => {
        if (isRateLimited('combatAction')) return;
        const combat = activeCombats[username];
        if (!combat) {
            socket.emit('combatFeedback', { message: "You are not in active combat." });
            return;
        }

        const state = await getPlayerState(username);
        if (!state) return;

        const { action } = data || {};
        if (typeof action !== 'string') return;
        const now = Date.now();
        const playerRecord = combat.isBoss ? combat.players[username] : combat;

        if (action === 'strike') {
            const strikeConfig = actionDatabase.strike;
            if (now - (playerRecord.lastStrikeTime || 0) < strikeConfig.cooldown) return;
            playerRecord.lastStrikeTime = now;

            const baseDmg = getActiveAttack(state);
            const variance = Math.floor(Math.random() * strikeConfig.damageVariance) + 1;
            let dmgDealt = baseDmg + variance - Math.floor(combat.yokai.defense / 2);

            let isCrit = false;
            const critChance = getActiveCritChance(state);
            if (Math.random() < critChance) {
                dmgDealt *= 2;
                isCrit = true;
            }

            dmgDealt = Math.max(strikeConfig.baseMinDamage, dmgDealt);

            let isExhaustedStrike = false;
            if (state.stamina <= 0) {
                dmgDealt = Math.max(1, Math.floor(dmgDealt * 0.5));
                isExhaustedStrike = true;
            }

            state.stamina = Math.max(0, state.stamina - 5);

            let hpHealed = 0;
            const lifestealRate = getActiveLifesteal(state);
            if (lifestealRate > 0) {
                hpHealed = Math.floor(dmgDealt * lifestealRate);
                if (hpHealed > 0) {
                    const maxHp = state.stats.maxHealth || 50;
                    state.stats.health = Math.min(maxHp, state.stats.health + hpHealed);
                }
            }

            let statusApplied = null;
            const poisonChance = getActivePoisonChance(state);
            const burnChance = getActiveBurnChance(state);

            if (Math.random() < poisonChance) {
                combat.yokai.poisoned = true;
                combat.yokai.poisonTicks = 3;
                statusApplied = 'poison';
            } else if (Math.random() < burnChance) {
                combat.yokai.burned = true;
                combat.yokai.burnTicks = 3;
                statusApplied = 'burn';
            }

            combat.yokai.hp = Math.max(0, combat.yokai.hp - dmgDealt);

            await savePlayerState(username, state);
            broadcastPlayerList();

            let msg = `${username} struck the monster for ${dmgDealt} damage.`;
            if (isCrit) msg = `* [CRIT] ${msg}`;
            if (isExhaustedStrike) msg += ` (Exhausted: 50% damage)`;
            if (hpHealed > 0) msg += ` (+${hpHealed} HP Lifesteal)`;
            if (statusApplied === 'poison') msg += ` [POISONED]`;
            else if (statusApplied === 'burn') msg += ` [BURNED]`;

            if (combat.isBoss) {
                if (combat.yokai.hp <= 0) {
                    await handleBossVictory(combat.lobbyCode);
                } else {
                    io.to(`party_${combat.lobbyCode}`).emit('combatPlayerHit', {
                        damageDealt: dmgDealt,
                        yokaiHp: combat.yokai.hp,
                        state: null,
                        message: `[PARTY] ${msg}`
                    });
                    socket.emit('statUpdate', state);
                    await broadcastPartyCombatUpdate(combat.lobbyCode);
                }
            } else {
                if (combat.yokai.hp <= 0) {
                    await handleCombatVictory(username, socket, combat, state);
                } else {
                    socket.emit('combatPlayerHit', {
                        damageDealt: dmgDealt,
                        yokaiHp: combat.yokai.hp,
                        state,
                        message: `[COMBAT] You struck the Yokai for ${dmgDealt} damage.${isCrit ? ' (CRIT)' : ''}${isExhaustedStrike ? ' (Exhausted: 50% damage)' : ''}${hpHealed > 0 ? ` (+${hpHealed} HP)` : ''}${statusApplied ? ` [${statusApplied.toUpperCase()}]` : ''}`
                    });
                }
            }
        } else if (action === 'parry') {
            const parryConfig = actionDatabase.parry;
            if (now - (playerRecord.lastParryActionTime || 0) < parryConfig.cooldown) {
                socket.emit('combatFeedback', { message: "Parry is on cooldown!" });
                return;
            }
            playerRecord.lastParryActionTime = now;
            playerRecord.lastParryTime = now;

            const maxStam = state.maxStamina || 100;
            state.stamina = Math.min(maxStam, state.stamina + 10);
            await savePlayerState(username, state);
            broadcastPlayerList();

            if (combat.isBoss) {
                io.to(`party_${combat.lobbyCode}`).emit('combatFeedback', {
                    message: `* [PARRY] ${username} raised their guard! (+10 Stamina)`,
                    state: null
                });
                socket.emit('statUpdate', state);
                await broadcastPartyCombatUpdate(combat.lobbyCode);
            } else {
                socket.emit('combatFeedback', {
                    message: "You raised your guard! (+10 Stamina)",
                    state
                });
            }
        } else if (action === 'flee') {
            const fleeConfig = actionDatabase.flee;
            const escapeStamina = fleeConfig.staminaCost;
            if (state.stamina < escapeStamina) {
                socket.emit('combatFeedback', { message: `Not enough stamina to escape (needs ${escapeStamina})!` });
                return;
            }

            state.stamina -= escapeStamina;

            const coinsLost = Math.floor(state.coins * 0.1);
            state.coins = Math.max(0, state.coins - coinsLost);

            const xpLost = Math.floor(state.experienceNeeded * 0.05);
            state.experience = Math.max(0, state.experience - xpLost);

            let penaltyMsg = "";
            if (coinsLost > 0 && xpLost > 0) {
                penaltyMsg = ` Lost ${coinsLost} coins and ${xpLost} XP.`;
            } else if (coinsLost > 0) {
                penaltyMsg = ` Lost ${coinsLost} coins.`;
            } else if (xpLost > 0) {
                penaltyMsg = ` Lost ${xpLost} XP.`;
            }

            if (combat.isBoss) {
                const areaKeys = Object.keys(areaDatabase);
                const fallbackAreaKey = areaKeys[0] || 'bamboo_grove';
                state.currentArea = fallbackAreaKey;

                delete activeCombats[username];
                await savePlayerState(username, state);
                broadcastPlayerList();

                const bossName = (combat && combat.yokai && combat.yokai.name) || 'the boss';
                const fallbackAreaName = (areaDatabase[fallbackAreaKey] && areaDatabase[fallbackAreaKey].name) || 'Faraway Land';

                socket.emit('combatEnd', {
                    success: false,
                    escaped: true,
                    message: `[ESCAPE] You fled from ${bossName} back to the ${fallbackAreaName}. (-${escapeStamina} Stamina).${penaltyMsg}`,
                    state
                });

                io.to(`party_${combat.lobbyCode}`).emit('combatFeedback', {
                    message: `* [FLEE] ${username} fled the boss battle!`,
                    state: null
                });

                await broadcastPartyCombatUpdate(combat.lobbyCode);
            } else {
                if (combat.timerId) {
                    clearTimeout(combat.timerId);
                }
                delete activeCombats[username];
                await savePlayerState(username, state);
                broadcastPlayerList();

                socket.emit('combatEnd', {
                    success: false,
                    escaped: true,
                    message: `[ESCAPE] You fled back to the safety of the path. (-${escapeStamina} Stamina).${penaltyMsg}`,
                    state
                });
            }
        }
    });

    socket.on('combatUseSkill', async (data) => {
        if (isRateLimited('combatUseSkill')) return;
        const combat = activeCombats[username];
        if (!combat) {
            socket.emit('combatFeedback', { message: "You are not in active combat." });
            return;
        }

        const state = await getPlayerState(username);
        if (!state) return;

        const { skillKey } = data || {};
        if (typeof skillKey !== 'string') return;

        const skill = skillsDatabase[skillKey];
        if (!skill) {
            socket.emit('combatFeedback', { message: "Unknown skill." });
            return;
        }

        const weaponKey = state.equipment?.weapon;
        const weaponItem = weaponKey ? itemDatabase[weaponKey] : null;
        if (!weaponItem || !Array.isArray(weaponItem.skills) || !weaponItem.skills.includes(skillKey)) {
            socket.emit('combatFeedback', { message: "Your equipped weapon cannot use this skill." });
            return;
        }

        const playerRecord = combat.isBoss ? combat.players[username] : combat;
        playerRecord.lastSkillTimes = playerRecord.lastSkillTimes || {};
        const now = Date.now();
        if (now - (playerRecord.lastSkillTimes[skillKey] || 0) < skill.cooldown) {
            socket.emit('combatFeedback', { message: "Skill is on cooldown!" });
            return;
        }

        if (state.stamina < skill.staminaCost) {
            socket.emit('combatFeedback', { message: `Not enough stamina (needs ${skill.staminaCost}st)!` });
            return;
        }

        state.stamina = Math.max(0, state.stamina - skill.staminaCost);
        playerRecord.lastSkillTimes[skillKey] = now;

        let dmgDealt = 0;
        let hpHealed = 0;
        let message = "";
        let isCrit = false;
        let statusApplied = null;

        if (skill.effects && skill.effects.healAmount) {
            hpHealed = skill.effects.healAmount;
            const maxHp = state.stats.maxHealth || 50;
            state.stats.health = Math.min(maxHp, state.stats.health + hpHealed);
            message = `${username} cast ${skill.name} restoring ${hpHealed} HP.`;
        } else if (skill.effects) {
            const baseDmg = getActiveAttack(state);
            const strikeConfig = actionDatabase.strike || { damageVariance: 3, baseMinDamage: 2 };
            const variance = Math.floor(Math.random() * (strikeConfig.damageVariance || 3)) + 1;

            let defense = combat.yokai.defense;
            if (skill.effects.ignoreDefense) {
                defense = 0;
            }

            const baseMult = skill.effects.damageMultiplier || 1.0;
            let rawDmg = Math.floor((baseDmg + variance) * baseMult);
            let finalDmg = rawDmg - Math.floor(defense / 2);

            const critChance = getActiveCritChance(state);
            if (Math.random() < critChance) {
                finalDmg *= 2;
                isCrit = true;
            }

            dmgDealt = Math.max(strikeConfig.baseMinDamage || 2, finalDmg);

            const lifestealRate = getActiveLifesteal(state);
            if (lifestealRate > 0) {
                const lsHeal = Math.floor(dmgDealt * lifestealRate);
                if (lsHeal > 0) {
                    hpHealed += lsHeal;
                    const maxHp = state.stats.maxHealth || 50;
                    state.stats.health = Math.min(maxHp, state.stats.health + lsHeal);
                }
            }

            if (skill.effects.inflictEffect === 'burned') {
                combat.yokai.burned = true;
                combat.yokai.burnTicks = skill.effects.effectTicks || 3;
                statusApplied = 'burn';
            }

            combat.yokai.hp = Math.max(0, combat.yokai.hp - dmgDealt);

            message = `${username} unleashed ${skill.name} dealing ${dmgDealt} damage.`;
            if (isCrit) message = `* [CRIT] ${message}`;
            if (hpHealed > 0) message += ` (+${hpHealed} HP Lifesteal)`;
            if (statusApplied === 'burn') message += ` [BURNED]`;
        }

        await savePlayerState(username, state);
        broadcastPlayerList();

        if (combat.isBoss) {
            if (combat.yokai.hp <= 0) {
                await handleBossVictory(combat.lobbyCode);
            } else {
                if (skill.effects && skill.effects.healAmount) {
                    io.to(`party_${combat.lobbyCode}`).emit('combatFeedback', {
                        message: `* [SKILL] ${message}`,
                        state: null
                    });
                } else {
                    io.to(`party_${combat.lobbyCode}`).emit('combatPlayerHit', {
                        damageDealt: dmgDealt,
                        yokaiHp: combat.yokai.hp,
                        state: null,
                        message: `[SKILL] ${message}`
                    });
                }
                socket.emit('statUpdate', state);
                await broadcastPartyCombatUpdate(combat.lobbyCode);
            }
        } else {
            if (combat.yokai.hp <= 0) {
                await handleCombatVictory(username, socket, combat, state);
            } else {
                if (skill.effects && skill.effects.healAmount) {
                    socket.emit('combatFeedback', {
                        message: `[SKILL] You cast ${skill.name} restoring ${hpHealed} HP.`,
                        state
                    });
                } else {
                    socket.emit('combatPlayerHit', {
                        damageDealt: dmgDealt,
                        yokaiHp: combat.yokai.hp,
                        state,
                        message: `[SKILL] You unleashed ${skill.name} dealing ${dmgDealt} damage.${isCrit ? ' (CRIT)' : ''}${hpHealed > 0 ? ` (+${hpHealed} HP)` : ''}${statusApplied ? ` [${statusApplied.toUpperCase()}]` : ''}`
                    });
                }
            }
        }
    });

    socket.on('combatConfirm', async (data) => {
        if (isRateLimited('combatConfirm')) return;
        const username = activeUsers[socket.id];
        if (!username) return;

        if (activeCombats[username]) {
            socket.emit('combatFeedbackEncounter', { message: "You are already in active combat!" });
            return;
        }

        const pendingKey = pendingEncounters[username];
        if (!pendingKey) {
            socket.emit('combatFeedbackEncounter', { message: "No pending encounter found." });
            return;
        }

        const state = await getPlayerState(username);
        if (!state) return;

        const { choice } = data || {};
        if (typeof choice !== 'string') return;

        if (choice === 'fight') {
            const template = yokaiPool[pendingKey];
            if (!template) {
                delete pendingEncounters[username];
                return;
            }

            const areaKeys = Object.keys(areaDatabase);
            const fallbackAreaKey = areaKeys[0] || 'bamboo_grove';
            const areaKey = state.currentArea || fallbackAreaKey;
            const area = areaDatabase[areaKey] || { difficultyMultiplier: 1.0 };
            const diffMult = area.difficultyMultiplier !== undefined ? area.difficultyMultiplier : 1.0;

            const scaledHp = Math.floor(template.hp * diffMult);
            const scaledMaxHp = Math.floor(template.maxHp * diffMult);
            const scaledAttack = Math.floor(template.attack * diffMult);
            const scaledDefense = Math.floor(template.defense * diffMult);

            const combatInstance = {
                yokai: {
                    key: pendingKey,
                    name: template.name,
                    sprite: template.sprite,
                    hp: scaledHp,
                    maxHp: scaledMaxHp,
                    attack: scaledAttack,
                    defense: scaledDefense,
                    speed: template.speed,
                    xpReward: Math.floor(template.xpReward * (1 + (diffMult - 1) * 0.5)),
                    coinReward: Math.floor(template.coinReward * (1 + (diffMult - 1) * 0.5))
                },
                playerUsername: username,
                lastMonsterAttack: Date.now(),
                parryActive: false,
                timerId: null
            };

            activeCombats[username] = combatInstance;
            delete pendingEncounters[username];

            await savePlayerState(username, state);
            broadcastPlayerList();
            startMonsterAttackLoop(username, socket);

            socket.emit('combatStart', {
                yokai: {
                    ...combatInstance.yokai,
                    speed: combatInstance.firstAttackSpeed
                },
                state
            });
        } else if (choice === 'sneak') {
            const expConfig = actionDatabase.explore;
            const escapeCost = expConfig.sneakStaminaCost !== undefined ? expConfig.sneakStaminaCost : 5;
            if (state.stamina < escapeCost) {
                socket.emit('combatFeedbackEncounter', { message: `Not enough stamina to avoid Yokai (needs ${escapeCost})!` });
                return;
            }

            state.stamina -= escapeCost;
            const template = yokaiPool[pendingKey];
            const name = template ? template.name : "Yokai";

            delete pendingEncounters[username];
            await savePlayerState(username, state);
            broadcastPlayerList();

            socket.emit('combatSneakResult', {
                success: true,
                message: `[SYSTEM] You successfully avoided the ${name} and slipped back onto the main trail. (-${escapeCost} Stamina)`,
                state
            });
        }
    });

    socket.on('rest', async () => {
        if (isRateLimited('rest')) return;
        if (activeExplores[username]) {
            socket.emit('restResult', { success: false, message: "[SYSTEM] You cannot rest while exploring!" });
            return;
        }
        if (activeCombats[username]) {
            socket.emit('restResult', {
                success: false,
                message: "[SYSTEM] You cannot rest while in active combat!"
            });
            return;
        }

        if (pendingEncounters[username]) {
            socket.emit('restResult', {
                success: false,
                message: "[SYSTEM] You cannot rest while a Yokai encounter is pending!"
            });
            return;
        }

        const state = await getPlayerState(username);
        if (!state) return;

        const restConfig = actionDatabase.rest;
        const cost = (restConfig.coinCost || 5) * (state.level || 1);
        if (state.coins < cost) {
            socket.emit('restResult', {
                success: false,
                message: `[SYSTEM] You do not have enough coins to rest! Rest costs ${cost} coins.`
            });
            return;
        }

        state.coins -= cost;
        state.stats.health = Math.floor((state.stats.maxHealth || 50) * restConfig.innHealPercent);
        state.stamina = Math.floor((state.maxStamina || 100) * restConfig.innHealPercent);

        await savePlayerState(username, state);

        socket.emit('restResult', {
            success: true,
            message: `[INN] You paid ${cost} coins and rested at the village inn. Your Health and Stamina have been fully restored!`,
            state
        });
    });

    socket.on('travelArea', async (data) => {
        if (isRateLimited('travelArea')) return;
        if (activeExplores[username]) {
            socket.emit('travelResult', { success: false, message: "[SYSTEM] You cannot travel while exploring!" });
            return;
        }
        if (activeCombats[username]) {
            socket.emit('travelResult', { success: false, message: "[SYSTEM] You cannot travel while in active combat!" });
            return;
        }

        if (pendingEncounters[username]) {
            socket.emit('travelResult', { success: false, message: "[SYSTEM] You must deal with the pending encounter first!" });
            return;
        }

        const { areaKey } = data || {};
        if (typeof areaKey !== 'string') return;

        const area = areaDatabase[areaKey];
        if (!area) {
            socket.emit('travelResult', { success: false, message: "[SYSTEM] Destination area does not exist." });
            return;
        }

        const state = await getPlayerState(username);
        if (!state) return;

        if (state.level < area.minLevel) {
            socket.emit('travelResult', { success: false, message: `[RESTRICTED] You do not meet the minimum level for ${area.name} (Requires Level ${area.minLevel}).` });
            return;
        }

        state.currentArea = areaKey;
        await savePlayerState(username, state);
        broadcastPlayerList();

        socket.emit('travelResult', {
            success: true,
            message: `[TRAVEL] You have arrived at ${area.name}.`,
            state
        });
    });

    socket.on('useItem', async (data) => {
        if (isRateLimited('useItem')) return;
        if (activeExplores[username]) {
            socket.emit('itemUseResult', { success: false, message: "[SYSTEM] You cannot manage your inventory while exploring!" });
            return;
        }
        if (activeCombats[username]) {
            socket.emit('itemUseResult', { success: false, message: "[SYSTEM] You cannot manage your inventory while in combat!" });
            return;
        }

        if (pendingEncounters[username]) {
            socket.emit('itemUseResult', { success: false, message: "[SYSTEM] You must deal with the pending encounter first!" });
            return;
        }

        const { itemKey } = data || {};
        if (typeof itemKey !== 'string') return;

        const state = await getPlayerState(username);
        if (!state) return;

        if (!state.inventory || !state.inventory[itemKey] || state.inventory[itemKey] <= 0) {
            socket.emit('itemUseResult', { success: false, message: "You do not own this item!" });
            return;
        }

        const item = itemDatabase[itemKey];
        if (!item || item.type !== "consumable") {
            socket.emit('itemUseResult', { success: false, message: "This item cannot be consumed!" });
            return;
        }

        let used = false;
        let recoveryMessage = "";

        const hpRestore = item.effects?.hpRestore;
        if (hpRestore) {
            const maxHP = state.stats.maxHealth || 50;
            if (state.stats.health < maxHP) {
                state.stats.health = Math.min(maxHP, state.stats.health + hpRestore);
                recoveryMessage += ` Restored ${hpRestore} Health.`;
                used = true;
            }
        }

        const staminaRestore = item.effects?.staminaRestore;
        if (staminaRestore) {
            const maxStam = state.maxStamina || 100;
            if (state.stamina < maxStam) {
                state.stamina = Math.min(maxStam, state.stamina + staminaRestore);
                recoveryMessage += ` Restored ${staminaRestore} Stamina.`;
                used = true;
            }
        }

        if (!used) {
            if (hpRestore && staminaRestore) {
                socket.emit('itemUseResult', { success: false, message: "Your Health and Stamina are already full!" });
            } else if (hpRestore) {
                socket.emit('itemUseResult', { success: false, message: "Your Health is already full!" });
            } else if (staminaRestore) {
                socket.emit('itemUseResult', { success: false, message: "Your Stamina is already full!" });
            } else {
                socket.emit('itemUseResult', { success: false, message: "This item cannot be used right now." });
            }
            return;
        }

        if (used) {
            state.inventory[itemKey]--;
            if (state.inventory[itemKey] === 0) {
                delete state.inventory[itemKey];
            }

            await savePlayerState(username, state);
            socket.emit('itemUseResult', {
                success: true,
                message: `[CONSUME] You consumed 1x ${item.name}.${recoveryMessage}`,
                state
            });
        }
    });

    socket.on('sellItem', async (data) => {
        if (isRateLimited('sellItem')) return;
        if (activeExplores[username]) {
            socket.emit('itemSellResult', { success: false, message: "[SYSTEM] You cannot trade while exploring!" });
            return;
        }
        if (activeCombats[username]) {
            socket.emit('itemSellResult', { success: false, message: "[SYSTEM] You cannot trade while in combat!" });
            return;
        }

        if (pendingEncounters[username]) {
            socket.emit('itemSellResult', { success: false, message: "[SYSTEM] You must deal with the pending encounter first!" });
            return;
        }

        const { itemKey } = data || {};
        if (typeof itemKey !== 'string') return;

        const state = await getPlayerState(username);
        if (!state) return;

        if (!state.inventory || !state.inventory[itemKey] || state.inventory[itemKey] <= 0) {
            socket.emit('itemSellResult', { success: false, message: "You do not own this item!" });
            return;
        }

        const item = itemDatabase[itemKey];
        if (!item) {
            socket.emit('itemSellResult', { success: false, message: "Invalid item!" });
            return;
        }

        const coinsEarned = Math.floor((item.value || 0) / 2);
        state.coins += coinsEarned;

        state.inventory[itemKey]--;
        if (state.inventory[itemKey] === 0) {
            delete state.inventory[itemKey];
        }

        await savePlayerState(username, state);
        socket.emit('itemSellResult', {
            success: true,
            message: `[MERCHANT] Sold 1x ${item.name} for ${coinsEarned} coins!`,
            state
        });
    });

    socket.on('buyItem', async (data) => {
        if (isRateLimited('buyItem')) return;
        if (activeExplores[username]) {
            socket.emit('itemBuyResult', { success: false, message: "[SYSTEM] You cannot shop while exploring!" });
            return;
        }
        if (activeCombats[username]) {
            socket.emit('itemBuyResult', { success: false, message: "[SYSTEM] You cannot shop while in combat!" });
            return;
        }

        if (pendingEncounters[username]) {
            socket.emit('itemBuyResult', { success: false, message: "[SYSTEM] You must deal with the pending encounter first!" });
            return;
        }

        const { itemKey } = data || {};
        if (typeof itemKey !== 'string') return;

        const state = await getPlayerState(username);
        if (!state) return;

        const item = itemDatabase[itemKey];
        if (!item || item.value <= 0 || item.shopListed === false) {
            socket.emit('itemBuyResult', { success: false, message: "This item is not for sale!" });
            return;
        }

        const buyPrice = item.value || 0;

        if (state.coins < buyPrice) {
            socket.emit('itemBuyResult', { success: false, message: "You do not have enough coins to purchase this item!" });
            return;
        }

        state.coins -= buyPrice;
        if (!state.inventory) state.inventory = {};
        state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;

        await savePlayerState(username, state);
        socket.emit('itemBuyResult', {
            success: true,
            message: `[MERCHANT] Purchased 1x ${item.name} for ${buyPrice} coins!`,
            state
        });
    });

    socket.on('craftItem', async (data) => {
        if (isRateLimited('craftItem')) return;
        if (activeExplores[username]) {
            socket.emit('itemCraftResult', { success: false, message: "[SYSTEM] You cannot craft while exploring!" });
            return;
        }
        if (activeCombats[username]) {
            socket.emit('itemCraftResult', { success: false, message: "[SYSTEM] You cannot craft while in combat!" });
            return;
        }
        if (pendingEncounters[username]) {
            socket.emit('itemCraftResult', { success: false, message: "[SYSTEM] You must deal with the pending encounter first!" });
            return;
        }

        const { itemKey } = data || {};
        if (typeof itemKey !== 'string') return;

        const state = await getPlayerState(username);
        if (!state) return;

        const item = itemDatabase[itemKey];
        if (!item || !item.recipe) {
            socket.emit('itemCraftResult', { success: false, message: "This item cannot be crafted!" });
            return;
        }

        const recipe = item.recipe;
        const ingredients = recipe.ingredients || {};
        const cost = recipe.cost || 0;

        if (cost > 0 && state.coins < cost) {
            socket.emit('itemCraftResult', { success: false, message: "You do not have enough coins to craft this!" });
            return;
        }

        if (!state.inventory) state.inventory = {};
        for (const [ingKey, qtyRequired] of Object.entries(ingredients)) {
            const currentQty = state.inventory[ingKey] || 0;
            if (currentQty < qtyRequired) {
                const ingItem = itemDatabase[ingKey];
                const ingName = ingItem ? ingItem.name : ingKey;
                socket.emit('itemCraftResult', { success: false, message: `You need ${qtyRequired}x ${ingName} but only have ${currentQty}!` });
                return;
            }
        }

        if (cost > 0) {
            state.coins -= cost;
        }
        for (const [ingKey, qtyRequired] of Object.entries(ingredients)) {
            state.inventory[ingKey] -= qtyRequired;
            if (state.inventory[ingKey] <= 0) {
                delete state.inventory[ingKey];
            }
        }

        state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;

        await savePlayerState(username, state);
        socket.emit('itemCraftResult', {
            success: true,
            message: `[CRAFT] Successfully crafted 1x ${item.name}!`,
            state
        });
    });

    socket.on('equipItem', async (data) => {
        if (isRateLimited('equipItem')) return;
        if (activeExplores[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You cannot manage your equipment while exploring!" });
            return;
        }
        if (activeCombats[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You cannot manage your equipment while in combat!" });
            return;
        }

        if (pendingEncounters[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You must deal with the pending encounter first!" });
            return;
        }

        const { itemKey } = data || {};
        if (typeof itemKey !== 'string') return;

        const state = await getPlayerState(username);
        if (!state) return;

        if (!state.inventory || !state.inventory[itemKey] || state.inventory[itemKey] <= 0) {
            socket.emit('equipResult', { success: false, message: "You do not own this item!" });
            return;
        }

        const item = itemDatabase[itemKey];
        if (!item || !EQUIPPABLE_TYPES.includes(item.type)) {
            socket.emit('equipResult', { success: false, message: "This item cannot be equipped!" });
            return;
        }

        const slot = item.type;

        if (!state.equipment) {
            state.equipment = {};
            EQUIPPABLE_TYPES.forEach(t => state.equipment[t] = null);
        }

        let swappedMessage = "";
        if (state.equipment[slot]) {
            const oldItemKey = state.equipment[slot];
            state.inventory[oldItemKey] = (state.inventory[oldItemKey] || 0) + 1;
            const oldItem = itemDatabase[oldItemKey];
            swappedMessage = ` Unequipped ${oldItem ? oldItem.name : oldItemKey}.`;
        }

        state.equipment[slot] = itemKey;
        if (slot === 'avatar') {
            state.sprite = item.sprite;
        }
        state.inventory[itemKey]--;
        if (state.inventory[itemKey] === 0) {
            delete state.inventory[itemKey];
        }

        await savePlayerState(username, state);
        broadcastPlayerList();
        socket.emit('equipResult', {
            success: true,
            message: `[EQUIP] Equipped ${item.name}.${swappedMessage}`,
            state
        });
    });

    socket.on('unequipItem', async (data) => {
        if (isRateLimited('unequipItem')) return;
        if (activeExplores[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You cannot manage your equipment while exploring!" });
            return;
        }
        if (activeCombats[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You cannot manage your equipment while in combat!" });
            return;
        }

        if (pendingEncounters[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You must deal with the pending encounter first!" });
            return;
        }

        const { slot } = data || {};
        if (typeof slot !== 'string' || !EQUIPPABLE_TYPES.includes(slot)) {
            socket.emit('equipResult', { success: false, message: "Invalid equipment slot!" });
            return;
        }

        const state = await getPlayerState(username);
        if (!state) return;

        if (!state.equipment || !state.equipment[slot]) {
            socket.emit('equipResult', { success: false, message: `You do not have any item equipped in the ${slot} slot!` });
            return;
        }

        const itemKey = state.equipment[slot];
        const item = itemDatabase[itemKey];

        state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;
        state.equipment[slot] = null;
        if (slot === 'avatar') {
            state.sprite = 'Avatars/yashinzen_180342.png';
        }

        await savePlayerState(username, state);
        broadcastPlayerList();
        socket.emit('equipResult', {
            success: true,
            message: `[UNEQUIP] Unequipped ${item ? item.name : weaponKey}.`,
            state
        });
    });

    socket.on('equipToBelt', async (data) => {
        if (isRateLimited('equipItem')) return;
        if (activeExplores[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You cannot manage your equipment while exploring!" });
            return;
        }
        if (activeCombats[username] || pendingEncounters[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You cannot manage your equipment while in combat!" });
            return;
        }

        const { itemKey, slotIndex } = data || {};
        if (typeof itemKey !== 'string') return;

        const state = await getPlayerState(username);
        if (!state) return;

        if (!state.inventory || !state.inventory[itemKey] || state.inventory[itemKey] <= 0) {
            socket.emit('equipResult', { success: false, message: "You do not own this item!" });
            return;
        }

        const item = itemDatabase[itemKey];
        if (!item || item.type !== 'consumable') {
            socket.emit('equipResult', { success: false, message: "Only consumables can be added to the belt!" });
            return;
        }

        if (!state.quickBelt) state.quickBelt = [null, null, null];

        if (state.quickBelt.includes(itemKey)) {
            socket.emit('equipResult', { success: false, message: "This item is already on your Quick Belt!" });
            return;
        }

        let targetIndex = slotIndex !== undefined ? slotIndex : state.quickBelt.indexOf(null);
        if (targetIndex === -1) {
            socket.emit('equipResult', { success: false, message: "Quick belt is full! Remove an item first." });
            return;
        }

        state.quickBelt[targetIndex] = itemKey;
        await savePlayerState(username, state);
        broadcastPlayerList();
        socket.emit('equipResult', {
            success: true,
            message: `[BELT] Added ${item.name} to Quick Belt.`,
            state
        });
    });

    socket.on('unequipFromBelt', async (data) => {
        if (isRateLimited('unequipItem')) return;
        if (activeExplores[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You cannot manage your equipment while exploring!" });
            return;
        }
        if (activeCombats[username] || pendingEncounters[username]) {
            socket.emit('equipResult', { success: false, message: "[SYSTEM] You cannot manage your equipment while in combat!" });
            return;
        }

        const { slotIndex } = data || {};
        if (typeof slotIndex !== 'number' || slotIndex < 0 || slotIndex >= 3) return;

        const state = await getPlayerState(username);
        if (!state) return;

        if (!state.quickBelt || !state.quickBelt[slotIndex]) {
            return;
        }

        const itemKey = state.quickBelt[slotIndex];
        const item = itemDatabase[itemKey];
        state.quickBelt[slotIndex] = null;

        await savePlayerState(username, state);
        broadcastPlayerList();
        socket.emit('equipResult', {
            success: true,
            message: `[BELT] Removed ${item ? item.name : 'item'} from Quick Belt.`,
            state
        });
    });

    socket.on('disconnect', async () => {
        delete activeUsers[socket.id];
        io.emit('update-player-list', buildPlayerListPayload());

        // Handle party leave on disconnect if in lobby state
        const lobbyCode = playerPartyMap[username];
        if (lobbyCode) {
            const party = activeParties[lobbyCode];
            if (party && party.state === 'lobby') {
                party.members = party.members.filter(m => m !== username);
                delete playerPartyMap[username];
                if (party.members.length === 0) {
                    delete activeParties[lobbyCode];
                } else {
                    if (party.leader === username) {
                        party.leader = party.members[0];
                    }
                    broadcastPartyUpdate(lobbyCode);
                }
            }
        }

        // Clear active exploration timer if any
        const exploreRecord = activeExplores[username];
        if (exploreRecord && exploreRecord.timerId) {
            clearTimeout(exploreRecord.timerId);
        }
        delete activeExplores[username];

        await forceSavePlayer(username);
        const stillOnline = Object.values(activeUsers).includes(username);
        if (!stillOnline) {
            delete playerCache[username];
        }
    });
});

async function migrateDatabaseKeys() {
    console.log("[Migration] Starting database key renaming migration...");
    const ITEM_KEY_MAPPING = {
        "matcha_leaves": "green_tea_leaves",
        "persimmons": "wild_fruit",
        "lotus_root": "wild_root",
        "matcha_tea": "energy_tea",
        "rice_ball": "rice_bowl",
        "kappa_shell": "water_shell",
        "tengu_feather": "wind_feather",
        "oni_horn": "demon_horn",
        "training_sword": "wooden_sword",
        "steel_katana": "steel_sword",
        "bamboo_staff": "wooden_staff",
        "tachi": "refined_blade",
        "rusted_tachi": "rusted_blade",
        "shinobi_kodachi": "agile_dagger",
        "oni_club": "iron_club",
        "samurai_armor": "iron_plate_armor",
        "amulet": "lucky_amulet"
    };

    function migrateInventory(inventory) {
        if (!inventory || typeof inventory !== 'object') return inventory;
        const newInv = {};
        for (const [key, qty] of Object.entries(inventory)) {
            const mappedKey = ITEM_KEY_MAPPING[key] || key;
            newInv[mappedKey] = (newInv[mappedKey] || 0) + qty;
        }
        return newInv;
    }

    function migrateEquipment(equipment) {
        if (!equipment || typeof equipment !== 'object') return equipment;
        const newEquip = {};
        for (const [slot, key] of Object.entries(equipment)) {
            newEquip[slot] = (key && ITEM_KEY_MAPPING[key]) ? ITEM_KEY_MAPPING[key] : key;
        }
        return newEquip;
    }

    // 1. Migrate items.json
    try {
        const rawItems = await fs.readFile(ITEMS_FILE, 'utf8');
        const items = JSON.parse(rawItems);
        let itemsChanged = false;
        const newItems = {};
        for (const [key, val] of Object.entries(items)) {
            const mappedKey = ITEM_KEY_MAPPING[key];
            if (mappedKey) {
                newItems[mappedKey] = val;
                itemsChanged = true;
            } else {
                newItems[key] = val;
            }
        }
        if (itemsChanged) {
            await fs.writeFile(ITEMS_FILE, JSON.stringify(newItems, null, 2), 'utf8');
            itemDatabase = newItems;
            console.log("[Migration] Successfully migrated items.json keys on disk!");
        }
    } catch (err) {
        console.error("[Migration] Error migrating items.json:", err.message);
    }

    // 2. Migrate yokai.json
    try {
        const rawYokai = await fs.readFile(YOKAI_FILE, 'utf8');
        const yokai = JSON.parse(rawYokai);
        let yokaiChanged = false;
        for (const [key, val] of Object.entries(yokai)) {
            if (val.loot && val.loot.guaranteed) {
                const mappedLoot = ITEM_KEY_MAPPING[val.loot.guaranteed];
                if (mappedLoot) {
                    val.loot.guaranteed = mappedLoot;
                    yokaiChanged = true;
                }
            }
        }
        if (yokaiChanged) {
            await fs.writeFile(YOKAI_FILE, JSON.stringify(yokai, null, 2), 'utf8');
            yokaiPool = yokai;
            console.log("[Migration] Successfully migrated yokai.json loot keys on disk!");
        }
    } catch (err) {
        console.error("[Migration] Error migrating yokai.json:", err.message);
    }

    // 3. Migrate actions.json
    try {
        const rawActions = await fs.readFile(ACTIONS_FILE, 'utf8');
        const actions = JSON.parse(rawActions);
        let actionsChanged = false;

        if (actions.startingState) {
            if (actions.startingState.inventory) {
                actions.startingState.inventory = migrateInventory(actions.startingState.inventory);
                actionsChanged = true;
            }
            if (actions.startingState.equipment) {
                actions.startingState.equipment = migrateEquipment(actions.startingState.equipment);
                actionsChanged = true;
            }
        }

        if (actions.combat && Array.isArray(actions.combat.bonusLootPool)) {
            actions.combat.bonusLootPool = actions.combat.bonusLootPool.map(k => ITEM_KEY_MAPPING[k] || k);
            actionsChanged = true;
        }

        if (actions.explore) {
            if (actions.explore.legendaryEvents) {
                const sm = actions.explore.legendaryEvents.sword_master;
                if (sm && Array.isArray(sm.weaponPool)) {
                    sm.weaponPool = sm.weaponPool.map(k => ITEM_KEY_MAPPING[k] || k);
                    actionsChanged = true;
                }
                const ls = actions.explore.legendaryEvents.legendary_shrine;
                if (ls && Array.isArray(ls.consumablePool)) {
                    ls.consumablePool = ls.consumablePool.map(k => ITEM_KEY_MAPPING[k] || k);
                    actionsChanged = true;
                }
            }
            if (actions.explore.foragePool) {
                if (Array.isArray(actions.explore.foragePool.material)) {
                    actions.explore.foragePool.material = actions.explore.foragePool.material.map(k => ITEM_KEY_MAPPING[k] || k);
                    actionsChanged = true;
                }
                if (Array.isArray(actions.explore.foragePool.consumable)) {
                    actions.explore.foragePool.consumable = actions.explore.foragePool.consumable.map(k => ITEM_KEY_MAPPING[k] || k);
                    actionsChanged = true;
                }
            }
        }

        if (actionsChanged) {
            await fs.writeFile(ACTIONS_FILE, JSON.stringify(actions, null, 2), 'utf8');
            actionDatabase = actions;
            console.log("[Migration] Successfully migrated actions.json keys on disk!");
        }
    } catch (err) {
        console.error("[Migration] Error migrating actions.json:", err.message);
    }

    // 4. Migrate SQLite player saves
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all("SELECT username, state FROM saves", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        if (rows.length > 0) {
            console.log(`[Migration] Scanning ${rows.length} player save states...`);
            let updatedCount = 0;

            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    const stmt = db.prepare("UPDATE saves SET state = ? WHERE username = ?");

                    for (const row of rows) {
                        try {
                            const state = JSON.parse(row.state);
                            let saveChanged = false;

                            if (state.inventory) {
                                const oldKeys = Object.keys(state.inventory);
                                const hasOldKeys = oldKeys.some(k => ITEM_KEY_MAPPING[k]);
                                if (hasOldKeys) {
                                    state.inventory = migrateInventory(state.inventory);
                                    saveChanged = true;
                                }
                            }

                            if (state.equipment) {
                                const oldVals = Object.values(state.equipment);
                                const hasOldVals = oldVals.some(v => ITEM_KEY_MAPPING[v]);
                                if (hasOldVals) {
                                    state.equipment = migrateEquipment(state.equipment);
                                    saveChanged = true;
                                }
                            }

                            if (saveChanged) {
                                stmt.run(JSON.stringify(state), row.username);
                                updatedCount++;
                                delete playerCache[row.username];
                            }
                        } catch (parseErr) {
                            console.error(`[Migration] Failed to parse state for user ${row.username}:`, parseErr.message);
                        }
                    }

                    stmt.finalize();
                    db.run("COMMIT", (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
            if (updatedCount > 0) {
                console.log(`[Migration] Migrated ${updatedCount} SQLite player saves successfully!`);
            } else {
                console.log("[Migration] No player saves required key translation.");
            }
        }
    } catch (dbErr) {
        console.error("[Migration] Error migrating SQLite saves:", dbErr.message);
    }
}

async function renameLegacySprites() {
    const spritesDir = path.join(__dirname, 'public', 'sprites');
    const fileMapping = {
        'bamboo_staff.png': 'wooden_staff.png',
        'bokken_training_sword.png': 'wooden_sword.png',
        'brewed_matcha_tea.png': 'energy_tea.png',
        'muramasa_katana.png': 'steel_sword.png',
        'omamori_amulet.png': 'lucky_amulet.png',
        'oni_club.png': 'iron_club.png',
        'rusted_tachi.png': 'rusted_blade.png',
        'samurai_yoroi.png': 'iron_plate_armor.png'
    };

    for (const [oldName, newName] of Object.entries(fileMapping)) {
        const oldPath = path.join(spritesDir, oldName);
        const newPath = path.join(spritesDir, newName);
        try {
            await fs.access(oldPath);
            await fs.rename(oldPath, newPath);
            console.log(`[Sprites] Automatically renamed legacy sprite: ${oldName} -> ${newName}`);
        } catch (err) {
            // Ignore if file doesn't exist
        }
    }
}

loadGameDatabase().then(() => {
    return initDatabase();
}).then(async () => {
    await migrateDatabaseKeys();
    await renameLegacySprites();
    startPassiveRegenLoop();
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}).catch(err => {
    console.error("Critical server boot failure:", err);
});
