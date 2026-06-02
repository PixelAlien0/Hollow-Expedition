const socket = io({ autoConnect: false });
let gameDb = null;

let inventoryCategory = 'all';
let inventoryPage = 1;
const ITEMS_PER_PAGE = 4;

// DOM Elements
const containers = {
    auth: document.getElementById('auth-container'),
    game: document.getElementById('game-container')
};

const authForm = {
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn'),
    error: document.getElementById('auth-error')
};

const ui = {
    level: document.getElementById('ui-level'),
    xp: document.getElementById('ui-xp'),
    xpNeeded: document.getElementById('ui-xp-needed'),
    xpFill: document.getElementById('ui-xp-fill'),
    stamina: document.getElementById('ui-stamina'),
    staminaMax: document.getElementById('ui-stamina-max'),
    staminaFill: document.getElementById('ui-stamina-fill'),
    coins: document.getElementById('ui-coins'),
    health: document.getElementById('ui-health'),
    healthMax: document.getElementById('ui-health-max'),
    attack: document.getElementById('ui-attack'),
    defense: document.getElementById('ui-defense'),
    logoutBtn: document.getElementById('logout-btn'),
    exploreBtn: document.getElementById('explore-btn'),
    restBtn: document.getElementById('rest-btn'),
    exploreProgressContainer: document.getElementById('explore-progress-container'),
    exploreProgressFill: document.getElementById('explore-progress-fill'),
    exploreStatus: document.getElementById('explore-status'),
    actionLog: document.getElementById('action-log'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendChatBtn: document.getElementById('send-chat-btn'),
    onlinePlayers: document.getElementById('online-players'),
    navActivity: document.getElementById('nav-activity'),
    navPlayers: document.getElementById('nav-players'),
    navInventory: document.getElementById('nav-inventory'),
    viewActivity: document.getElementById('view-activity'),
    viewPlayers: document.getElementById('view-players'),
    viewInventory: document.getElementById('view-inventory'),
    inventoryList: document.getElementById('inventory-list'),
    viewCombat: document.getElementById('view-combat'),
    combatYokaiName: document.getElementById('combat-yokai-name'),
    combatYokaiCard: document.getElementById('combat-yokai-card'),
    combatYokaiHp: document.getElementById('combat-yokai-hp'),
    combatYokaiHpMax: document.getElementById('combat-yokai-hp-max'),
    combatYokaiHpFill: document.getElementById('combat-yokai-hp-fill'),
    combatYokaiAtkFill: document.getElementById('combat-yokai-atk-fill'),
    combatBtnStrike: document.getElementById('combat-btn-strike'),
    combatBtnParry: document.getElementById('combat-btn-parry'),
    combatBtnFlee: document.getElementById('combat-btn-flee'),
    combatFeedback: document.getElementById('combat-feedback'),
    combatLog: document.getElementById('combat-log'),
    encounterPrompt: document.getElementById('encounter-prompt'),
    encounterText: document.getElementById('encounter-text'),
    encounterBtnFight: document.getElementById('encounter-btn-fight'),
    encounterBtnSneak: document.getElementById('encounter-btn-sneak'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    invFilterAll: document.getElementById('inv-filter-all'),
    invFilterConsumable: document.getElementById('inv-filter-consumable'),
    invFilterMaterial: document.getElementById('inv-filter-material'),
    invPrevPage: document.getElementById('inv-prev-page'),
    invNextPage: document.getElementById('inv-next-page'),
    invPageIndicator: document.getElementById('inv-page-indicator')
};

// Container switching
function showContainer(name) {
    Object.values(containers).forEach(c => c.classList.remove('active'));
    containers[name].classList.add('active');
}

// View switching
function switchView(viewName) {
    ui.viewActivity.classList.remove('active');
    ui.viewPlayers.classList.remove('active');
    ui.viewCombat.classList.remove('active');
    ui.viewInventory.classList.remove('active');
    
    ui.navActivity.classList.remove('active');
    ui.navPlayers.classList.remove('active');
    ui.navInventory.classList.remove('active');
    
    if (viewName === 'activity') {
        ui.viewActivity.classList.add('active');
        ui.navActivity.classList.add('active');
    } else if (viewName === 'players') {
        ui.viewPlayers.classList.add('active');
        ui.navPlayers.classList.add('active');
    } else if (viewName === 'combat') {
        ui.viewCombat.classList.add('active');
    } else if (viewName === 'inventory') {
        ui.viewInventory.classList.add('active');
        ui.navInventory.classList.add('active');
        renderInventory();
    }
}

ui.navActivity.addEventListener('click', () => switchView('activity'));
ui.navPlayers.addEventListener('click', () => switchView('players'));
ui.navInventory.addEventListener('click', () => switchView('inventory'));

function logAction(message) {
    const li = document.createElement('li');
    li.textContent = message;
    ui.actionLog.appendChild(li);
    ui.actionLog.scrollTop = ui.actionLog.scrollHeight;
}

function renderInventory() {
    ui.inventoryList.innerHTML = '';
    
    if (!lastState || !lastState.inventory || Object.keys(lastState.inventory).length === 0) {
        ui.inventoryList.innerHTML = `<li class="empty-inventory">Your inventory is empty. Explore the wilds or defeat Yokai to find items!</li>`;
        updatePaginationUI(0);
        return;
    }
    
    if (!gameDb || !gameDb.items) {
        ui.inventoryList.innerHTML = `<li class="empty-inventory">Loading game items...</li>`;
        updatePaginationUI(0);
        return;
    }
    
    const allEntries = Object.entries(lastState.inventory).filter(([itemKey, quantity]) => {
        const item = gameDb.items[itemKey];
        if (!item) return false;
        if (inventoryCategory === 'all') return true;
        return item.type === inventoryCategory;
    });
    
    const totalItems = allEntries.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    
    // Clamp inventoryPage to valid range
    if (inventoryPage > totalPages) inventoryPage = totalPages;
    if (inventoryPage < 1) inventoryPage = 1;
    
    updatePaginationUI(totalPages);
    
    if (totalItems === 0) {
        ui.inventoryList.innerHTML = `<li class="empty-inventory">No ${inventoryCategory === 'all' ? '' : inventoryCategory + ' '}items in your inventory.</li>`;
        return;
    }
    
    const startIndex = (inventoryPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const paginatedEntries = allEntries.slice(startIndex, endIndex);
    
    for (const [itemKey, quantity] of paginatedEntries) {
        const item = gameDb.items[itemKey];
        if (!item) continue;
        
        const rarity = item.rarity || "common";
        
        const li = document.createElement('li');
        li.className = `inventory-item item-rarity-${rarity}`;
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'item-info';
        
        const nameQtyDiv = document.createElement('div');
        nameQtyDiv.className = 'item-name-qty';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = item.name;
        
        const badgeSpan = document.createElement('span');
        badgeSpan.className = `rarity-badge badge-${rarity}`;
        badgeSpan.textContent = rarity.toUpperCase();
        
        const qtySpan = document.createElement('span');
        qtySpan.className = 'item-qty';
        qtySpan.textContent = `x${quantity}`;
        
        nameQtyDiv.appendChild(nameSpan);
        nameQtyDiv.appendChild(badgeSpan);
        nameQtyDiv.appendChild(qtySpan);
        
        const descP = document.createElement('p');
        descP.className = 'item-desc';
        descP.textContent = item.desc;
        
        infoDiv.appendChild(nameQtyDiv);
        infoDiv.appendChild(descP);
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';
        
        if (item.type === "consumable") {
            const useBtn = document.createElement('button');
            useBtn.className = 'secondary-btn item-action-btn';
            useBtn.textContent = 'Use';
            useBtn.title = `Consume this item to restore stats`;
            useBtn.addEventListener('click', () => {
                socket.emit('useItem', { itemKey });
            });
            actionsDiv.appendChild(useBtn);
        }
        
        const baseValue = item.value || 0;
        const multipliers = (gameDb && gameDb.actions && gameDb.actions.raritySettings) ? gameDb.actions.raritySettings.valueMultipliers : { common: 1.0, uncommon: 1.5, rare: 2.5, epic: 4.0 };
        const mult = multipliers[rarity] || 1.0;
        const finalSellValue = Math.floor(baseValue * mult);
        
        const sellBtn = document.createElement('button');
        sellBtn.className = 'nav-btn danger item-action-btn';
        sellBtn.textContent = `Sell (${finalSellValue}c)`;
        sellBtn.title = `Sell this item to the village merchant for ${finalSellValue} coins`;
        sellBtn.addEventListener('click', () => {
            socket.emit('sellItem', { itemKey });
        });
        actionsDiv.appendChild(sellBtn);
        
        li.appendChild(infoDiv);
        li.appendChild(actionsDiv);
        ui.inventoryList.appendChild(li);
    }
}

function updatePaginationUI(totalPages) {
    if (!ui.invPrevPage || !ui.invNextPage || !ui.invPageIndicator) return;
    
    if (totalPages <= 0) {
        ui.invPrevPage.disabled = true;
        ui.invNextPage.disabled = true;
        ui.invPageIndicator.textContent = `Page 1 of 1`;
        return;
    }
    ui.invPrevPage.disabled = inventoryPage === 1;
    ui.invNextPage.disabled = inventoryPage === totalPages;
    ui.invPageIndicator.textContent = `Page ${inventoryPage} of ${totalPages}`;
}

let lastState = null;

function flashElement(element) {
    if (!element) return;
    element.classList.remove('flash-update');
    void element.offsetWidth; // Trigger reflow
    element.classList.add('flash-update');
    setTimeout(() => {
        element.classList.remove('flash-update');
    }, 600);
}

function updateStatsDisplay(state) {
    if (!state) return;
    
    // Check differences and flash elements for dynamic feedback
    if (lastState) {
        if (state.level > lastState.level) flashElement(ui.level.parentElement);
        if (state.experience > lastState.experience) flashElement(ui.xp.parentElement.parentElement);
        if (state.stamina !== lastState.stamina) flashElement(ui.stamina.parentElement.parentElement);
        if (state.coins > lastState.coins) flashElement(ui.coins.parentElement);
        if (state.stats.health !== lastState.stats.health) flashElement(ui.health.parentElement.parentElement);
        if (state.stats.attack > lastState.stats.attack) flashElement(ui.attack.parentElement);
        if (state.stats.defense > lastState.stats.defense) flashElement(ui.defense.parentElement);
    }
    
    lastState = JSON.parse(JSON.stringify(state)); // Deep copy
    
    ui.level.textContent = state.level;
    ui.xp.textContent = state.experience;
    ui.xpNeeded.textContent = state.experienceNeeded;
    
    const xpPercent = Math.min(100, (state.experience / state.experienceNeeded) * 100);
    ui.xpFill.style.width = `${xpPercent}%`;
    
    // Stamina updates
    const currentStamina = state.stamina !== undefined ? state.stamina : 100;
    const maxStam = state.maxStamina || 100;
    ui.stamina.textContent = currentStamina;
    ui.staminaMax.textContent = maxStam;
    const staminaPercent = Math.min(100, (currentStamina / maxStam) * 100);
    ui.staminaFill.style.width = `${staminaPercent}%`;
    
    // Health updates
    const maxHP = state.stats.maxHealth || 50;
    ui.health.textContent = state.stats.health;
    ui.healthMax.textContent = maxHP;
    
    ui.coins.textContent = state.coins;
    ui.attack.textContent = state.stats.attack;
    ui.defense.textContent = state.stats.defense;
    
    // Disable buttons appropriately
    const isFull = state.stats.health >= maxHP && currentStamina >= maxStam;
    const restCost = (gameDb && gameDb.actions && gameDb.actions.rest) ? gameDb.actions.rest.coinCost : 5;
    ui.restBtn.disabled = state.coins < restCost || isFull;
}

// Authentication Logic
async function checkAuth() {
    try {
        const res = await fetch('/api/check-auth');
        const data = await res.json();
        
        if (data.authenticated) {
            showContainer('game');
            updateStatsDisplay(data.state);
            socket.connect();
        } else {
            showContainer('auth');
        }
    } catch (err) {
        console.error(err);
        showContainer('auth');
    }
}

async function handleAuth(action) {
    const username = authForm.username.value.trim();
    const password = authForm.password.value;
    
    if (!username || !password) {
        authForm.error.textContent = 'Please fill all fields.';
        return;
    }
    
    authForm.error.textContent = '';
    
    try {
        const res = await fetch(`/api/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            if (action === 'register') {
                authForm.error.style.color = 'var(--accent-green)';
                authForm.error.textContent = 'Registration successful! Please login.';
            } else {
                authForm.error.style.color = 'var(--accent-red)';
                checkAuth();
            }
        } else {
            authForm.error.textContent = data.error || 'Authentication failed.';
        }
    } catch (err) {
        authForm.error.textContent = 'An error occurred.';
    }
}

authForm.loginBtn.addEventListener('click', () => handleAuth('login'));
authForm.registerBtn.addEventListener('click', () => handleAuth('register'));

ui.logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    socket.disconnect();
    showContainer('auth');
});

// Gameplay Logic
let isExploring = false;

function animateProgressBar(duration, callback) {
    ui.exploreProgressContainer.style.display = 'block';
    ui.exploreProgressFill.style.width = '0%';
    
    const startTime = Date.now();
    
    function updateProgress() {
        const elapsed = Date.now() - startTime;
        const percent = Math.min(100, (elapsed / duration) * 100);
        ui.exploreProgressFill.style.width = `${percent}%`;
        
        if (elapsed < duration) {
            requestAnimationFrame(updateProgress);
        } else {
            ui.exploreProgressContainer.style.display = 'none';
            ui.exploreProgressFill.style.width = '0%';
            callback();
        }
    }
    
    requestAnimationFrame(updateProgress);
}

ui.exploreBtn.addEventListener('click', () => {
    if (isExploring) return;
    
    isExploring = true;
    ui.exploreBtn.disabled = true;
    ui.restBtn.disabled = true;
    ui.encounterPrompt.style.display = 'none';
    ui.exploreStatus.textContent = 'Rustling through the bamboo forest...';
    
    const exploreCooldown = (gameDb && gameDb.actions && gameDb.actions.explore) ? gameDb.actions.explore.cooldown : 1500;
    animateProgressBar(exploreCooldown, () => {
        socket.emit('explore');
    });
});

ui.restBtn.addEventListener('click', () => {
    if (isExploring) return;
    socket.emit('rest');
});

socket.on('gameDatabase', (db) => {
    gameDb = db;
    updateUIFromDatabase();
    if (ui.viewInventory.classList.contains('active')) {
        renderInventory();
    }
});

function updateUIFromDatabase() {
    if (!gameDb || !gameDb.actions) return;
    
    const restCost = gameDb.actions.rest.coinCost;
    ui.restBtn.textContent = `Rest (${restCost}c)`;
    ui.restBtn.title = `Rest at the Inn (costs ${restCost} coins)`;
    
    const sneakCost = gameDb.actions.explore.sneakStaminaCost !== undefined ? gameDb.actions.explore.sneakStaminaCost : 5;
    ui.encounterBtnSneak.textContent = `Avoid (${sneakCost}st)`;
    ui.encounterBtnSneak.title = `Avoid conflict (costs ${sneakCost} Stamina)`;
    
    const fleeCost = gameDb.actions.flee.staminaCost;
    ui.combatBtnFlee.textContent = `Flee (${fleeCost}st)`;
    ui.combatBtnFlee.title = `Flee battle (costs ${fleeCost} Stamina)`;
}

socket.on('exploreResult', (data) => {
    isExploring = false;
    ui.exploreBtn.disabled = false;
    ui.exploreStatus.textContent = '';
    
    if (data.success) {
        logAction(data.message);
        if (data.leveledUp) {
            logAction(`[LEVEL UP] You are now level ${data.state.level}.`);
        }
        updateStatsDisplay(data.state);
    } else {
        logAction(`[WARNING] ${data.message}`);
        if (data.state) {
            updateStatsDisplay(data.state);
        } else {
            checkAuth();
        }
    }
});

socket.on('restResult', (data) => {
    if (data.success) {
        logAction(data.message);
        updateStatsDisplay(data.state);
    } else {
        logAction(`[WARNING] ${data.message}`);
    }
});

socket.on('itemUseResult', (data) => {
    if (data.success) {
        logAction(data.message);
        updateStatsDisplay(data.state);
        renderInventory();
    } else {
        logAction(`[WARNING] ${data.message}`);
        alert(data.message);
    }
});

socket.on('itemSellResult', (data) => {
    if (data.success) {
        logAction(data.message);
        updateStatsDisplay(data.state);
        renderInventory();
    } else {
        logAction(`[WARNING] ${data.message}`);
        alert(data.message);
    }
});

socket.on('statUpdate', (state) => {
    updateStatsDisplay(state);
});

// Multiplayer Chat & Social
ui.sendChatBtn.addEventListener('click', () => {
    const msg = ui.chatInput.value.trim();
    if (msg) {
        socket.emit('chatMessage', msg);
        ui.chatInput.value = '';
    }
});

ui.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') ui.sendChatBtn.click();
});

socket.on('chatMessage', (data) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${data.user}:</strong> ${data.message}`;
    ui.chatMessages.appendChild(li);
    ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
});

socket.on('update-player-list', (players) => {
    ui.onlinePlayers.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = p;
        ui.onlinePlayers.appendChild(li);
    });
});

// Combat Event Listeners
let currentYokaiMaxHp = 100;
let yokaiAttackSpeed = 3000;
let monsterAttackStartTime = 0;
let monsterAttackAnimFrame = null;

function logCombatAction(message) {
    const li = document.createElement('li');
    li.textContent = message;
    ui.combatLog.appendChild(li);
    ui.combatLog.scrollTop = ui.combatLog.scrollHeight;
}

function animateMonsterAttack() {
    if (!ui.viewCombat.classList.contains('active')) {
        cancelAnimationFrame(monsterAttackAnimFrame);
        return;
    }
    
    const elapsed = Date.now() - monsterAttackStartTime;
    const percent = Math.min(100, (elapsed / yokaiAttackSpeed) * 100);
    ui.combatYokaiAtkFill.style.width = `${percent}%`;
    
    monsterAttackAnimFrame = requestAnimationFrame(animateMonsterAttack);
}

socket.on('combatStart', (data) => {
    clearAllCombatCooldowns();
    ui.encounterPrompt.style.display = 'none';
    currentYokaiMaxHp = data.yokai.maxHp;
    yokaiAttackSpeed = data.yokai.speed;
    
    ui.combatYokaiName.textContent = data.yokai.name;
    ui.combatYokaiHp.textContent = data.yokai.hp;
    ui.combatYokaiHpMax.textContent = data.yokai.maxHp;
    ui.combatYokaiHpFill.style.width = '100%';
    ui.combatYokaiAtkFill.style.width = '0%';
    ui.combatFeedback.textContent = '';
    
    // Clear and set start log
    ui.combatLog.innerHTML = `<li>[SYSTEM] A wild ${data.yokai.name} blocked your path! Keep your focus.</li>`;
    
    switchView('combat');
    ui.combatBtnStrike.disabled = false;
    ui.combatBtnParry.disabled = false;
    ui.combatBtnFlee.disabled = false;
    flashElement(ui.viewCombat);
    
    // Start Monster Action Bar Animation
    monsterAttackStartTime = Date.now();
    animateMonsterAttack();
});

socket.on('combatPlayerHit', (data) => {
    ui.combatYokaiHp.textContent = data.yokaiHp;
    const pct = Math.min(100, Math.max(0, (data.yokaiHp / currentYokaiMaxHp) * 100));
    ui.combatYokaiHpFill.style.width = `${pct}%`;
    
    logCombatAction(`[COMBAT] You struck the Yokai for ${data.damageDealt} damage.`);
    flashElement(ui.combatYokaiHpFill.parentElement);
});

socket.on('combatMonsterAttack', (data) => {
    updateStatsDisplay(data.state);
    
    if (data.eventType === 'perfect_parry') {
        logCombatAction(`[PERFECT PARRY] Spectacular timing! Deflected 90% damage (took ${data.damage} damage) and counter-struck for ${data.counterDamage} damage!`);
    } else if (data.eventType === 'early_parry') {
        logCombatAction(`[EARLY PARRY] Guarded too early. Blocked 50% damage. Took ${data.damage} damage.`);
    } else if (data.eventType === 'staggered_hit') {
        logCombatAction(`[OFF-BALANCE] Whiffed your parry! You were staggered and took 1.4x damage! (-${data.damage} HP)`);
    } else {
        logCombatAction(`[COMBAT] The wild Yokai hit you for ${data.damage} damage.`);
    }
    
    // Update monster HP UI if counter-attack damage was dealt
    if (data.counterDamage > 0) {
        ui.combatYokaiHp.textContent = data.yokaiHp;
        const pct = Math.min(100, Math.max(0, (data.yokaiHp / currentYokaiMaxHp) * 100));
        ui.combatYokaiHpFill.style.width = `${pct}%`;
        flashElement(ui.combatYokaiHpFill.parentElement);
    }
    
    flashElement(ui.health.parentElement.parentElement);
    flashElement(ui.combatYokaiCard); // flashes monster card showing strike impact!
    
    // Reset Monster Action Bar
    monsterAttackStartTime = Date.now();
});

socket.on('combatFeedback', (data) => {
    ui.combatFeedback.textContent = data.message;
    setTimeout(() => {
        if (ui.combatFeedback.textContent === data.message) {
            ui.combatFeedback.textContent = '';
        }
    }, 2000);
});

socket.on('combatEnd', (data) => {
    clearAllCombatCooldowns();
    ui.combatBtnStrike.disabled = true;
    ui.combatBtnParry.disabled = true;
    ui.combatBtnFlee.disabled = true;
    
    cancelAnimationFrame(monsterAttackAnimFrame);
    ui.combatYokaiAtkFill.style.width = '0%';
    
    logCombatAction(data.message);
    logAction(data.message);
    
    if (data.leveledUp) {
        logAction(`[LEVEL UP] You reached level ${data.state.level}!`);
    }
    
    updateStatsDisplay(data.state);
    
    // Reset explore states back to normal!
    isExploring = false;
    ui.exploreBtn.disabled = false;
    ui.exploreStatus.textContent = '';
    
    setTimeout(() => {
        switchView('activity');
    }, 2500);
});

// Combat Controls Click Handlers
const activeCooldowns = {
    strike: false,
    parry: false
};

const cooldownIntervals = {};

function startButtonCooldown(buttonId, baseText, durationMs, cooldownKey) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (cooldownIntervals[cooldownKey]) {
        clearInterval(cooldownIntervals[cooldownKey]);
    }
    
    activeCooldowns[cooldownKey] = true;
    button.disabled = true;
    button.classList.add('btn-cooldown');
    
    const startTime = Date.now();
    
    const intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, durationMs - elapsed);
        
        if (remaining <= 0) {
            clearInterval(intervalId);
            button.disabled = false;
            button.classList.remove('btn-cooldown');
            button.textContent = baseText;
            activeCooldowns[cooldownKey] = false;
            delete cooldownIntervals[cooldownKey];
        } else {
            button.textContent = `${baseText} (${(remaining / 1000).toFixed(1)}s)`;
        }
    }, 50);
    
    cooldownIntervals[cooldownKey] = intervalId;
}

function clearAllCombatCooldowns() {
    Object.keys(cooldownIntervals).forEach(key => {
        clearInterval(cooldownIntervals[key]);
        delete cooldownIntervals[key];
    });
    activeCooldowns.strike = false;
    activeCooldowns.parry = false;
    
    if (ui.combatBtnStrike) {
        ui.combatBtnStrike.textContent = 'Strike';
        ui.combatBtnStrike.classList.remove('btn-cooldown');
    }
    if (ui.combatBtnParry) {
        ui.combatBtnParry.textContent = 'Parry';
        ui.combatBtnParry.classList.remove('btn-cooldown');
    }
}

ui.combatBtnStrike.addEventListener('click', () => {
    if (activeCooldowns.strike) return;
    socket.emit('combatAction', { action: 'strike' });
    const cooldown = (gameDb && gameDb.actions && gameDb.actions.strike) ? gameDb.actions.strike.cooldown : 800;
    startButtonCooldown('combat-btn-strike', 'Strike', cooldown, 'strike');
});

ui.combatBtnParry.addEventListener('click', () => {
    if (activeCooldowns.parry) return;
    socket.emit('combatAction', { action: 'parry' });
    const cooldown = (gameDb && gameDb.actions && gameDb.actions.parry) ? gameDb.actions.parry.cooldown : 2500;
    startButtonCooldown('combat-btn-parry', 'Parry', cooldown, 'parry');
});

ui.combatBtnFlee.addEventListener('click', () => {
    socket.emit('combatAction', { action: 'flee' });
});

// Combat Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (ui.viewCombat.classList.contains('active') && document.activeElement !== ui.chatInput) {
        if (e.key === ' ' || e.key.toLowerCase() === 'a') {
            e.preventDefault();
            ui.combatBtnStrike.click();
        } else if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'd') {
            e.preventDefault();
            ui.combatBtnParry.click();
        } else if (e.key.toLowerCase() === 'f') {
            e.preventDefault();
            ui.combatBtnFlee.click();
        }
    }
});

// Encounter Event Listeners
socket.on('combatEncounter', (data) => {
    isExploring = true;
    ui.exploreBtn.disabled = true;
    ui.restBtn.disabled = true;
    ui.exploreStatus.textContent = 'Yokai Spotted!';
    
    ui.encounterText.textContent = `A wild ${data.yokai.name} blocks your path. Engage in active battle, or avoid it safely?`;
    ui.encounterPrompt.style.display = 'block';
});

ui.encounterBtnFight.addEventListener('click', () => {
    socket.emit('combatConfirm', { choice: 'fight' });
});

ui.encounterBtnSneak.addEventListener('click', () => {
    socket.emit('combatConfirm', { choice: 'sneak' });
});

socket.on('combatSneakResult', (data) => {
    ui.encounterPrompt.style.display = 'none';
    isExploring = false;
    ui.exploreBtn.disabled = false;
    ui.exploreStatus.textContent = '';
    logAction(data.message);
    updateStatsDisplay(data.state);
});

socket.on('combatFeedbackEncounter', (data) => {
    logAction(`[WARNING] ${data.message}`);
});

// Theme Toggle Logic
ui.themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
});

// Init & Load Theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

// Inventory Filter & Pagination Listeners
function setupInventoryFilters() {
    const filters = [
        { btn: ui.invFilterAll, category: 'all' },
        { btn: ui.invFilterConsumable, category: 'consumable' },
        { btn: ui.invFilterMaterial, category: 'material' }
    ];
    
    filters.forEach(({ btn, category }) => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            filters.forEach(f => f.btn?.classList.remove('active'));
            btn.classList.add('active');
            inventoryCategory = category;
            inventoryPage = 1;
            renderInventory();
        });
    });
    
    if (ui.invPrevPage) {
        ui.invPrevPage.addEventListener('click', () => {
            if (inventoryPage > 1) {
                inventoryPage--;
                renderInventory();
            }
        });
    }
    
    if (ui.invNextPage) {
        ui.invNextPage.addEventListener('click', () => {
            inventoryPage++;
            renderInventory();
        });
    }
}

setupInventoryFilters();

socket.on('kicked', (data) => {
    alert(data.message);
    socket.disconnect();
    showContainer('auth');
    authForm.error.style.color = 'var(--accent-red)';
    authForm.error.textContent = data.message;
});

checkAuth();
