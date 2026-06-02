const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

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

const DEFAULT_ITEMS = {
  "matcha_leaves": {
    "name": "Matcha Leaves",
    "desc": "Fresh green leaves. Highly demanded by tea masters.",
    "value": 5,
    "type": "material",
    "rarity": "common"
  },
  "bamboo_shoots": {
    "name": "Bamboo Shoots",
    "desc": "Crisp and edible. A common forest ingredient.",
    "value": 5,
    "type": "material",
    "rarity": "common"
  },
  "persimmons": {
    "name": "Persimmon",
    "desc": "Sweet forest fruit.",
    "value": 5,
    "type": "material",
    "rarity": "common"
  },
  "lotus_root": {
    "name": "Wild Lotus Root",
    "desc": "A crunchy root foraged from muddy ponds.",
    "value": 8,
    "type": "material",
    "rarity": "uncommon"
  },
  "healing_herbs": {
    "name": "Healing Herbs",
    "desc": "Restores 15 HP.",
    "value": 4,
    "type": "consumable",
    "rarity": "common",
    "effects": {
      "hpRestore": 15
    }
  },
  "matcha_tea": {
    "name": "Brewed Matcha Tea",
    "desc": "Restores 25 Stamina.",
    "value": 6,
    "type": "consumable",
    "rarity": "common",
    "effects": {
      "staminaRestore": 25
    }
  },
  "rice_ball": {
    "name": "Onigiri (Rice Ball)",
    "desc": "Savory meal. Restores 30 HP and 15 Stamina.",
    "value": 10,
    "type": "consumable",
    "rarity": "uncommon",
    "effects": {
      "hpRestore": 30,
      "staminaRestore": 15
    }
  },
  "kappa_shell": {
    "name": "Kappa Shell",
    "desc": "A smooth water-resistant shell from a Kappa.",
    "value": 20,
    "type": "material",
    "rarity": "rare"
  },
  "tengu_feather": {
    "name": "Tengu Feather",
    "desc": "A glossy dark feather carrying currents of wind.",
    "value": 35,
    "type": "material",
    "rarity": "rare"
  },
  "oni_horn": {
    "name": "Oni Horn",
    "desc": "A heavy, dark crimson horn vibrating with demonic power.",
    "value": 50,
    "type": "material",
    "rarity": "epic"
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
      "guaranteed": "kappa_shell",
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
      "guaranteed": "tengu_feather",
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
      "guaranteed": "rice_ball",
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
      "guaranteed": "oni_horn",
      "bonusChance": 0.35
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
    "inventory": {}
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
    "bonusLootPool": ["healing_herbs", "matcha_tea", "rice_ball"],
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
    "forageXpMin": 12,
    "forageXpMax": 20,
    "forageCoinsMin": 2,
    "forageCoinsMax": 6,
    "foragePool": {
      "material": ["matcha_leaves", "bamboo_shoots", "persimmons", "lotus_root"],
      "consumable": ["healing_herbs", "matcha_tea"],
      "materialChance": 0.8
    },
    "shrineStaminaMin": 20,
    "shrineStaminaMax": 40,
    "shrineXpReward": 10,
    "springHealthMin": 20,
    "springHealthMax": 40
  }
};

let itemDatabase = {};
let yokaiPool = {};
let actionDatabase = {};

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

        console.log("[Game Database] Successfully loaded items, Yokai, and actions!");
    } catch (err) {
        console.error("[Game Database] Boot Error:", err);
    }
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

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

// Helper functions
async function getUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

async function saveUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

const playerCache = {};
const dirtyPlayers = new Set();

async function getPlayerState(username) {
    if (playerCache[username]) {
        return playerCache[username];
    }
    try {
        const data = await fs.readFile(path.join(SAVES_DIR, `${username}.json`), 'utf8');
        const state = JSON.parse(data);
        // Backward compatibility fallback for new stats
        if (state.stamina === undefined) state.stamina = 100;
        if (state.maxStamina === undefined) state.maxStamina = 100;
        if (state.stats && state.stats.maxHealth === undefined) {
            state.stats.maxHealth = state.stats.health || 50;
        }
        playerCache[username] = state;
        return state;
    } catch (err) {
        return null;
    }
}

async function savePlayerState(username, state) {
    playerCache[username] = state;
    dirtyPlayers.add(username);
}

function getInitialPlayerState() {
    const defaultState = actionDatabase.startingState || {
        level: 1,
        experience: 0,
        experienceNeeded: 100,
        coins: 0,
        stamina: 100,
        maxStamina: 100,
        stats: { health: 50, maxHealth: 50, attack: 5, defense: 5 },
        inventory: {}
    };
    return JSON.parse(JSON.stringify(defaultState)); // Deep copy
}

async function forceSavePlayer(username) {
    if (activeCombats[username]) {
        if (activeCombats[username].timerId) {
            clearInterval(activeCombats[username].timerId);
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
                await fs.writeFile(path.join(SAVES_DIR, `${username}.json`), JSON.stringify(state, null, 2));
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
                await fs.writeFile(path.join(SAVES_DIR, `${username}.json`), JSON.stringify(state, null, 2));
            } catch (err) {
                console.error(`[Autosave Error] Failed to save ${username}:`, err);
                dirtyPlayers.add(username);
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
    res.json({ success: true, username: lowerUsername });
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
        res.json({ authenticated: true, username: req.session.username, state });
    } else {
        res.json({ authenticated: false });
    }
});

// Multiplayer / Gameplay Logic
const activeUsers = {};
const activeCombats = {};
const pendingEncounters = {};
const lastExploreTime = {};


async function handleCombatVictory(username, socket, combat, state) {
    if (combat.timerId) {
        clearInterval(combat.timerId);
    }
    
    const xpGain = combat.yokai.xpReward;
    const coinsGain = combat.yokai.coinReward;
    
    state.experience += xpGain;
    state.coins += coinsGain;
    
    // Award loot drops
    if (!state.inventory) state.inventory = {};
    let lootMessage = "";
    
    const yokaiKey = combat.yokai.key;
    const yokaiDbEntry = yokaiPool[yokaiKey];
    const guaranteedItem = yokaiDbEntry?.loot?.guaranteed;
    
    if (guaranteedItem && itemDatabase[guaranteedItem]) {
        state.inventory[guaranteedItem] = (state.inventory[guaranteedItem] || 0) + 1;
        lootMessage += ` Spoils: Obtained 1x ${itemDatabase[guaranteedItem].name}.`;
    }
    
    // Rare bonus drop (read bonusChance and loot pool dynamically)
    const combConfig = actionDatabase.combat || { bonusLootChance: 0.35, bonusLootPool: ["healing_herbs", "matcha_tea", "rice_ball"] };
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
    
    socket.emit('combatEnd', {
        success: true,
        message: `[VICTORY] You defeated the wild ${combat.yokai.name}! Gained ${xpGain} XP and ${coinsGain} coins.${lootMessage}`,
        state,
        leveledUp
    });
}

function startMonsterAttackLoop(username, socket) {
    const combat = activeCombats[username];
    if (!combat) return;
    
    if (combat.timerId) {
        clearInterval(combat.timerId);
    }
    
    combat.timerId = setInterval(async () => {
        const liveCombat = activeCombats[username];
        if (!liveCombat) {
            clearInterval(combat.timerId);
            return;
        }
        
        const state = await getPlayerState(username);
        if (!state) {
            delete activeCombats[username];
            clearInterval(combat.timerId);
            return;
        }
        
        let damage = liveCombat.yokai.attack;
        let eventType = "hit";
        let counterDamage = 0;
        
        const combConfig = actionDatabase.combat || { defenseMitigationFactor: 2.0 };
        const defFactor = combConfig.defenseMitigationFactor || 2.0;
        const defBonus = Math.floor((state.stats.defense || 5) / defFactor);
        const normalDamage = Math.max(1, damage - defBonus);
        
        const parryConfig = actionDatabase.parry;
        
        if (liveCombat.lastParryTime) {
            const msSinceParry = Date.now() - liveCombat.lastParryTime;
            
            if (msSinceParry <= parryConfig.perfectWindow) {
                // Perfect Parry: Block & counter-attack!
                damage = Math.max(1, Math.floor(normalDamage * parryConfig.perfectMitigation));
                eventType = "perfect_parry";
                
                const playerAtk = state.stats.attack || 5;
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
            clearInterval(liveCombat.timerId);
            
            const defConfig = actionDatabase.combatDefeat || { minCoinsLost: 5, maxCoinsLost: 15, healthRestore: 10, staminaRestorePercent: 0.2 };
            const range = defConfig.maxCoinsLost - defConfig.minCoinsLost + 1;
            const coinsLost = Math.min(state.coins, Math.floor(Math.random() * range) + defConfig.minCoinsLost);
            
            state.coins -= coinsLost;
            state.stats.health = defConfig.healthRestore;
            state.stamina = Math.floor(state.maxStamina * defConfig.staminaRestorePercent);
            
            delete activeCombats[username];
            await savePlayerState(username, state);
            
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
                state
            });
            await handleCombatVictory(username, socket, liveCombat, state);
        } else {
            await savePlayerState(username, state);
            socket.emit('combatMonsterAttack', {
                damage,
                eventType,
                counterDamage,
                yokaiHp: liveCombat.yokai.hp,
                state
            });
        }
    }, combat.yokai.speed);
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
    
    // Send Game Database configs to client dynamically
    socket.emit('gameDatabase', { items: itemDatabase, actions: actionDatabase, yokai: yokaiPool });
    
    // Broadcast updated player list
    io.emit('update-player-list', Array.from(new Set(Object.values(activeUsers))));
    
    socket.on('chatMessage', (message) => {
        if (typeof message !== 'string') return;
        const trimmed = message.trim();
        if (!trimmed || trimmed.length > 200) return;
        io.emit('chatMessage', { user: username, message: trimmed });
    });
    
    socket.on('explore', async () => {
        const expConfig = actionDatabase.explore;
        const now = Date.now();
        if (now - (lastExploreTime[username] || 0) < expConfig.cooldown) {
            socket.emit('exploreResult', {
                success: false,
                message: "Slow down! You are exploring too quickly."
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
        
        lastExploreTime[username] = now;
        
        const state = await getPlayerState(username);
        if (!state) return;
        
        const staminaCost = expConfig.staminaCost;
        if (state.stamina < staminaCost) {
            socket.emit('exploreResult', {
                success: false,
                message: "[EXHAUSTED] You are too exhausted to explore. Rest at the Inn or wait for your Stamina to recover!"
            });
            return;
        }
        
        state.stamina -= staminaCost;
        
        // Draw from random event
        const rand = Math.random();
        let gainedXP = 0;
        let gainedCoins = 0;
        let healthLoss = 0;
        let staminaGain = 0;
        let healthGain = 0;
        let eventMessage = "";
        let leveledUp = false;
        
        const yokaiThreshold = expConfig.encounterChance;
        const forageThreshold = yokaiThreshold + expConfig.forageChance;
        const shrineThreshold = forageThreshold + expConfig.shrineChance;
        
        if (rand < yokaiThreshold) {
            // Encounter Yokai (Combat) - Open Confirmation Screen first!
            const yokaiKeys = Object.keys(yokaiPool);
            const key = yokaiKeys[Math.floor(Math.random() * yokaiKeys.length)];
            const template = yokaiPool[key];
            
            pendingEncounters[username] = key;
            
            await savePlayerState(username, state);
            
            socket.emit('combatEncounter', {
                yokai: {
                    name: template.name,
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
            
            // Find all items in items.json matching this rarity
            let itemsInTier = Object.keys(itemDatabase).filter(k => (itemDatabase[k].rarity || "common") === rolledRarity);
            // Fallback if no items configured in this tier
            if (itemsInTier.length === 0) {
                itemsInTier = Object.keys(itemDatabase).filter(k => (itemDatabase[k].rarity || "common") === "common");
            }
            const itemKey = itemsInTier[Math.floor(Math.random() * itemsInTier.length)];
            
            if (!state.inventory) state.inventory = {};
            state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;
            
            const itemDetails = itemDatabase[itemKey];
            const rarityBadge = `[${rolledRarity.toUpperCase()}]`;
            eventMessage = `[FORAGE] You foraged in the bamboo groves and harvested ${rarityBadge} ${itemDetails.name}. (+${gainedXP} XP, +${gainedCoins} coins)`;
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
        
        // Level up checks
        const lvlConfig = actionDatabase.leveling || { xpMultiplier: 1.5, maxHealthIncrease: 10, attackIncrease: 2, defenseIncrease: 2 };
        while (state.experience >= state.experienceNeeded) {
            state.experience -= state.experienceNeeded;
            state.level++;
            state.experienceNeeded = Math.floor(state.experienceNeeded * lvlConfig.xpMultiplier);
            state.stats.maxHealth = (state.stats.maxHealth || 50) + lvlConfig.maxHealthIncrease;
            state.stats.health = state.stats.maxHealth; // Full heal
            state.stats.attack += lvlConfig.attackIncrease;
            state.stats.defense += lvlConfig.defenseIncrease;
            leveledUp = true;
        }
        
        await savePlayerState(username, state);
        
        socket.emit('exploreResult', {
            success: true,
            message: eventMessage,
            state,
            leveledUp
        });
    });
    
    socket.on('combatAction', async (data) => {
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
        
        if (action === 'strike') {
            const strikeConfig = actionDatabase.strike;
            if (now - (combat.lastStrikeTime || 0) < strikeConfig.cooldown) return;
            combat.lastStrikeTime = now;
            
            const baseDmg = state.stats.attack || 5;
            const variance = Math.floor(Math.random() * strikeConfig.damageVariance) + 1;
            let dmgDealt = baseDmg + variance - Math.floor(combat.yokai.defense / 2);
            dmgDealt = Math.max(strikeConfig.baseMinDamage, dmgDealt);
            
            combat.yokai.hp = Math.max(0, combat.yokai.hp - dmgDealt);
            
            if (combat.yokai.hp <= 0) {
                await handleCombatVictory(username, socket, combat, state);
            } else {
                socket.emit('combatPlayerHit', {
                    damageDealt: dmgDealt,
                    yokaiHp: combat.yokai.hp,
                    state
                });
            }
        } else if (action === 'parry') {
            const parryConfig = actionDatabase.parry;
            if (now - (combat.lastParryActionTime || 0) < parryConfig.cooldown) {
                socket.emit('combatFeedback', { message: "Parry is on cooldown!" });
                return;
            }
            combat.lastParryActionTime = now;
            combat.lastParryTime = now;
            socket.emit('combatFeedback', { message: "You raised your guard!" });
        } else if (action === 'flee') {
            const fleeConfig = actionDatabase.flee;
            const escapeStamina = fleeConfig.staminaCost;
            if (state.stamina < escapeStamina) {
                socket.emit('combatFeedback', { message: `Not enough stamina to escape (needs ${escapeStamina})!` });
                return;
            }
            
            state.stamina -= escapeStamina;
            const success = Math.random() < fleeConfig.successRate;
            
            if (success) {
                if (combat.timerId) {
                    clearInterval(combat.timerId);
                }
                delete activeCombats[username];
                await savePlayerState(username, state);
                
                socket.emit('combatEnd', {
                    success: false,
                    escaped: true,
                    message: "[ESCAPE] You managed to escape the Yokai and fled back to the safety of the path.",
                    state
                });
            } else {
                await savePlayerState(username, state);
                socket.emit('combatFeedback', { 
                    message: "Escape failed! The Yokai blocks your exit.",
                    state
                });
            }
        }
    });
    
    socket.on('combatConfirm', async (data) => {
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
            
            const combatInstance = {
                yokai: {
                    key: pendingKey,
                    name: template.name,
                    hp: template.hp,
                    maxHp: template.maxHp,
                    attack: template.attack,
                    defense: template.defense,
                    speed: template.speed,
                    xpReward: template.xpReward,
                    coinReward: template.coinReward
                },
                playerUsername: username,
                lastMonsterAttack: Date.now(),
                parryActive: false,
                timerId: null
            };
            
            activeCombats[username] = combatInstance;
            delete pendingEncounters[username];
            
            await savePlayerState(username, state);
            startMonsterAttackLoop(username, socket);
            
            socket.emit('combatStart', {
                yokai: combatInstance.yokai,
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
            
            socket.emit('combatSneakResult', {
                success: true,
                message: `[SYSTEM] You successfully avoided the ${name} and slipped back onto the main trail. (-${escapeCost} Stamina)`,
                state
            });
        }
    });
    
    socket.on('rest', async () => {
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
        const cost = restConfig.coinCost;
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
    
    socket.on('useItem', async (data) => {
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
            if (state.stats.health >= maxHP) {
                socket.emit('itemUseResult', { success: false, message: "Your Health is already full!" });
                return;
            }
            state.stats.health = Math.min(maxHP, state.stats.health + hpRestore);
            recoveryMessage += ` Restored ${hpRestore} Health.`;
            used = true;
        }
        
        const staminaRestore = item.effects?.staminaRestore;
        if (staminaRestore) {
            const maxStam = state.maxStamina || 100;
            if (state.stamina >= maxStam) {
                socket.emit('itemUseResult', { success: false, message: "Your Stamina is already full!" });
                return;
            }
            state.stamina = Math.min(maxStam, state.stamina + staminaRestore);
            recoveryMessage += ` Restored ${staminaRestore} Stamina.`;
            used = true;
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
        
        const baseValue = item.value || 0;
        const rarSettings = actionDatabase.raritySettings || { valueMultipliers: { common: 1.0, uncommon: 1.5, rare: 2.5, epic: 4.0 } };
        const mult = rarSettings.valueMultipliers[item.rarity || "common"] || 1.0;
        const coinsEarned = Math.floor(baseValue * mult);
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
    
    socket.on('disconnect', async () => {
        delete activeUsers[socket.id];
        io.emit('update-player-list', Array.from(new Set(Object.values(activeUsers))));
        
        await forceSavePlayer(username);
        const stillOnline = Object.values(activeUsers).includes(username);
        if (!stillOnline) {
            delete playerCache[username];
        }
    });
});

loadGameDatabase().then(() => {
    startPassiveRegenLoop();
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
});
