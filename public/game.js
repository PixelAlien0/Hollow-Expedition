const socket = io({ autoConnect: false });
let gameDb = null;
let currentUsername = null;
let allPlayers = [];

let inventoryCategory = 'all';
let inventoryPage = 1;
const ITEMS_PER_PAGE = 4;
let marketCategory = 'all';
let marketPage = 1;
let marketListingsData = [];
let spritePage = 1;
const SPRITES_PER_PAGE = 40;

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
    playerSearch: document.getElementById('player-search'),
    playerCountBadge: document.getElementById('player-count-badge'),
    navActivity: document.getElementById('nav-activity'),
    navPlayers: document.getElementById('nav-players'),
    navInventory: document.getElementById('nav-inventory'),
    navShop: document.getElementById('nav-shop'),
    navMarket: document.getElementById('nav-market'),
    navQuests: document.getElementById('nav-quests'),
    navCrafting: document.getElementById('nav-crafting'),
    viewActivity: document.getElementById('view-activity'),
    viewPlayers: document.getElementById('view-players'),
    viewInventory: document.getElementById('view-inventory'),
    inventoryList: document.getElementById('inventory-list'),
    viewShop: document.getElementById('view-shop'),
    shopList: document.getElementById('shop-list'),
    viewMarket: document.getElementById('view-market'),
    viewQuests: document.getElementById('view-quests'),
    viewCrafting: document.getElementById('view-crafting'),
    craftingList: document.getElementById('crafting-list'),
    activeQuestsList: document.getElementById('active-quests-list'),
    availableQuestsList: document.getElementById('available-quests-list'),
    marketSelectItem: document.getElementById('market-select-item'),
    marketInputQty: document.getElementById('market-input-qty'),
    marketInputPrice: document.getElementById('market-input-price'),
    marketBtnList: document.getElementById('market-btn-list'),
    marketList: document.getElementById('market-list'),
    marketListingsCount: document.getElementById('market-listings-count'),
    marketFilterAll: document.getElementById('market-filter-all'),
    marketFilterWeapon: document.getElementById('market-filter-weapon'),
    marketFilterArmor: document.getElementById('market-filter-armor'),
    marketFilterAccessory: document.getElementById('market-filter-accessory'),
    marketFilterConsumable: document.getElementById('market-filter-consumable'),
    marketFilterMaterial: document.getElementById('market-filter-material'),
    marketFilterAvatar: document.getElementById('market-filter-avatar'),
    marketPrevPage: document.getElementById('market-prev-page'),
    marketNextPage: document.getElementById('market-next-page'),
    marketPageIndicator: document.getElementById('market-page-indicator'),
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
    invFilterEquipped: document.getElementById('inv-filter-equipped'),
    invFilterWeapon: document.getElementById('inv-filter-weapon'),
    invFilterArmor: document.getElementById('inv-filter-armor'),
    invFilterAccessory: document.getElementById('inv-filter-accessory'),
    invFilterConsumable: document.getElementById('inv-filter-consumable'),
    invFilterMaterial: document.getElementById('inv-filter-material'),
    invFilterAvatar: document.getElementById('inv-filter-avatar'),
    invPrevPage: document.getElementById('inv-prev-page'),
    invNextPage: document.getElementById('inv-next-page'),
    invPageIndicator: document.getElementById('inv-page-indicator'),
    navAdminDb: document.getElementById('nav-admin-db'),
    viewAdminDb: document.getElementById('view-admin-db'),
    dbVisualizerInput: document.getElementById('db-visualizer-input'),
    dbSaveBtn: document.getElementById('db-save-btn'),
    dbViewItems: document.getElementById('db-view-items'),
    dbViewYokai: document.getElementById('db-view-yokai'),
    dbViewActions: document.getElementById('db-view-actions'),
    dbViewAreas: document.getElementById('db-view-areas'),
    dbViewSkills: document.getElementById('db-view-skills'),
    dbViewPlayers: document.getElementById('db-view-players'),
    currentAreaTitle: document.getElementById('current-area-title'),
    currentAreaDesc: document.getElementById('current-area-desc'),
    activityAreaTravel: document.getElementById('activity-area-travel'),
    dbViewBackups: document.getElementById('db-view-backups'),
    dbEditorPanel: document.getElementById('db-editor-panel'),
    dbBackupsPanel: document.getElementById('db-backups-panel'),
    dbBackupsList: document.getElementById('db-backups-list'),
    backupFilterAll: document.getElementById('backup-filter-all'),
    backupFilterItems: document.getElementById('backup-filter-items'),
    backupFilterYokai: document.getElementById('backup-filter-yokai'),
    backupFilterActions: document.getElementById('backup-filter-actions'),
    backupFilterAreas: document.getElementById('backup-filter-areas'),
    backupFilterSkills: document.getElementById('backup-filter-skills'),
    // Visual DB Editor UI
    dbEditorModeToggle: document.getElementById('db-editor-mode-toggle'),
    dbModeLabel: document.getElementById('db-mode-label'),
    dbRawContainer: document.getElementById('db-raw-container'),
    dbStructuredContainer: document.getElementById('db-structured-container'),
    dbSearchInput: document.getElementById('db-search-input'),
    dbCategoryFilter: document.getElementById('db-category-filter'),
    dbSortFilter: document.getElementById('db-sort-filter'),
    dbAddEntryBtn: document.getElementById('db-add-entry-btn'),
    dbEntriesList: document.getElementById('db-entries-list'),
    dbFormContainer: document.getElementById('db-form-container'),
    dbDeleteEntryBtn: document.getElementById('db-delete-entry-btn'),
    dbItemPreviewCard: document.getElementById('db-item-preview-card'),
    // Sprite Inspector UI
    spriteInspectorModal: document.getElementById('sprite-inspector-modal'),
    spriteModalTitle: document.getElementById('sprite-modal-title'),
    spriteModalClose: document.getElementById('sprite-modal-close'),
    spriteModalBody: document.getElementById('sprite-modal-body'),
    spriteInspectBigImg: document.getElementById('sprite-inspect-big-img'),
    spriteInspectFilename: document.getElementById('sprite-inspect-filename'),
    spriteInspectUsage: document.getElementById('sprite-inspect-usage'),
    spriteSearchInput: document.getElementById('sprite-search-input'),
    spriteFolderSelect: document.getElementById('sprite-folder-select'),
    spriteGalleryList: document.getElementById('sprite-gallery-list'),
    spriteModalSelectBtn: document.getElementById('sprite-modal-select-btn'),
    actionArea: document.getElementById('action-area'),
    areaBgPreview: document.getElementById('area-bg-preview'),
    
    // Multiplayer Party UI
    navParty: document.getElementById('nav-party'),
    viewParty: document.getElementById('view-party'),
    partySetupPanel: document.getElementById('party-setup-panel'),
    partyCreateBtn: document.getElementById('party-create-btn'),
    partyCodeInput: document.getElementById('party-code-input'),
    partyJoinBtn: document.getElementById('party-join-btn'),
    partyLobbyPanel: document.getElementById('party-lobby-panel'),
    partyLobbyCodeDisplay: document.getElementById('party-lobby-code-display'),
    partyMembersList: document.getElementById('party-members-list'),
    partyLeaveBtn: document.getElementById('party-leave-btn'),
    combatPartyMembers: document.getElementById('combat-party-members')
};

// Container switching
function showContainer(name) {
    Object.values(containers).forEach(c => c.classList.remove('active'));
    containers[name].classList.add('active');
}

// Generic DOM reconciliation helper to prevent layout thrashing
function reconcileList(container, data, getKey, createFn, updateFn) {
    if (container.querySelector('.empty-inventory, .player-card-empty, .pc-empty, .loading-inventory')) {
        container.innerHTML = '';
    }

    const existingChildren = Array.from(container.children);
    const existingMap = new Map();
    existingChildren.forEach(child => {
        const key = child.dataset.rekey;
        if (key) {
            existingMap.set(key, child);
        }
    });

    const activeKeys = new Set();
    const fragment = document.createDocumentFragment();

    data.forEach(item => {
        const key = String(getKey(item));
        activeKeys.add(key);
        let element = existingMap.get(key);

        if (!element) {
            element = createFn(item);
            element.dataset.rekey = key;
        } else {
            updateFn(element, item);
        }

        fragment.appendChild(element);
    });

    existingChildren.forEach(child => {
        const key = child.dataset.rekey;
        if (key && !activeKeys.has(key)) {
            child.remove();
        }
    });

    container.appendChild(fragment);
}

// View switching
function cleanAdminDbDOM() {
    selectedEntryKey = null;
    if (ui.dbEntriesList) ui.dbEntriesList.innerHTML = '';
    if (ui.dbFormContainer) ui.dbFormContainer.innerHTML = '';
    if (ui.dbItemPreviewCard) ui.dbItemPreviewCard.innerHTML = '';
    if (ui.dbVisualizerInput) ui.dbVisualizerInput.value = '';
    if (ui.spriteGalleryList) ui.spriteGalleryList.innerHTML = '';
}

function switchView(viewName) {
    ui.viewActivity.classList.remove('active');
    ui.viewPlayers.classList.remove('active');
    ui.viewCombat.classList.remove('active');
    ui.viewInventory.classList.remove('active');
    if (ui.viewShop) ui.viewShop.classList.remove('active');
    if (ui.viewMarket) ui.viewMarket.classList.remove('active');
    if (ui.viewQuests) ui.viewQuests.classList.remove('active');
    if (ui.viewCrafting) ui.viewCrafting.classList.remove('active');
    if (ui.viewAdminDb) ui.viewAdminDb.classList.remove('active');
    if (ui.viewParty) ui.viewParty.classList.remove('active');

    ui.navActivity.classList.remove('active');
    ui.navPlayers.classList.remove('active');
    ui.navInventory.classList.remove('active');
    if (ui.navShop) ui.navShop.classList.remove('active');
    if (ui.navMarket) ui.navMarket.classList.remove('active');
    if (ui.navQuests) ui.navQuests.classList.remove('active');
    if (ui.navCrafting) ui.navCrafting.classList.remove('active');
    if (ui.navAdminDb) ui.navAdminDb.classList.remove('active');
    if (ui.navParty) ui.navParty.classList.remove('active');

    if (viewName !== 'admin-db') {
        cleanAdminDbDOM();
    }

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
    } else if (viewName === 'shop') {
        if (ui.viewShop) ui.viewShop.classList.add('active');
        if (ui.navShop) ui.navShop.classList.add('active');
        renderShop();
    } else if (viewName === 'market') {
        if (ui.viewMarket) ui.viewMarket.classList.add('active');
        if (ui.navMarket) ui.navMarket.classList.add('active');
        socket.emit('marketGetListings');
        populateMarketSellDropdown();
    } else if (viewName === 'quests') {
        if (ui.viewQuests) ui.viewQuests.classList.add('active');
        if (ui.navQuests) ui.navQuests.classList.add('active');
        socket.emit('questGetBoard');
    } else if (viewName === 'crafting') {
        if (ui.viewCrafting) ui.viewCrafting.classList.add('active');
        if (ui.navCrafting) ui.navCrafting.classList.add('active');
        renderCrafting();
    } else if (viewName === 'admin-db') {
        if (ui.viewAdminDb) ui.viewAdminDb.classList.add('active');
        if (ui.navAdminDb) ui.navAdminDb.classList.add('active');
        loadAdminDatabase('items');
    } else if (viewName === 'party') {
        if (ui.viewParty) ui.viewParty.classList.add('active');
        if (ui.navParty) ui.navParty.classList.add('active');
    }
}

ui.navActivity.addEventListener('click', () => switchView('activity'));
ui.navPlayers.addEventListener('click', () => switchView('players'));
if (ui.navParty) {
    ui.navParty.addEventListener('click', () => switchView('party'));
}
ui.navInventory.addEventListener('click', () => switchView('inventory'));
if (ui.navShop) {
    ui.navShop.addEventListener('click', () => switchView('shop'));
}
if (ui.navMarket) {
    ui.navMarket.addEventListener('click', () => switchView('market'));
}
if (ui.navQuests) {
    ui.navQuests.addEventListener('click', () => switchView('quests'));
}
if (ui.navCrafting) {
    ui.navCrafting.addEventListener('click', () => switchView('crafting'));
}
if (ui.navAdminDb) {
    ui.navAdminDb.addEventListener('click', () => switchView('admin-db'));
}

function logAction(message) {
    const li = document.createElement('li');
    li.textContent = message;
    if (message && message.includes('[LEGENDARY]')) {
        li.classList.add('log-legendary');
    }
    ui.actionLog.appendChild(li);
    while (ui.actionLog.children.length > 100) {
        ui.actionLog.removeChild(ui.actionLog.firstChild);
    }
    ui.actionLog.scrollTop = ui.actionLog.scrollHeight;
}

function createInventoryItem(entry) {
    const li = document.createElement('li');
    li.innerHTML = `
        <img class="item-sprite" style="display: none;" />
        <div class="item-info">
            <div class="item-name-qty">
                <span class="item-name"></span>
                <span class="rarity-badge"></span>
                <span class="item-qty"></span>
            </div>
            <p class="item-desc"></p>
        </div>
        <div class="item-actions"></div>
    `;
    updateInventoryItem(li, entry);
    return li;
}

function updateInventoryItem(li, entry) {
    const [itemKey, quantity, slot] = entry;
    const item = gameDb.items[itemKey];
    if (!item) {
        li.style.display = 'none';
        return;
    }
    li.style.display = '';

    const rarity = item.rarity || "common";
    li.className = `inventory-item item-rarity-${rarity}`;

    const nameEl = li.querySelector('.item-name');
    if (nameEl) nameEl.textContent = item.name;

    const badgeEl = li.querySelector('.rarity-badge');
    if (badgeEl) {
        badgeEl.className = `rarity-badge badge-${rarity}`;
        badgeEl.textContent = rarity.toUpperCase();
    }

    const qtyEl = li.querySelector('.item-qty');
    if (qtyEl) {
        if (slot) {
            qtyEl.textContent = `[EQUIPPED: ${slot.toUpperCase()}]`;
            qtyEl.style.color = 'var(--accent-red)';
            qtyEl.style.fontWeight = 'bold';
        } else {
            qtyEl.textContent = `x${quantity}`;
            qtyEl.style.color = '';
            qtyEl.style.fontWeight = '';
        }
    }

    const descEl = li.querySelector('.item-desc');
    if (descEl) descEl.textContent = item.desc;

    const imgEl = li.querySelector('.item-sprite');
    if (imgEl) {
        if (item.sprite) {
            imgEl.src = `/sprites/${item.sprite}`;
            imgEl.alt = item.name;
            imgEl.style.display = 'block';
            imgEl.dataset.itemKey = itemKey;
        } else {
            imgEl.style.display = 'none';
        }
    }

    const actionsDiv = li.querySelector('.item-actions');
    if (actionsDiv) {
        actionsDiv.innerHTML = '';
        if (slot) {
            const unequipBtn = document.createElement('button');
            unequipBtn.className = 'nav-btn danger item-action-btn';
            unequipBtn.textContent = 'Unequip';
            unequipBtn.title = `Unequip this item and return it to your inventory`;
            unequipBtn.addEventListener('click', () => {
                socket.emit('unequipItem', { slot });
            });
            actionsDiv.appendChild(unequipBtn);
        } else {
            if (item.type === "consumable") {
                const useBtn = document.createElement('button');
                useBtn.className = 'secondary-btn item-action-btn';
                useBtn.textContent = 'Use';
                useBtn.title = `Consume this item to restore stats`;
                useBtn.addEventListener('click', () => {
                    socket.emit('useItem', { itemKey });
                });
                actionsDiv.appendChild(useBtn);
            } else if (["weapon", "armor", "helmet", "shield", "accessory", "avatar"].includes(item.type)) {
                const equipBtn = document.createElement('button');
                equipBtn.className = 'secondary-btn item-action-btn';
                equipBtn.textContent = 'Equip';
                equipBtn.title = `Equip this ${item.type} to boost your stats`;
                equipBtn.addEventListener('click', () => {
                    socket.emit('equipItem', { itemKey });
                });
                actionsDiv.appendChild(equipBtn);
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
        }
    }
}

function renderInventory() {
    const hasInventory = lastState && lastState.inventory && Object.keys(lastState.inventory).length > 0;
    const hasEquipment = lastState && lastState.equipment && Object.values(lastState.equipment).some(x => x !== null);

    if (!lastState || (!hasInventory && !hasEquipment)) {
        ui.inventoryList.innerHTML = `<li class="empty-inventory">Your inventory is empty. Explore the wilds or defeat Yokai to find items!</li>`;
        updatePaginationUI(0);
        return;
    }

    if (!gameDb || !gameDb.items) {
        ui.inventoryList.innerHTML = `<li class="empty-inventory">Loading game items...</li>`;
        updatePaginationUI(0);
        return;
    }

    let allEntries = [];
    if (inventoryCategory === 'equipped') {
        if (lastState.equipment) {
            Object.entries(lastState.equipment).forEach(([slot, itemKey]) => {
                if (itemKey && gameDb && gameDb.items && gameDb.items[itemKey]) {
                    allEntries.push([itemKey, 1, slot]);
                }
            });
        }
    } else {
        if (lastState.inventory) {
            allEntries = Object.entries(lastState.inventory).filter(([itemKey, quantity]) => {
                const item = gameDb.items[itemKey];
                if (!item) return false;
                if (inventoryCategory === 'all') return true;
                if (inventoryCategory === 'armor') {
                    return ['armor', 'helmet', 'shield'].includes(item.type);
                }
                return item.type === inventoryCategory;
            }).map(([itemKey, quantity]) => [itemKey, quantity, null]);
        }
    }

    const totalItems = allEntries.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

    if (inventoryPage > totalPages) inventoryPage = totalPages;
    if (inventoryPage < 1) inventoryPage = 1;

    updatePaginationUI(totalPages);

    if (totalItems === 0) {
        ui.inventoryList.innerHTML = `<li class="empty-inventory">No ${inventoryCategory === 'all' ? '' : inventoryCategory + ' '}items found.</li>`;
        return;
    }

    const startIndex = (inventoryPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const paginatedEntries = allEntries.slice(startIndex, endIndex);

    reconcileList(
        ui.inventoryList,
        paginatedEntries,
        entry => entry[2] ? 'equip_' + entry[2] : 'inv_' + entry[0],
        createInventoryItem,
        updateInventoryItem
    );
}

function renderShop() {
    ui.shopList.innerHTML = '';

    if (!gameDb || !gameDb.items) {
        ui.shopList.innerHTML = `<li class="empty-inventory">Loading shop items...</li>`;
        return;
    }

    const shopItemKeys = Object.keys(gameDb.items).filter(key => {
        const item = gameDb.items[key];
        return item && item.value > 0 && item.type !== 'material' && item.shopListed !== false;
    });

    if (shopItemKeys.length === 0) {
        ui.shopList.innerHTML = `<li class="empty-inventory">The merchant has no items for sale today.</li>`;
        return;
    }

    for (const itemKey of shopItemKeys) {
        const item = gameDb.items[itemKey];
        const rarity = item.rarity || "common";

        const baseValue = item.value || 0;
        const multipliers = (gameDb && gameDb.actions && gameDb.actions.raritySettings) ? gameDb.actions.raritySettings.valueMultipliers : { common: 1.0, uncommon: 1.5, rare: 2.5, epic: 4.0 };
        const mult = multipliers[rarity] || 1.0;
        const buyPrice = Math.floor(baseValue * mult * 2.0);

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

        const typeSpan = document.createElement('span');
        typeSpan.className = 'item-qty';
        typeSpan.textContent = item.type.toUpperCase();

        nameQtyDiv.appendChild(nameSpan);
        nameQtyDiv.appendChild(badgeSpan);
        nameQtyDiv.appendChild(typeSpan);

        const descP = document.createElement('p');
        descP.className = 'item-desc';
        descP.textContent = item.desc;

        infoDiv.appendChild(nameQtyDiv);
        infoDiv.appendChild(descP);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';

        const buyBtn = document.createElement('button');
        buyBtn.className = 'secondary-btn item-action-btn';
        buyBtn.textContent = `Buy (${buyPrice}c)`;
        buyBtn.title = `Purchase 1x ${item.name} for ${buyPrice} coins`;
        buyBtn.setAttribute('data-buy-price', buyPrice);

        const coins = lastState ? lastState.coins : 0;
        if (coins < buyPrice) {
            buyBtn.disabled = true;
            buyBtn.style.opacity = '0.5';
        }

        buyBtn.addEventListener('click', () => {
            socket.emit('buyItem', { itemKey });
        });

        actionsDiv.appendChild(buyBtn);
        if (item.sprite) {
            const img = document.createElement('img');
            img.src = `/sprites/${item.sprite}`;
            img.className = 'item-sprite';
            img.alt = item.name;
            img.dataset.itemKey = itemKey;
            li.appendChild(img);
        }

        li.appendChild(infoDiv);
        li.appendChild(actionsDiv);
        ui.shopList.appendChild(li);
    }
}

function renderCrafting() {
    if (!ui.craftingList) return;
    ui.craftingList.innerHTML = '';

    if (!gameDb || !gameDb.items) {
        ui.craftingList.innerHTML = `<li class="empty-inventory">Loading crafting recipes...</li>`;
        return;
    }

    const craftableItemKeys = Object.keys(gameDb.items).filter(key => {
        const item = gameDb.items[key];
        return item && item.recipe && typeof item.recipe === 'object';
    });

    if (craftableItemKeys.length === 0) {
        ui.craftingList.innerHTML = `<li class="empty-inventory">No crafting recipes discovered yet.</li>`;
        return;
    }

    const playerCoins = lastState ? (lastState.coins || 0) : 0;
    const playerInventory = lastState ? (lastState.inventory || {}) : {};

    for (const itemKey of craftableItemKeys) {
        const item = gameDb.items[itemKey];
        const recipe = item.recipe;
        const rarity = item.rarity || 'common';
        const cost = recipe.cost || 0;
        const ingredients = recipe.ingredients || {};

        const li = document.createElement('li');
        li.className = `inventory-item item-rarity-${rarity}`;

        if (item.sprite) {
            const img = document.createElement('img');
            img.src = `/sprites/${item.sprite}`;
            img.className = 'item-sprite';
            img.alt = item.name;
            img.dataset.itemKey = itemKey;
            li.appendChild(img);
        }

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

        const typeSpan = document.createElement('span');
        typeSpan.className = 'item-qty';
        typeSpan.textContent = item.type.toUpperCase();

        nameQtyDiv.appendChild(nameSpan);
        nameQtyDiv.appendChild(badgeSpan);
        nameQtyDiv.appendChild(typeSpan);

        const descP = document.createElement('p');
        descP.className = 'item-desc';
        descP.textContent = item.desc;

        const ingredientsDiv = document.createElement('div');
        ingredientsDiv.className = 'recipe-ingredients';
        ingredientsDiv.style.display = 'flex';
        ingredientsDiv.style.flexWrap = 'wrap';
        ingredientsDiv.style.gap = '0.5rem';
        ingredientsDiv.style.marginTop = '0.5rem';

        let canCraft = true;

        if (cost > 0) {
            const costPill = document.createElement('span');
            costPill.style.fontFamily = 'var(--font-mono)';
            costPill.style.fontSize = '0.8rem';
            costPill.style.padding = '0.2rem 0.5rem';
            costPill.style.border = '2px solid var(--border-color)';
            costPill.style.background = 'var(--bg-color)';

            const hasEnoughCoins = playerCoins >= cost;
            if (hasEnoughCoins) {
                costPill.style.color = '#4a7';
                costPill.textContent = `${cost} / ${playerCoins} COINS`;
            } else {
                costPill.style.color = 'var(--accent-red)';
                costPill.textContent = `${cost} / ${playerCoins} COINS`;
                canCraft = false;
            }
            ingredientsDiv.appendChild(costPill);
        }

        Object.entries(ingredients).forEach(([ingKey, qtyRequired]) => {
            const ingItem = gameDb.items[ingKey];
            const ingName = ingItem ? ingItem.name : ingKey;
            const currentQty = playerInventory[ingKey] || 0;
            const hasEnough = currentQty >= qtyRequired;

            const pill = document.createElement('span');
            pill.style.fontFamily = 'var(--font-mono)';
            pill.style.fontSize = '0.8rem';
            pill.style.padding = '0.2rem 0.5rem';
            pill.style.border = '2px solid var(--border-color)';
            pill.style.background = 'var(--bg-color)';

            if (hasEnough) {
                pill.style.color = '#4a7';
                pill.textContent = `✓ ${ingName} (${currentQty}/${qtyRequired})`;
            } else {
                pill.style.color = 'var(--accent-red)';
                pill.textContent = `✗ ${ingName} (${currentQty}/${qtyRequired})`;
                canCraft = false;
            }
            ingredientsDiv.appendChild(pill);
        });

        infoDiv.appendChild(nameQtyDiv);
        infoDiv.appendChild(descP);
        infoDiv.appendChild(ingredientsDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';

        const craftBtn = document.createElement('button');
        craftBtn.className = 'secondary-btn item-action-btn';
        craftBtn.textContent = 'Craft';
        craftBtn.title = `Craft 1x ${item.name}`;

        if (!canCraft || isExploring) {
            craftBtn.disabled = true;
            craftBtn.style.opacity = '0.5';
            craftBtn.style.cursor = 'not-allowed';
        } else {
            craftBtn.addEventListener('click', () => {
                socket.emit('craftItem', { itemKey });
            });
        }

        actionsDiv.appendChild(craftBtn);

        li.appendChild(infoDiv);
        li.appendChild(actionsDiv);
        ui.craftingList.appendChild(li);
    }
}

function updateShopButtons(coins) {
    if (!ui.shopList) return;
    const buyBtns = ui.shopList.querySelectorAll('.item-action-btn');
    buyBtns.forEach(btn => {
        const price = parseInt(btn.getAttribute('data-buy-price'), 10);
        if (isNaN(price)) return;
        if (coins < price) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    });
}

// Populate market listing select menu with owned inventory items
function populateMarketSellDropdown() {
    if (!ui.marketSelectItem) return;
    ui.marketSelectItem.innerHTML = '';

    if (!lastState || !lastState.inventory || Object.keys(lastState.inventory).length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- No items in inventory --';
        ui.marketSelectItem.appendChild(opt);
        return;
    }

    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = '-- Choose an item to sell --';
    ui.marketSelectItem.appendChild(defOpt);

    for (const [itemKey, quantity] of Object.entries(lastState.inventory)) {
        const item = gameDb.items[itemKey];
        if (item) {
            const opt = document.createElement('option');
            opt.value = itemKey;
            opt.textContent = `${item.name} (x${quantity})`;
            ui.marketSelectItem.appendChild(opt);
        }
    }
}

// Render Quest Board and Available Contracts
function renderQuestBoard(data) {
    if (!ui.activeQuestsList || !ui.availableQuestsList) return;

    const active = data.active || [];
    const available = data.available || [];

    // Render Active Quests
    ui.activeQuestsList.innerHTML = '';
    if (active.length === 0) {
        ui.activeQuestsList.innerHTML = `
            <li style="border: 2px dashed var(--border-color); padding: 1.5rem; text-align: center; font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-color); opacity: 0.7;">
                No active quests. Accept a contract from the mission board to begin.
            </li>
        `;
    } else {
        active.forEach(quest => {
            let progressText = '';
            let currentProgress = quest.count;
            if (quest.type === 'gather') {
                const owned = (lastState && lastState.inventory && lastState.inventory[quest.target]) || 0;
                currentProgress = Math.min(quest.required, owned);
                progressText = `Gathered: ${currentProgress} / ${quest.required}`;
            } else if (quest.type === 'slay') {
                progressText = `Slayed: ${currentProgress} / ${quest.required}`;
            } else {
                progressText = `Scouted: ${currentProgress} / ${quest.required}`;
            }

            const pct = Math.min(100, Math.floor((currentProgress / quest.required) * 100));
            const isComplete = currentProgress >= quest.required;

            const li = document.createElement('li');
            li.style.background = 'var(--bg-color)';
            li.style.border = '3px solid var(--border-color)';
            li.style.boxShadow = '4px 4px 0px var(--border-color)';
            li.style.padding = '1rem';
            li.style.display = 'flex';
            li.style.flexDirection = 'column';
            li.style.gap = '0.5rem';

            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                    <h4 style="font-family: var(--font-main); font-weight: 700; text-transform: uppercase; font-size: 0.95rem; margin: 0;">${quest.title}</h4>
                    <span style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: ${isComplete ? 'var(--accent-green)' : 'inherit'}">${isComplete ? '✓ READY' : 'IN PROGRESS'}</span>
                </div>
                <p style="font-size: 0.8rem; margin: 0; line-height: 1.3;">${quest.desc}</p>
                <div style="margin-top: 0.25rem;">
                    <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700;">
                        <span>${progressText}</span>
                        <span>${pct}%</span>
                    </div>
                    <div style="background: var(--bg-color); border: 2px solid var(--border-color); height: 10px; margin-top: 0.25rem; overflow: hidden;">
                        <div style="background: ${isComplete ? 'var(--accent-green)' : 'var(--border-color)'}; width: ${pct}%; height: 100%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; gap: 1rem; flex-wrap: wrap;">
                    <div style="display: flex; gap: 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700;">
                        <span style="background: rgba(0,0,0,0.05); border: 1px solid var(--border-color); padding: 0.1rem 0.4rem;">+${quest.reward.xp} XP</span>
                        <span style="background: rgba(0,0,0,0.05); border: 1px solid var(--border-color); padding: 0.1rem 0.4rem;">+${quest.reward.coins} COINS</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        ${isComplete
                    ? `<button class="nav-btn" onclick="completeQuest('${quest.id}')" style="background: var(--accent-green); color: white; padding: 0.25rem 0.75rem; font-size: 0.75rem; margin: 0; box-shadow: 2px 2px 0 var(--border-color); font-weight: 700; text-transform: uppercase; cursor: pointer;">Claim Rewards</button>`
                    : `<button class="nav-btn danger" onclick="abandonQuest('${quest.id}')" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; margin: 0; box-shadow: 2px 2px 0 var(--border-color); font-weight: 700; text-transform: uppercase; cursor: pointer;">Abandon</button>`
                }
                    </div>
                </div>
            `;
            ui.activeQuestsList.appendChild(li);
        });
    }

    // Render Available Quests
    ui.availableQuestsList.innerHTML = '';
    if (available.length === 0) {
        ui.availableQuestsList.innerHTML = `
            <li style="border: 2px dashed var(--border-color); padding: 1.5rem; text-align: center; font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-color); opacity: 0.7;">
                No contracts available. Refreshing board...
            </li>
        `;
    } else {
        available.forEach(quest => {
            const li = document.createElement('li');
            li.style.background = 'var(--bg-color)';
            li.style.border = '3px solid var(--border-color)';
            li.style.boxShadow = '4px 4px 0px var(--border-color)';
            li.style.padding = '1rem';
            li.style.display = 'flex';
            li.style.flexDirection = 'column';
            li.style.gap = '0.5rem';

            const activeLimitReached = active.length >= 3;

            li.innerHTML = `
                <h4 style="font-family: var(--font-main); font-weight: 700; text-transform: uppercase; font-size: 0.95rem; margin: 0;">${quest.title}</h4>
                <p style="font-size: 0.8rem; margin: 0; line-height: 1.3;">${quest.desc}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; gap: 1rem; flex-wrap: wrap;">
                    <div style="display: flex; gap: 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700;">
                        <span style="background: rgba(0,0,0,0.05); border: 1px solid var(--border-color); padding: 0.1rem 0.4rem;">+${quest.reward.xp} XP</span>
                        <span style="background: rgba(0,0,0,0.05); border: 1px solid var(--border-color); padding: 0.1rem 0.4rem;">+${quest.reward.coins} COINS</span>
                    </div>
                    <button class="nav-btn" onclick="acceptQuest('${quest.id}')" ${activeLimitReached ? 'disabled style="opacity: 0.5; cursor: not-allowed; margin: 0;"' : 'style="margin: 0; cursor: pointer;"'} style="padding: 0.25rem 0.75rem; font-size: 0.75rem; box-shadow: 2px 2px 0 var(--border-color); font-weight: 700; text-transform: uppercase;">
                        ${activeLimitReached ? 'Limit Reached' : 'Accept Contract'}
                    </button>
                </div>
            `;
            ui.availableQuestsList.appendChild(li);
        });
    }
}

window.acceptQuest = function (questId) {
    socket.emit('questAccept', { questId });
};

window.abandonQuest = function (questId) {
    if (confirm("Are you sure you want to abandon this quest? Any progress will be lost.")) {
        socket.emit('questAbandon', { questId });
    }
};

window.completeQuest = function (questId) {
    socket.emit('questComplete', { questId });
};

// Render list of active market listings
function renderMarketListings(listings) {
    if (listings !== undefined) {
        marketListingsData = listings;
    }

    if (!ui.marketList) return;
    ui.marketList.innerHTML = '';

    if (!gameDb || !gameDb.items) {
        ui.marketList.innerHTML = `<li class="empty-inventory">Loading game items...</li>`;
        return;
    }

    // Filter listings by active category
    const filteredListings = marketListingsData.filter(listing => {
        const item = gameDb.items[listing.item_key];
        if (!item) return false;
        if (marketCategory === 'all') return true;
        if (marketCategory === 'armor') {
            return ['armor', 'helmet', 'shield'].includes(item.type);
        }
        return item.type === marketCategory;
    });

    const totalItems = filteredListings.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

    // Clamp marketPage to valid range
    if (marketPage > totalPages) marketPage = totalPages;
    if (marketPage < 1) marketPage = 1;

    // Update pagination controls
    updateMarketPaginationUI(totalPages);

    if (totalItems === 0) {
        ui.marketList.innerHTML = `<li class="empty-inventory">No listings found in this category.</li>`;
        if (ui.marketListingsCount) ui.marketListingsCount.textContent = '0 Listings';
        return;
    }

    if (ui.marketListingsCount) {
        ui.marketListingsCount.textContent = `${totalItems} Listing${totalItems === 1 ? '' : 's'}`;
    }

    const startIndex = (marketPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const paginatedListings = filteredListings.slice(startIndex, endIndex);

    for (const listing of paginatedListings) {
        const item = gameDb.items[listing.item_key];
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
        qtySpan.textContent = `x${listing.quantity}`;

        nameQtyDiv.appendChild(nameSpan);
        nameQtyDiv.appendChild(badgeSpan);
        nameQtyDiv.appendChild(qtySpan);

        const sellerDiv = document.createElement('div');
        sellerDiv.style.fontFamily = 'var(--font-mono)';
        sellerDiv.style.fontSize = '0.8rem';
        sellerDiv.style.opacity = '0.7';
        sellerDiv.style.marginTop = '0.2rem';
        sellerDiv.textContent = `Seller: ${listing.seller}`;

        infoDiv.appendChild(nameQtyDiv);
        infoDiv.appendChild(sellerDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';

        const isOwnListing = currentUsername && listing.seller && (listing.seller.toLowerCase() === currentUsername.toLowerCase());

        if (isOwnListing) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'nav-btn danger item-action-btn';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.title = 'Remove this listing and return the items to your inventory';
            cancelBtn.addEventListener('click', () => {
                socket.emit('marketCancelListing', { listingId: listing.id });
            });
            actionsDiv.appendChild(cancelBtn);
        } else {
            const buyBtn = document.createElement('button');
            buyBtn.className = 'secondary-btn item-action-btn';
            buyBtn.textContent = `Buy (${listing.price}c)`;
            buyBtn.title = `Purchase ${listing.quantity}x ${item.name} for ${listing.price} coins`;

            const coins = lastState ? lastState.coins : 0;
            if (coins < listing.price) {
                buyBtn.disabled = true;
                buyBtn.style.opacity = '0.5';
                buyBtn.style.cursor = 'not-allowed';
                buyBtn.title = `You do not have enough coins (${listing.price}c needed)`;
            }

            buyBtn.addEventListener('click', () => {
                socket.emit('marketBuyListing', { listingId: listing.id });
            });
            actionsDiv.appendChild(buyBtn);
        }

        if (item.sprite) {
            const img = document.createElement('img');
            img.src = `/sprites/${item.sprite}`;
            img.className = 'item-sprite';
            img.alt = item.name;
            li.appendChild(img);
        }

        li.appendChild(infoDiv);
        li.appendChild(actionsDiv);
        ui.marketList.appendChild(li);
    }
}

function updateMarketPaginationUI(totalPages) {
    if (!ui.marketPrevPage || !ui.marketNextPage || !ui.marketPageIndicator) return;

    if (totalPages <= 0) {
        ui.marketPrevPage.disabled = true;
        ui.marketNextPage.disabled = true;
        ui.marketPageIndicator.textContent = `Page 1 of 1`;
        return;
    }
    ui.marketPrevPage.disabled = marketPage === 1;
    ui.marketNextPage.disabled = marketPage === totalPages;
    ui.marketPageIndicator.textContent = `Page ${marketPage} of ${totalPages}`;
}

// Market list button handler
if (ui.marketBtnList) {
    ui.marketBtnList.addEventListener('click', () => {
        const itemKey = ui.marketSelectItem.value;
        const qty = parseInt(ui.marketInputQty.value, 10);
        const price = parseInt(ui.marketInputPrice.value, 10);

        if (!itemKey) {
            alert("Please select an item to list.");
            return;
        }
        if (isNaN(qty) || qty <= 0) {
            alert("Please enter a valid quantity.");
            return;
        }
        if (isNaN(price) || price <= 0) {
            alert("Please enter a valid price.");
            return;
        }

        socket.emit('marketCreateListing', { itemKey, quantity: qty, price });
    });
}

// Dynamically set default price and quantity when selected item changes to avoid hardcoded values
if (ui.marketSelectItem) {
    ui.marketSelectItem.addEventListener('change', () => {
        const itemKey = ui.marketSelectItem.value;
        if (!itemKey) {
            ui.marketInputPrice.value = 10;
            ui.marketInputQty.value = 1;
            return;
        }
        const item = gameDb?.items?.[itemKey];
        if (item) {
            ui.marketInputPrice.value = item.value || 1;
            ui.marketInputQty.value = 1;
        }
    });
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

function getDefaultAreaKey() {
    return (gameDb && gameDb.areas && Object.keys(gameDb.areas).length > 0)
        ? Object.keys(gameDb.areas)[0]
        : 'bamboo_grove';
}

let lastState = null;
let currentPartyCode = null;

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

    // Update location banner
    const currentAreaKey = state.currentArea || getDefaultAreaKey();
    if (gameDb && gameDb.areas) {
        if (gameDb.areas[currentAreaKey]) {
            const area = gameDb.areas[currentAreaKey];
            if (ui.currentAreaTitle) ui.currentAreaTitle.textContent = area.name;
            if (ui.currentAreaDesc) ui.currentAreaDesc.textContent = area.desc;

            // Apply background image to scenic banner
            const bgEl = ui.areaBgPreview;
            if (area.background && bgEl) {
                bgEl.style.backgroundImage = `url(/sprites/${encodeURIComponent(area.background)})`;
            } else if (bgEl) {
                bgEl.style.backgroundImage = '';
            }
        } else {
            if (ui.currentAreaTitle) ui.currentAreaTitle.textContent = 'Unknown Area';
            if (ui.currentAreaDesc) ui.currentAreaDesc.textContent = 'This location does not exist in the database.';
            if (ui.areaBgPreview) ui.areaBgPreview.style.backgroundImage = '';
        }
    }

    // Refresh dropdown disabled state and selection
    if (typeof updateTravelDropdown === 'function') {
        updateTravelDropdown(state);
    }

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

    let attackBonus = 0;
    let defenseBonus = 0;
    const equippableTypes = ["weapon", "armor", "helmet", "shield", "accessory", "avatar"];

    if (state.equipment && gameDb && gameDb.items) {
        equippableTypes.forEach(slot => {
            const itemKey = state.equipment[slot];
            if (itemKey) {
                const item = gameDb.items[itemKey];
                if (item && item.effects) {
                    if (typeof item.effects.attackBonus === 'number') {
                        attackBonus += item.effects.attackBonus;
                    }
                    if (typeof item.effects.defenseBonus === 'number') {
                        defenseBonus += item.effects.defenseBonus;
                    }
                }
            }
        });
    }

    ui.attack.textContent = attackBonus > 0 ? `${state.stats.attack} (+${attackBonus})` : state.stats.attack;
    ui.defense.textContent = defenseBonus > 0 ? `${state.stats.defense} (+${defenseBonus})` : state.stats.defense;

    // Disable buttons appropriately
    const isFull = state.stats.health >= maxHP && currentStamina >= maxStam;
    const baseRestCost = (gameDb && gameDb.actions && gameDb.actions.rest) ? gameDb.actions.rest.coinCost : 5;
    const restCost = baseRestCost * (state.level || 1);

    ui.restBtn.textContent = `Rest (${restCost}c)`;
    ui.restBtn.title = `Rest at the Inn (costs ${restCost} coins)`;
    ui.restBtn.disabled = state.coins < restCost || isFull;

    if (ui.viewShop && ui.viewShop.classList.contains('active')) {
        updateShopButtons(state.coins);
    }
    updateSkillButtonsDisabledState();
}

// Authentication Logic
async function checkAuth() {
    try {
        const res = await fetch('/api/check-auth');
        const data = await res.json();

        if (data.authenticated) {
            currentUsername = data.username;
            showContainer('game');
            updateStatsDisplay(data.state);
            if (ui.navAdminDb) {
                ui.navAdminDb.style.display = data.isAdmin ? 'block' : 'none';
            }
            socket.connect();
        } else {
            currentUsername = null;
            showContainer('auth');
            if (ui.navAdminDb) {
                ui.navAdminDb.style.display = 'none';
            }
        }
    } catch (err) {
        currentUsername = null;
        console.error(err);
        showContainer('auth');
        if (ui.navAdminDb) {
            ui.navAdminDb.style.display = 'none';
        }
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
    currentUsername = null;
    if (ui.navAdminDb) {
        ui.navAdminDb.style.display = 'none';
    }
    showContainer('auth');
});

// Gameplay Logic
let isExploring = false;

function animateProgressBar(duration, callback) {
    ui.exploreProgressContainer.style.display = 'block';
    const fill = ui.exploreProgressFill;

    // Reset state instantly without transitions
    fill.classList.remove('animating');
    fill.style.width = '0%';

    // Force layout reflow to register the reset
    void fill.offsetWidth;

    // Defer transition application to ensure the 0% width layout frame is painted first
    setTimeout(() => {
        fill.style.transitionDuration = `${duration}ms`;
        fill.classList.add('animating');
    }, 20);

    setTimeout(() => {
        ui.exploreProgressContainer.style.display = 'none';
        fill.classList.remove('animating');
        fill.style.width = '0%';
        callback();
    }, duration + 20);
}

ui.exploreBtn.addEventListener('click', () => {
    if (isExploring) return;

    isExploring = true;
    ui.exploreBtn.disabled = true;
    ui.restBtn.disabled = true;

    socket.emit('exploreStart');
});

socket.on('exploreStarted', (data) => {
    isExploring = true;
    if (ui.actionArea) ui.actionArea.classList.add('is-exploring');
    if (ui.exploreProgressContainer) ui.exploreProgressContainer.classList.add('is-exploring');
    ui.exploreBtn.disabled = true;
    ui.restBtn.disabled = true;
    ui.encounterPrompt.style.display = 'none';

    const currentAreaKey = (data.state && data.state.currentArea) ? data.state.currentArea : getDefaultAreaKey();
    const area = (gameDb && gameDb.areas && gameDb.areas[currentAreaKey]) ? gameDb.areas[currentAreaKey] : { name: 'the Wilds' };
    ui.exploreStatus.textContent = `Rustling through ${area.name}...`;

    animateProgressBar(data.duration, () => {
        // Completion is server-authoritative
    });
});

ui.restBtn.addEventListener('click', () => {
    if (isExploring) return;
    socket.emit('rest');
});

function getObjectDiff(obj1, obj2) {
    const diff = {};
    const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
    keys.forEach(k => {
        const v1 = obj1 ? obj1[k] : undefined;
        const v2 = obj2 ? obj2[k] : undefined;
        if (JSON.stringify(v1) !== JSON.stringify(v2)) {
            diff[k] = { local: v1, server: v2 };
        }
    });
    return diff;
}

function showConflictModal(newDb, previousDb) {
    let modal = document.getElementById('db-conflict-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'db-conflict-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    
    const type = newDb.updatedType;
    const author = newDb.updatedBy || 'Another Admin';
    
    const oldEntries = previousDb ? previousDb[type] || {} : {};
    const newEntries = newDb[type] || {};
    
    const addedKeys = Object.keys(newEntries).filter(k => !oldEntries[k]);
    const deletedKeys = Object.keys(oldEntries).filter(k => !newEntries[k]);
    const modifiedKeys = Object.keys(newEntries).filter(k => oldEntries[k] && JSON.stringify(oldEntries[k]) !== JSON.stringify(newEntries[k]));
    
    let summaryHtml = `<strong>Admin ${author}</strong> has updated the <strong>${type}</strong> database.<br><br>`;
    
    if (addedKeys.length > 0) {
        summaryHtml += `✦ <strong>Added keys:</strong> ${addedKeys.join(', ')}<br>`;
    }
    if (deletedKeys.length > 0) {
        summaryHtml += `✦ <strong>Deleted keys:</strong> ${deletedKeys.join(', ')}<br>`;
    }
    if (modifiedKeys.length > 0) {
        summaryHtml += `✦ <strong>Modified keys:</strong> ${modifiedKeys.join(', ')}<br>`;
    }
    
    const isDirty = JSON.stringify(activeDbData) !== JSON.stringify(originalDbData);
    let diffHtml = '';
    if (isDirty) {
        summaryHtml += `<br><span style="color: var(--accent-red); font-weight: bold;">⚠️ WARNING: You have unsaved changes in your editor! If you accept the server's changes, your edits will be overwritten.</span>`;
        
        if (selectedEntryKey) {
            const localVal = activeDbData[selectedEntryKey];
            const serverVal = newEntries[selectedEntryKey];
            
            if (!serverVal) {
                diffHtml = `<div style="border: 2px solid var(--accent-red); padding: 1rem; background: rgba(201,74,74,0.05); font-family: var(--font-mono); font-size: 0.72rem; margin-top: 1rem; width: 100%;">
                    <strong>Entry "${selectedEntryKey}" was DELETED on the server.</strong>
                </div>`;
            } else {
                const diff = getObjectDiff(localVal, serverVal);
                const diffRows = Object.entries(diff).map(([field, values]) => {
                    return `<tr>
                        <td style="padding: 0.35rem; border-bottom: 1px solid var(--border-color); font-weight: bold;">${field}</td>
                        <td style="padding: 0.35rem; border-bottom: 1px solid var(--border-color); color: var(--accent-red); background: rgba(201,74,74,0.05);">${JSON.stringify(values.local)}</td>
                        <td style="padding: 0.35rem; border-bottom: 1px solid var(--border-color); color: var(--accent-green); background: rgba(89,124,94,0.05);">${JSON.stringify(values.server)}</td>
                    </tr>`;
                }).join('');
                
                if (diffRows) {
                    diffHtml = `
                    <div style="margin-top: 1rem; width: 100%;">
                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 0.5rem; text-transform: uppercase;">Field Diff for "${selectedEntryKey}":</div>
                        <div style="max-height: 200px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse; border: 2px solid var(--border-color); font-family: var(--font-mono); font-size: 0.7rem;">
                                <thead>
                                    <tr style="background: rgba(0,0,0,0.04);">
                                        <th style="padding: 0.35rem; border: 1.5px solid var(--border-color); text-align: left;">Field</th>
                                        <th style="padding: 0.35rem; border: 1.5px solid var(--border-color); text-align: left;">Your Value</th>
                                        <th style="padding: 0.35rem; border: 1.5px solid var(--border-color); text-align: left;">Server Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${diffRows}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
                }
            }
        }
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px; width: 100%; padding: 1.5rem; gap: 1rem;">
            <h3 style="font-family: var(--font-main); text-transform: uppercase; font-size: 1.1rem; border-bottom: 3px solid var(--border-color); padding-bottom: 0.5rem; margin: 0; color: var(--accent-red); display: flex; align-items: center; gap: 0.5rem;">
                ⚠️ DATABASE SYNC CONFLICT DETECTED
            </h3>
            <div style="font-size: 0.8rem; line-height: 1.45; color: var(--text-color);">
                ${summaryHtml}
                ${diffHtml}
            </div>
            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button id="conflict-keep-btn" class="nav-btn danger" style="padding: 0.5rem 1rem; font-size: 0.82rem; font-weight: 700; width: auto; margin: 0; box-shadow: 2px 2px 0px var(--accent-red);">
                    Keep My Local Version & Overwrite Server
                </button>
                <button id="conflict-sync-btn" class="nav-btn active" style="padding: 0.5rem 1rem; font-size: 0.82rem; font-weight: 700; width: auto; margin: 0; box-shadow: 2px 2px 0px var(--border-color);">
                    Overwrite with Server's Version
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    document.getElementById('conflict-keep-btn').onclick = () => {
        originalDbData = JSON.parse(JSON.stringify(newDb[type] || {}));
        if (adminDbCache) {
            adminDbCache[type] = newDb[type];
        }
        modal.style.display = 'none';
    };
    
    document.getElementById('conflict-sync-btn').onclick = () => {
        activeDbData = JSON.parse(JSON.stringify(newDb[type] || {}));
        originalDbData = JSON.parse(JSON.stringify(newDb[type] || {}));
        if (adminDbCache) {
            adminDbCache[type] = newDb[type];
        }
        
        initCategoryFilter();
        renderEntriesList();
        
        if (selectedEntryKey && activeDbData[selectedEntryKey]) {
            selectEntry(selectedEntryKey);
        } else {
            const keys = Object.keys(activeDbData);
            if (keys.length > 0) {
                selectEntry(keys[0]);
            } else {
                renderFormAndPreview(null);
            }
        }
        
        modal.style.display = 'none';
    };
}

socket.on('gameDatabase', (db) => {
    const previousGameDb = gameDb;
    gameDb = db;
    updateUIFromDatabase();
    if (lastState) {
        updateStatsDisplay(lastState);
    }
    if (typeof updateTravelDropdown === 'function' && lastState) {
        updateTravelDropdown(lastState);
    }
    if (ui.viewInventory.classList.contains('active')) {
        renderInventory();
    }
    if (ui.viewCrafting && ui.viewCrafting.classList.contains('active')) {
        renderCrafting();
    }

    if (db.updatedBy && db.updatedBy !== currentUsername && ui.viewAdminDb && ui.viewAdminDb.classList.contains('active') && activeDbTab === db.updatedType) {
        showConflictModal(db, previousGameDb);
    } else {
        if (adminDbCache && db.updatedType) {
            adminDbCache[db.updatedType] = db[db.updatedType];
        }
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
    if (ui.actionArea) ui.actionArea.classList.remove('is-exploring');
    if (ui.exploreProgressContainer) ui.exploreProgressContainer.classList.remove('is-exploring');
    ui.exploreBtn.disabled = false;
    ui.restBtn.disabled = false;
    ui.exploreStatus.textContent = 'Standby';

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

socket.on('itemBuyResult', (data) => {
    if (data.success) {
        logAction(data.message);
        updateStatsDisplay(data.state);
    } else {
        logAction(`[WARNING] ${data.message}`);
        alert(data.message);
    }
});

socket.on('itemCraftResult', (data) => {
    if (data.success) {
        logAction(data.message);
        updateStatsDisplay(data.state);
        if (ui.viewCrafting && ui.viewCrafting.classList.contains('active')) {
            renderCrafting();
        }
    } else {
        logAction(`[WARNING] ${data.message}`);
        alert(data.message);
    }
});

socket.on('forceLogout', (data) => {
    alert(data.message || 'You have been logged out.');
    socket.disconnect();
    checkAuth();
});

socket.on('statUpdate', (state) => {
    updateStatsDisplay(state);
    // Automatically keep the market select dropdown up to date if player inventory updates
    populateMarketSellDropdown();
    if (ui.viewCrafting && ui.viewCrafting.classList.contains('active')) {
        renderCrafting();
    }
});

socket.on('partyFeedback', (data) => {
    if (data.message) {
        alert(data.message);
    }
});

socket.on('partyUpdate', (data) => {
    if (!data) {
        currentPartyCode = null;
        if (ui.partySetupPanel) ui.partySetupPanel.style.display = 'flex';
        if (ui.partyLobbyPanel) ui.partyLobbyPanel.style.display = 'none';
        renderPlayerList();
        return;
    }

    currentPartyCode = data.lobbyCode;
    if (ui.partySetupPanel) ui.partySetupPanel.style.display = 'none';
    if (ui.partyLobbyPanel) ui.partyLobbyPanel.style.display = 'flex';

    if (ui.partyLobbyCodeDisplay) {
        ui.partyLobbyCodeDisplay.textContent = data.lobbyCode;
    }

    if (ui.partyMembersList) {
        ui.partyMembersList.innerHTML = '';
        data.members.forEach(member => {
            const memberCard = document.createElement('div');
            memberCard.style.display = 'flex';
            memberCard.style.alignItems = 'center';
            memberCard.style.justifyContent = 'space-between';
            memberCard.style.padding = '0.5rem 0.75rem';
            memberCard.style.border = '2px solid var(--border-color)';
            memberCard.style.background = 'var(--bg-color)';
            memberCard.style.fontFamily = 'var(--font-mono)';
            memberCard.style.fontSize = '0.85rem';
            
            const isSelf = member === currentUsername;
            const isLeader = member === data.leader;
            
            let nameTag = member;
            if (isSelf) nameTag += ' (You)';
            if (isLeader) nameTag = '⭐ ' + nameTag;

            memberCard.innerHTML = `
                <span style="font-weight:bold;">${nameTag}</span>
                <span style="font-size:0.75rem; text-transform:uppercase; color:${isLeader ? 'var(--accent-red)' : 'var(--text-color)'}; font-weight:700;">${isLeader ? 'Leader' : 'Member'}</span>
            `;
            
            ui.partyMembersList.appendChild(memberCard);
        });
    }
    renderPlayerList();
});

socket.on('questBoard', (data) => {
    renderQuestBoard(data);
});

socket.on('questResult', (data) => {
    if (data.success) {
        logAction(`[QUEST] ${data.message}`);
    } else {
        logAction(`[QUEST WARNING] ${data.message}`);
        alert(data.message);
    }
});

socket.on('marketListings', (data) => {
    if (data.success) {
        renderMarketListings(data.listings);
    }
});

socket.on('marketCreateResult', (data) => {
    if (data.success) {
        logAction(`[MARKET] ${data.message}`);
        alert(data.message);
        renderInventory();
        populateMarketSellDropdown();
    } else {
        logAction(`[MARKET WARNING] ${data.message}`);
        alert(data.message);
    }
});

socket.on('marketCancelResult', (data) => {
    if (data.success) {
        logAction(`[MARKET] ${data.message}`);
        alert(data.message);
        renderInventory();
        populateMarketSellDropdown();
    } else {
        logAction(`[MARKET WARNING] ${data.message}`);
        alert(data.message);
    }
});

socket.on('marketBuyResult', (data) => {
    if (data.success) {
        logAction(`[MARKET] ${data.message}`);
        alert(data.message);
        renderInventory();
        populateMarketSellDropdown();
    } else {
        logAction(`[MARKET WARNING] ${data.message}`);
        alert(data.message);
    }
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

function addLocalChatMessage(user, message) {
    if (!ui.chatMessages) return;
    const li = document.createElement('li');
    li.innerHTML = `<strong>${user}:</strong> ${message}`;
    ui.chatMessages.appendChild(li);
    while (ui.chatMessages.children.length > 100) {
        ui.chatMessages.removeChild(ui.chatMessages.firstChild);
    }
    ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
}

socket.on('chatMessage', (data) => {
    addLocalChatMessage(data.user, data.message);
});

socket.on('partyInvitation', (data) => {
    const accept = confirm(`${data.from} has invited you to join their party! (Lobby Code: ${data.lobbyCode})\n\nAccept invitation?`);
    if (accept) {
        socket.emit('partyJoin', { lobbyCode: data.lobbyCode });
    }
});

socket.on('update-player-list', (players) => {
    allPlayers = players || [];
    renderPlayerList();
});

function createPlayerCard(p) {
    const li = document.createElement('li');
    const isObj = typeof p === 'object' && p !== null;
    const username = isObj ? p.username : p;
    const isSelf = currentUsername && (username === currentUsername);
    li.className = isSelf ? 'player-card pc-self' : 'player-card';

    li.innerHTML = `
        <div class="pc-avatar pc-avatar-container"></div>
        <div class="pc-body">
            <div class="pc-header">
                <span class="pc-name">${username}</span>
                <span class="pc-level"></span>
                <span class="pc-status"></span>
                ${isSelf ? `<span class="pc-self-badge">YOU</span> <button class="pc-change-sprite-btn" style="padding: 0.15rem 0.4rem; font-size: 0.65rem; margin-left: 0.5rem; cursor: pointer; text-transform: uppercase; flex: none; width: auto;">Change Sprite</button>` : `<button class="pc-party-action-btn" style="display: none; padding: 0.15rem 0.4rem; font-size: 0.65rem; margin-left: auto; cursor: pointer; text-transform: uppercase; flex: none; width: auto; font-family: var(--font-mono); font-weight: 700; border: 2px solid var(--border-color); box-shadow: 1px 1px 0px var(--border-color);"></button>`}
            </div>

            <div class="pc-bars">
                <div class="pc-bar-row">
                    <span class="pc-bar-label">HP</span>
                    <div class="pc-bar-track">
                        <div class="pc-bar-fill hp-bar-fill"></div>
                    </div>
                    <span class="pc-bar-value hp-bar-val"></span>
                </div>
                <div class="pc-bar-row">
                    <span class="pc-bar-label">ST</span>
                    <div class="pc-bar-track">
                        <div class="pc-bar-fill st-bar-fill"></div>
                    </div>
                    <span class="pc-bar-value st-bar-val"></span>
                </div>
            </div>

            <div class="pc-stats-row">
                <span class="pc-stat"><span class="pc-stat-lbl">ATK</span> <span class="pc-stat-atk"></span></span>
                <span class="pc-stat"><span class="pc-stat-lbl">DEF</span> <span class="pc-stat-def"></span></span>
                <span class="pc-stat"><span class="pc-stat-lbl">⟁</span> <span class="pc-stat-coins"></span>c</span>
                <div class="pc-equipment-badges" style="display: inline-flex; gap: 0.35rem; flex-wrap: wrap;"></div>
            </div>
        </div>
    `;

    if (isSelf) {
        const btn = li.querySelector('.pc-change-sprite-btn');
        if (btn) {
            btn.addEventListener('click', () => openPlayerSpritePicker());
        }
    } else {
        const btn = li.querySelector('.pc-party-action-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                const targetLobby = p.lobbyCode;
                const targetUsername = username;
                if (targetLobby && targetLobby !== currentPartyCode) {
                    socket.emit('partyJoin', { lobbyCode: targetLobby });
                } else if (!targetLobby) {
                    socket.emit('partyInvite', { targetUsername });
                    addLocalChatMessage('System', `Party invitation sent to ${targetUsername}!`);
                }
            });
        }
    }

    updatePlayerCard(li, p);
    return li;
}

function updatePlayerCard(li, p) {
    const isObj = typeof p === 'object' && p !== null;
    const username = isObj ? p.username : p;
    const level = isObj ? (p.level || 1) : 1;
    const hp = isObj ? (p.hp || 0) : 0;
    const maxHp = isObj ? (p.maxHp || 50) : 50;
    const stamina = isObj ? (p.stamina || 0) : 100;
    const maxStam = isObj ? (p.maxStamina || 100) : 100;
    const attack = isObj ? (p.attack || 5) : 5;
    const defense = isObj ? (p.defense || 5) : 5;
    const coins = isObj ? (p.coins || 0) : 0;
    const status = isObj ? (p.status || 'Online') : 'Online';
    const equipment = isObj ? (p.equipment || {}) : {};

    const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    const stamPct = Math.max(0, Math.min(100, (stamina / maxStam) * 100));

    let statusClass = 'status-exploring';
    if (status === 'In Combat') statusClass = 'status-combat';
    else if (status === 'Encounter!') statusClass = 'status-encounter';

    const actionBtn = li.querySelector('.pc-party-action-btn');
    if (actionBtn) {
        const targetLobby = isObj ? p.lobbyCode : null;
        if (targetLobby && targetLobby !== currentPartyCode) {
            actionBtn.style.display = 'inline-block';
            actionBtn.textContent = 'Join';
            actionBtn.style.background = 'rgba(89, 124, 94, 0.1)';
            actionBtn.style.borderColor = 'var(--accent-green)';
            actionBtn.style.color = 'var(--accent-green)';
        } else if (!targetLobby) {
            actionBtn.style.display = 'inline-block';
            actionBtn.textContent = 'Invite';
            actionBtn.style.background = 'rgba(212, 160, 23, 0.1)';
            actionBtn.style.borderColor = '#d4a017';
            actionBtn.style.color = '#d4a017';
        } else {
            actionBtn.style.display = 'none';
        }
    }

    const statusEl = li.querySelector('.pc-status');
    if (statusEl) {
        statusEl.className = `pc-status ${statusClass}`;
        statusEl.textContent = status;
    }

    const levelEl = li.querySelector('.pc-level');
    if (levelEl) levelEl.textContent = `Lv.${level}`;

    const hpBar = li.querySelector('.hp-bar-fill');
    if (hpBar) {
        hpBar.style.width = `${hpPct}%`;
        let hpBarColor = 'var(--accent-green)';
        if (hpPct < 50) hpBarColor = '#d4a017';
        if (hpPct < 25) hpBarColor = 'var(--accent-red)';
        hpBar.style.background = hpBarColor;
    }
    const hpVal = li.querySelector('.hp-bar-val');
    if (hpVal) hpVal.textContent = `${hp}/${maxHp}`;

    const stBar = li.querySelector('.st-bar-fill');
    if (stBar) {
        stBar.style.width = `${stamPct}%`;
        stBar.style.background = 'var(--accent-green)';
    }
    const stVal = li.querySelector('.st-bar-val');
    if (stVal) stVal.textContent = `${stamina}/${maxStam}`;

    const atkEl = li.querySelector('.pc-stat-atk');
    if (atkEl) atkEl.textContent = attack;

    const defEl = li.querySelector('.pc-stat-def');
    if (defEl) defEl.textContent = defense;

    const coinsEl = li.querySelector('.pc-stat-coins');
    if (coinsEl) coinsEl.textContent = coins;

    const avatarContainer = li.querySelector('.pc-avatar-container');
    if (avatarContainer) {
        const initials = username.slice(0, 2).toUpperCase();
        const expectedHtml = isObj && p.sprite
            ? `<span style="position: absolute; z-index: 1; font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem; color: var(--bg-color);">${initials}</span>` +
            `<img src="/sprites/${p.sprite}" alt="${username}" class="pc-avatar-img" onerror="this.style.display='none'">`
            : initials;
        avatarContainer.style.position = 'relative';
        avatarContainer.style.overflow = 'hidden';
        avatarContainer.className = 'pc-avatar pc-avatar-container';
        if (avatarContainer.innerHTML !== expectedHtml) {
            avatarContainer.innerHTML = expectedHtml;
        }
    }

    const badgesContainer = li.querySelector('.pc-equipment-badges');
    if (badgesContainer) {
        let equipBadgesHtml = '';
        const slotsInfo = [
            { key: 'weapon', label: '⚔' },
            { key: 'armor', label: '⛨' },
            { key: 'helmet', label: '⛨' },
            { key: 'shield', label: '⛨' },
            { key: 'accessory', label: '◈' },
            { key: 'avatar', label: '☻' }
        ];

        let hasEquip = false;
        slotsInfo.forEach(slot => {
            const item = equipment[slot.key];
            if (item) {
                hasEquip = true;
                const rarityClass = `badge-${item.rarity || 'common'}`;
                equipBadgesHtml += `<span class="pc-equip-badge ${rarityClass}">${slot.label} ${item.name}</span>`;
            }
        });

        if (!hasEquip) {
            equipBadgesHtml = `<span class="pc-weapon pc-unarmed">⚔ Unarmed</span>`;
        }

        if (badgesContainer.innerHTML !== equipBadgesHtml) {
            badgesContainer.innerHTML = equipBadgesHtml;
        }
    }
}

function renderPlayerList() {
    const totalCount = allPlayers.length;
    ui.playerCountBadge.textContent = `${totalCount} Online`;

    const searchVal = ui.playerSearch.value.trim().toLowerCase();

    const filteredPlayers = allPlayers.filter(p => {
        const username = (typeof p === 'object' && p !== null) ? p.username : p;
        return username && username.toLowerCase().includes(searchVal);
    });

    if (filteredPlayers.length === 0) {
        ui.onlinePlayers.innerHTML = '<li class="player-card-empty">No matching players online.</li>';
        return;
    }

    reconcileList(
        ui.onlinePlayers,
        filteredPlayers,
        p => (typeof p === 'object' && p !== null) ? p.username : p,
        createPlayerCard,
        updatePlayerCard
    );
}

ui.playerSearch.addEventListener('input', () => {
    renderPlayerList();
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
    while (ui.combatLog.children.length > 100) {
        ui.combatLog.removeChild(ui.combatLog.firstChild);
    }
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

    // Wind-up indicator during the perfect parry window (final 700ms)
    const remainingTime = yokaiAttackSpeed - elapsed;
    if (remainingTime <= 700 && remainingTime > 0) {
        ui.combatYokaiAtkFill.style.background = 'var(--text-color)'; // Theme-appropriate high contrast color
    } else {
        ui.combatYokaiAtkFill.style.background = 'var(--accent-red)';
    }

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
    renderCombatSkills();
    flashElement(ui.viewCombat);

    // Start Monster Action Bar Animation
    monsterAttackStartTime = Date.now();
    animateMonsterAttack();
});

socket.on('combatPlayerHit', (data) => {
    ui.combatYokaiHp.textContent = data.yokaiHp;
    const pct = Math.min(100, Math.max(0, (data.yokaiHp / currentYokaiMaxHp) * 100));
    ui.combatYokaiHpFill.style.width = `${pct}%`;

    if (data.message) {
        logCombatAction(data.message);
    } else {
        logCombatAction(`[COMBAT] You struck the Yokai for ${data.damageDealt} damage.`);
    }
    flashElement(ui.combatYokaiHpFill.parentElement);
    if (data.state) {
        updateStatsDisplay(data.state);
    }
});

socket.on('combatMonsterAttack', (data) => {
    if (data.state) {
        updateStatsDisplay(data.state);
    }

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

    // Reset Monster Action Bar with new randomized speed
    if (data.nextSpeed) {
        yokaiAttackSpeed = data.nextSpeed;
    }
    monsterAttackStartTime = Date.now();
});

socket.on('combatFeedback', (data) => {
    ui.combatFeedback.textContent = data.message;
    if (typeof data.yokaiHp === 'number') {
        ui.combatYokaiHp.textContent = data.yokaiHp;
        const pct = Math.min(100, Math.max(0, (data.yokaiHp / currentYokaiMaxHp) * 100));
        ui.combatYokaiHpFill.style.width = `${pct}%`;
        flashElement(ui.combatYokaiHpFill.parentElement);
    }
    if (data.state) {
        updateStatsDisplay(data.state);
    }
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

    if (ui.combatPartyMembers) {
        ui.combatPartyMembers.style.display = 'none';
        ui.combatPartyMembers.innerHTML = '';
    }

    logCombatAction(data.message);
    logAction(data.message);

    if (data.leveledUp) {
        logAction(`[LEVEL UP] You reached level ${data.state.level}!`);
    }

    updateStatsDisplay(data.state);

    // Reset explore states back to normal!
    isExploring = false;
    if (ui.actionArea) ui.actionArea.classList.remove('is-exploring');
    if (ui.exploreProgressContainer) ui.exploreProgressContainer.classList.remove('is-exploring');
    ui.exploreBtn.disabled = false;
    ui.restBtn.disabled = false;
    ui.exploreStatus.textContent = 'Standby';

    setTimeout(() => {
        switchView('activity');
    }, 2500);
});

function renderCombatSkills() {
    const skillsContainer = document.getElementById('combat-weapon-skills');
    if (!skillsContainer) return;

    skillsContainer.innerHTML = '';
    skillsContainer.style.display = 'none';

    if (!lastState || !lastState.equipment || !gameDb || !gameDb.items || !gameDb.skills) {
        return;
    }

    const weaponKey = lastState.equipment.weapon;
    if (!weaponKey) return; // Unarmed players have no skills

    const weaponItem = gameDb.items[weaponKey];
    if (!weaponItem || !Array.isArray(weaponItem.skills) || weaponItem.skills.length === 0) {
        return;
    }

    skillsContainer.style.display = 'flex';

    weaponItem.skills.forEach(skillKey => {
        const skill = gameDb.skills[skillKey];
        if (!skill) return;

        const btn = document.createElement('button');
        btn.id = `combat-btn-skill-${skillKey}`;
        btn.className = 'skill-btn';
        btn.title = skill.desc;

        const baseText = `${skill.name} <span class="skill-cost">${skill.staminaCost}st</span>`;
        btn.innerHTML = baseText;

        // Click Handler
        btn.addEventListener('click', () => {
            if (activeCooldowns[skillKey]) return;
            if (lastState.stamina < skill.staminaCost) {
                ui.combatFeedback.textContent = "Not enough stamina!";
                setTimeout(() => { ui.combatFeedback.textContent = ''; }, 2000);
                return;
            }
            socket.emit('combatUseSkill', { skillKey });
            startButtonCooldown(btn.id, baseText, skill.cooldown, skillKey);
        });

        skillsContainer.appendChild(btn);
    });

    updateSkillButtonsDisabledState();
}

function updateSkillButtonsDisabledState() {
    if (!lastState || !lastState.equipment || !gameDb || !gameDb.items || !gameDb.skills) return;
    const weaponKey = lastState.equipment.weapon;
    if (!weaponKey) return;
    const weaponItem = gameDb.items[weaponKey];
    if (!weaponItem || !Array.isArray(weaponItem.skills)) return;

    weaponItem.skills.forEach(skillKey => {
        const btn = document.getElementById(`combat-btn-skill-${skillKey}`);
        if (!btn) return;

        const skill = gameDb.skills[skillKey];
        if (!skill) return;

        const isCooldown = !!activeCooldowns[skillKey];
        const hasStamina = lastState.stamina >= skill.staminaCost;

        if (isCooldown) {
            btn.disabled = true;
        } else if (!hasStamina) {
            btn.disabled = true;
            btn.title = `${skill.desc} (Insufficient Stamina: needs ${skill.staminaCost}st)`;
        } else {
            btn.disabled = false;
            btn.title = skill.desc;
        }
    });
}

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
            button.innerHTML = baseText;
            activeCooldowns[cooldownKey] = false;
            delete cooldownIntervals[cooldownKey];
            updateSkillButtonsDisabledState();
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = baseText;
            const textOnly = tempDiv.textContent || tempDiv.innerText || "";
            button.textContent = `${textOnly.replace(/\d+st$/, '').trim()} (${(remaining / 1000).toFixed(1)}s)`;
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
    if (gameDb && gameDb.skills) {
        Object.keys(gameDb.skills).forEach(k => {
            activeCooldowns[k] = false;
        });
    }

    if (ui.combatBtnStrike) {
        ui.combatBtnStrike.textContent = 'Strike';
        ui.combatBtnStrike.classList.remove('btn-cooldown');
    }
    if (ui.combatBtnParry) {
        ui.combatBtnParry.textContent = 'Parry';
        ui.combatBtnParry.classList.remove('btn-cooldown');
    }

    const skillsContainer = document.getElementById('combat-weapon-skills');
    if (skillsContainer) {
        skillsContainer.innerHTML = '';
        skillsContainer.style.display = 'none';
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
    if (ui.actionArea) ui.actionArea.classList.add('is-exploring');
    if (ui.exploreProgressContainer) ui.exploreProgressContainer.classList.add('is-exploring');
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
    if (ui.actionArea) ui.actionArea.classList.remove('is-exploring');
    if (ui.exploreProgressContainer) ui.exploreProgressContainer.classList.remove('is-exploring');
    ui.exploreBtn.disabled = false;
    ui.restBtn.disabled = false;
    ui.exploreStatus.textContent = 'Standby';
    logAction(data.message);
    updateStatsDisplay(data.state);
});

socket.on('combatFeedbackEncounter', (data) => {
    logAction(`[WARNING] ${data.message}`);
});

// Theme Toggle Logic
ui.themeToggleBtn.addEventListener('click', () => {
    // Locked to light theme for now
    localStorage.setItem('theme', 'light');
    document.body.classList.remove('dark-theme');
});

// Init & Load Theme (Locked to light mode)
localStorage.setItem('theme', 'light');
document.body.classList.remove('dark-theme');

// Inventory Filter & Pagination Listeners
function setupInventoryFilters() {
    const filters = [
        { btn: ui.invFilterAll, category: 'all' },
        { btn: ui.invFilterEquipped, category: 'equipped' },
        { btn: ui.invFilterWeapon, category: 'weapon' },
        { btn: ui.invFilterArmor, category: 'armor' },
        { btn: ui.invFilterAccessory, category: 'accessory' },
        { btn: ui.invFilterConsumable, category: 'consumable' },
        { btn: ui.invFilterMaterial, category: 'material' },
        { btn: ui.invFilterAvatar, category: 'avatar' }
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

// Market Filter & Pagination Listeners
function setupMarketFilters() {
    const filters = [
        { btn: ui.marketFilterAll, category: 'all' },
        { btn: ui.marketFilterWeapon, category: 'weapon' },
        { btn: ui.marketFilterArmor, category: 'armor' },
        { btn: ui.marketFilterAccessory, category: 'accessory' },
        { btn: ui.marketFilterConsumable, category: 'consumable' },
        { btn: ui.marketFilterMaterial, category: 'material' },
        { btn: ui.marketFilterAvatar, category: 'avatar' }
    ];

    filters.forEach(({ btn, category }) => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            filters.forEach(f => f.btn?.classList.remove('active'));
            btn.classList.add('active');
            marketCategory = category;
            marketPage = 1;
            renderMarketListings();
        });
    });

    if (ui.marketPrevPage) {
        ui.marketPrevPage.addEventListener('click', () => {
            if (marketPage > 1) {
                marketPage--;
                renderMarketListings();
            }
        });
    }

    if (ui.marketNextPage) {
        ui.marketNextPage.addEventListener('click', () => {
            marketPage++;
            renderMarketListings();
        });
    }
}

socket.on('equipResult', (data) => {
    if (data.success) {
        logAction(data.message);
        updateStatsDisplay(data.state);
        renderInventory();
    } else {
        logAction(`[WARNING] ${data.message}`);
        alert(data.message);
    }
});

setupInventoryFilters();
setupMarketFilters();

let activeDbTab = 'items';
let activeBackupFilter = 'all';

function switchDbPanel(panel) {
    // panel: 'editor' or 'backups'
    if (panel === 'backups') {
        if (ui.dbEditorPanel) ui.dbEditorPanel.style.display = 'none';
        if (ui.dbBackupsPanel) ui.dbBackupsPanel.style.display = 'flex';
        if (ui.dbSaveBtn) ui.dbSaveBtn.style.display = 'none';
        loadBackupsList();
    } else {
        if (ui.dbEditorPanel) ui.dbEditorPanel.style.display = 'flex';
        if (ui.dbBackupsPanel) ui.dbBackupsPanel.style.display = 'none';
        if (ui.dbSaveBtn) ui.dbSaveBtn.style.display = '';
    }

    // Update tab active states
    const allDbTabs = [ui.dbViewItems, ui.dbViewYokai, ui.dbViewActions, ui.dbViewAreas, ui.dbViewSkills, ui.dbViewPlayers, ui.dbViewBackups];
    allDbTabs.forEach(btn => { if (btn) btn.classList.remove('active'); });

    if (panel === 'backups') {
        if (ui.dbViewBackups) ui.dbViewBackups.classList.add('active');
    }
}

let activeDbData = {};
let adminDbCache = null;
let originalDbData = null;
let selectedEntryKey = null;
let isFormMode = true;
let allSprites = []; // cached list of sprites from server
let activePickerCallback = null;

async function fetchSpritesList() {
    try {
        const res = await fetch('/api/admin/sprites');
        if (res.ok) {
            const data = await res.json();
            allSprites = data.sprites || [];
            
            // Populate sprite folder dropdown
            if (ui.spriteFolderSelect) {
                const folders = new Set();
                allSprites.forEach(sprite => {
                    const parts = sprite.split('/');
                    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Base Sprites';
                    folders.add(folder);
                });
                
                const currentSelection = ui.spriteFolderSelect.value;
                ui.spriteFolderSelect.innerHTML = '<option value="all">All Folders</option>';
                
                Array.from(folders).sort().forEach(folder => {
                    const option = document.createElement('option');
                    option.value = folder;
                    option.textContent = folder;
                    ui.spriteFolderSelect.appendChild(option);
                });
                
                if (currentSelection !== 'all' && folders.has(currentSelection)) {
                    ui.spriteFolderSelect.value = currentSelection;
                } else if (currentSelection === 'all') {
                    ui.spriteFolderSelect.value = 'all';
                }
            }
        }
    } catch (err) {
        console.error("Failed to fetch sprites list:", err);
    }
}

async function loadAdminDatabase(type) {
    if (!ui.dbVisualizerInput) return;
    switchDbPanel('editor');
    activeDbTab = type;

    const tabs = [
        { btn: ui.dbViewItems, name: 'items' },
        { btn: ui.dbViewYokai, name: 'yokai' },
        { btn: ui.dbViewActions, name: 'actions' },
        { btn: ui.dbViewAreas, name: 'areas' },
        { btn: ui.dbViewSkills, name: 'skills' },
        { btn: ui.dbViewPlayers, name: 'players' }
    ];

    tabs.forEach(({ btn, name }) => {
        if (btn) {
            if (name === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
    if (ui.dbViewBackups) ui.dbViewBackups.classList.remove('active');

    // Clear details and sidebar selections
    selectedEntryKey = null;
    if (ui.dbFormContainer) ui.dbFormContainer.innerHTML = '';
    if (ui.dbItemPreviewCard) ui.dbItemPreviewCard.innerHTML = '';

    try {
        const res = await fetch('/api/admin/database');
        if (res.status === 401 || res.status === 403) {
            ui.dbVisualizerInput.value = 'ACCESS DENIED: You must be an administrator to view this database.';
            if (ui.dbFormContainer) ui.dbFormContainer.innerHTML = '<div style="color: var(--accent-red); font-weight: bold; text-align: center; padding: 2rem;">ACCESS DENIED</div>';
            return;
        }
        if (!res.ok) {
            throw new Error(`Failed to load database: ${res.statusText}`);
        }
        const data = await res.json();
        adminDbCache = data;

        if (type === 'items') {
            activeDbData = data.items || {};
        } else if (type === 'yokai') {
            activeDbData = data.yokai || {};
        } else if (type === 'actions') {
            activeDbData = data.actions || {};
        } else if (type === 'areas') {
            activeDbData = data.areas || {};
        } else if (type === 'skills') {
            activeDbData = data.skills || {};
        } else if (type === 'players') {
            activeDbData = data.players || {};
        }

        originalDbData = JSON.parse(JSON.stringify(activeDbData));

        ui.dbVisualizerInput.value = JSON.stringify(activeDbData, null, 2);

        // Load all sprites if not loaded
        if (allSprites.length === 0) {
            await fetchSpritesList();
        }

        // Build filters and render list
        initCategoryFilter();
        renderEntriesList();

        // Select first item by default if available
        const keys = Object.keys(activeDbData);
        if (keys.length > 0) {
            selectEntry(keys[0]);
        }
    } catch (err) {
        ui.dbVisualizerInput.value = `Error loading database: ${err.message}`;
    }
}

function findCrossReferences(type, key) {
    const refs = [];
    if (!adminDbCache) return refs;

    if (type === 'items') {
        if (adminDbCache.items) {
            Object.entries(adminDbCache.items).forEach(([iKey, item]) => {
                if (item && item.recipe && item.recipe.ingredients && item.recipe.ingredients[key]) {
                    refs.push({
                        type: 'items',
                        category: 'Recipe Ingredient',
                        label: `${item.name || iKey} (${iKey})`,
                        key: iKey
                    });
                }
            });
        }
        if (adminDbCache.yokai) {
            Object.entries(adminDbCache.yokai).forEach(([yKey, yokai]) => {
                if (yokai && yokai.loot && yokai.loot.guaranteed === key) {
                    refs.push({
                        type: 'yokai',
                        category: 'Guaranteed Drop',
                        label: `${yokai.name || yKey} (${yKey})`,
                        key: yKey
                    });
                }
            });
        }
        if (adminDbCache.areas) {
            Object.entries(adminDbCache.areas).forEach(([aKey, area]) => {
                if (area && area.lootPool && Array.isArray(area.lootPool) && area.lootPool.includes(key)) {
                    refs.push({
                        type: 'areas',
                        category: 'Area Forage Loot',
                        label: `${area.name || aKey} (${aKey})`,
                        key: aKey
                    });
                }
            });
        }
        if (adminDbCache.players) {
            Object.entries(adminDbCache.players).forEach(([pKey, pVal]) => {
                const state = pVal ? pVal.state : null;
                if (!state) return;
                let owned = false;
                if (state.inventory && state.inventory[key] > 0) {
                    owned = true;
                }
                if (state.equipment) {
                    Object.values(state.equipment).forEach(equippedKey => {
                        if (equippedKey === key) owned = true;
                    });
                }
                if (owned) {
                    refs.push({
                        type: 'players',
                        category: 'Player Inventory/Equip',
                        label: `${pKey} (Lv. ${state.level || 1})`,
                        key: pKey
                    });
                }
            });
        }
    } else if (type === 'yokai') {
        if (adminDbCache.areas) {
            Object.entries(adminDbCache.areas).forEach(([aKey, area]) => {
                if (area && area.yokaiPool && Array.isArray(area.yokaiPool) && area.yokaiPool.includes(key)) {
                    refs.push({
                        type: 'areas',
                        category: 'Area Yokai Pool',
                        label: `${area.name || aKey} (${aKey})`,
                        key: aKey
                    });
                }
            });
        }
    } else if (type === 'skills') {
        if (adminDbCache.items) {
            Object.entries(adminDbCache.items).forEach(([iKey, item]) => {
                if (item && item.skills && Array.isArray(item.skills) && item.skills.includes(key)) {
                    refs.push({
                        type: 'items',
                        category: 'Weapon Skill',
                        label: `${item.name || iKey} (${iKey})`,
                        key: iKey
                    });
                }
            });
        }
    } else if (type === 'areas') {
        if (adminDbCache.players) {
            Object.entries(adminDbCache.players).forEach(([pKey, pVal]) => {
                const state = pVal ? pVal.state : null;
                if (state && state.currentArea === key) {
                    refs.push({
                        type: 'players',
                        category: 'Player Current Location',
                        label: `${pKey} (Lv. ${state.level || 1})`,
                        key: pKey
                    });
                }
            });
        }
    }
    return refs;
}

window.selectDbEntry = async (type, key) => {
    if (activeDbTab !== type) {
        await loadAdminDatabase(type);
    }
    selectEntry(key);
};

function initCategoryFilter() {
    if (!ui.dbCategoryFilter) return;
    ui.dbCategoryFilter.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = 'all';
    defaultOption.textContent = 'All Types';
    ui.dbCategoryFilter.appendChild(defaultOption);

    if (activeDbTab === 'items') {
        const types = new Set();
        Object.values(activeDbData).forEach(item => {
            if (item.type) types.add(item.type);
        });

        // Ensure standard types are available
        ['material', 'consumable', 'weapon', 'helmet', 'shield', 'armor', 'accessory', 'avatar'].forEach(t => types.add(t));

        types.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type.toUpperCase();
            ui.dbCategoryFilter.appendChild(opt);
        });
    } else if (activeDbTab === 'yokai') {
        // Simple rarity / reward grouping for Yokai
        const rarities = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
        ui.dbCategoryFilter.innerHTML = ''; // reset completely
        rarities.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r === 'all' ? 'All Rarity rewards' : `Loot: ${r.toUpperCase()}`;
            ui.dbCategoryFilter.appendChild(opt);
        });
    } else if (activeDbTab === 'actions') {
        ui.dbCategoryFilter.innerHTML = '<option value="all">All Blocks</option>';
    } else if (activeDbTab === 'areas') {
        ui.dbCategoryFilter.innerHTML = '<option value="all">All Areas</option>';
    } else if (activeDbTab === 'skills') {
        ui.dbCategoryFilter.innerHTML = '<option value="all">All Skills</option>';
    } else if (activeDbTab === 'players') {
        ui.dbCategoryFilter.innerHTML = '<option value="all">All Players</option><option value="admins">Administrators</option>';
    }
}

function renderEntriesList() {
    if (!ui.dbEntriesList) return;
    ui.dbEntriesList.innerHTML = '';

    const searchVal = (ui.dbSearchInput ? ui.dbSearchInput.value.trim().toLowerCase() : '');
    const categoryVal = (ui.dbCategoryFilter ? ui.dbCategoryFilter.value : 'all');
    const sortVal = (ui.dbSortFilter ? ui.dbSortFilter.value : 'key-asc');

    let entries = Object.entries(activeDbData);

    // Filter
    entries = entries.filter(([key, data]) => {
        // Search
        const name = (data.name || '').toLowerCase();
        const desc = (data.desc || '').toLowerCase();
        const matchesSearch = key.toLowerCase().includes(searchVal) || name.includes(searchVal) || desc.includes(searchVal);
        if (!matchesSearch) return false;

        // Category Filter
        if (categoryVal !== 'all') {
            if (activeDbTab === 'items') {
                return data.type === categoryVal;
            } else if (activeDbTab === 'yokai') {
                // If filtering Yokai by loot rarity
                if (data.loot && data.loot.guaranteed) {
                    const lootItem = gameDb?.items?.[data.loot.guaranteed];
                    const lootRarity = lootItem ? (lootItem.rarity || 'common') : 'common';
                    return lootRarity === categoryVal;
                }
                return false;
            } else if (activeDbTab === 'players') {
                if (categoryVal === 'admins') {
                    return data.isAdmin === true;
                }
            }
        }
        return true;
    });

    // Sort
    entries.sort((a, b) => {
        const keyA = a[0];
        const keyB = b[0];
        const nameA = (a[1].name || '').toLowerCase();
        const nameB = (b[1].name || '').toLowerCase();
        const valA = a[1].value || 0;
        const valB = b[1].value || 0;

        if (sortVal === 'key-asc') return keyA.localeCompare(keyB);
        if (sortVal === 'key-desc') return keyB.localeCompare(keyA);
        if (sortVal === 'name-asc') return nameA.localeCompare(nameB);
        if (sortVal === 'name-desc') return nameB.localeCompare(nameA);
        if (sortVal === 'val-desc') return valB - valA;
        if (sortVal === 'val-asc') return valA - valB;
        return 0;
    });

    if (entries.length === 0) {
        ui.dbEntriesList.innerHTML = '<div style="text-align:center; padding:1rem; opacity:0.5; font-family:var(--font-mono); font-size:0.75rem;">No entries found</div>';
        return;
    }

    const createEntryRow = (key, val) => {
        const row = document.createElement('div');
        row.className = 'db-entry-row';
        if (key === selectedEntryKey) {
            row.classList.add('active');
        }

        // Icon / Sprite
        let iconHtml = '';
        if (activeDbTab === 'items' && val.sprite) {
            iconHtml = `<img src="/sprites/${val.sprite}" class="entry-icon" alt="">`;
        } else if (activeDbTab === 'yokai') {
            iconHtml = `<img src="/sprites/Emoji_Face_Demon_Devil_Horns.png" class="entry-icon" alt="">`;
        } else if (activeDbTab === 'areas') {
            iconHtml = `<img src="/sprites/Map_Markers_Travel_Map_Folded.png" class="entry-icon" alt="">`;
        } else if (activeDbTab === 'players') {
            let s = null;
            if (val && val.state) {
                s = val.state.sprite;
                if (!s && val.state.equipment && val.state.equipment.avatar) {
                    const avatarItem = gameDb?.items?.[val.state.equipment.avatar];
                    if (avatarItem && avatarItem.sprite) {
                        s = avatarItem.sprite;
                    }
                }
            }
            if (s) {
                iconHtml = `<img src="/sprites/${s}" class="entry-icon" style="border-radius: 50%; object-fit: cover;" alt="">`;
            } else {
                const initials = key.slice(0, 2).toUpperCase();
                iconHtml = `<div class="entry-icon" style="border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-family: var(--font-mono); font-weight: bold; background: rgba(0,0,0,0.05);">${initials}</div>`;
            }
        } else {
            iconHtml = `<img src="/sprites/Controller_Buttons_Menu_Options_Settings.png" class="entry-icon" alt="">`;
        }

        const labelText = val.name ? `${val.name} (${key})` : key;
        row.innerHTML = `
            ${iconHtml}
            <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${labelText}">${labelText}</span>
        `;

        row.addEventListener('click', () => {
            selectEntry(key);
        });
        return row;
    };

    const createSectionHeader = (title) => {
        const header = document.createElement('div');
        header.className = 'db-section-header';
        header.textContent = title;
        return header;
    };

    if (activeDbTab === 'items') {
        const buckets = {
            weapon: [],
            helmet: [],
            shield: [],
            armor: [],
            accessory: [],
            consumable: [],
            material: [],
            other: []
        };

        entries.forEach(([key, val]) => {
            const type = val.type || 'other';
            if (!buckets[type]) {
                buckets[type] = [];
            }
            buckets[type].push([key, val]);
        });

        const groupLabels = {
            weapon: 'Weapons',
            helmet: 'Helmets',
            shield: 'Shields',
            armor: 'Armor',
            accessory: 'Accessories',
            consumable: 'Consumables',
            material: 'Materials',
            avatar: 'Avatars',
            other: 'Other Items'
        };

        Object.keys(buckets).forEach(type => {
            const groupEntries = buckets[type];
            if (groupEntries && groupEntries.length > 0) {
                const label = groupLabels[type] || (type.charAt(0).toUpperCase() + type.slice(1));
                ui.dbEntriesList.appendChild(createSectionHeader(label));
                groupEntries.forEach(([key, val]) => {
                    ui.dbEntriesList.appendChild(createEntryRow(key, val));
                });
            }
        });
    } else if (activeDbTab === 'yokai') {
        ui.dbEntriesList.appendChild(createSectionHeader('Yokai Entities'));
        entries.forEach(([key, val]) => {
            ui.dbEntriesList.appendChild(createEntryRow(key, val));
        });
    } else if (activeDbTab === 'areas') {
        ui.dbEntriesList.appendChild(createSectionHeader('World Areas'));
        entries.forEach(([key, val]) => {
            ui.dbEntriesList.appendChild(createEntryRow(key, val));
        });
    } else if (activeDbTab === 'actions') {
        const playerActionKeys = ['strike', 'parry', 'flee', 'rest'];
        const playerActions = [];
        const systemConfigs = [];

        entries.forEach(([key, val]) => {
            if (playerActionKeys.includes(key)) {
                playerActions.push([key, val]);
            } else {
                systemConfigs.push([key, val]);
            }
        });

        if (playerActions.length > 0) {
            ui.dbEntriesList.appendChild(createSectionHeader('Player Actions'));
            playerActions.forEach(([key, val]) => {
                ui.dbEntriesList.appendChild(createEntryRow(key, val));
            });
        }

        if (systemConfigs.length > 0) {
            ui.dbEntriesList.appendChild(createSectionHeader('System Configurations'));
            systemConfigs.forEach(([key, val]) => {
                ui.dbEntriesList.appendChild(createEntryRow(key, val));
            });
        }
    } else if (activeDbTab === 'skills') {
        ui.dbEntriesList.appendChild(createSectionHeader('Weapon Skills'));
        entries.forEach(([key, val]) => {
            ui.dbEntriesList.appendChild(createEntryRow(key, val));
        });
    } else if (activeDbTab === 'players') {
        ui.dbEntriesList.appendChild(createSectionHeader('Player Accounts'));
        entries.forEach(([key, val]) => {
            ui.dbEntriesList.appendChild(createEntryRow(key, val));
        });
    }
}

function selectEntry(key) {
    selectedEntryKey = key;
    renderEntriesList();
    renderFormAndPreview(key);
}

function createFormField(f, onChange) {
    const row = document.createElement('div');
    row.className = 'db-form-row';

    const label = document.createElement('label');
    label.setAttribute('for', f.id);
    label.textContent = f.label;
    row.appendChild(label);

    let input;
    if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.id = f.id;
        input.value = f.value;
        input.addEventListener('input', () => onChange(input.value));
    } else if (f.type === 'select') {
        input = document.createElement('select');
        input.id = f.id;
        f.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt === '' ? 'None' : opt.toUpperCase();
            if (opt === f.value) option.selected = true;
            input.appendChild(option);
        });
        input.addEventListener('change', () => onChange(input.value));
    } else if (f.type === 'checkbox') {
        row.style.flexDirection = 'row';
        row.style.alignItems = 'center';
        row.style.gap = '0.75rem';

        input = document.createElement('input');
        input.type = 'checkbox';
        input.id = f.id;
        input.checked = f.value;
        input.style.width = '18px';
        input.style.height = '18px';
        input.style.cursor = 'pointer';
        input.style.accentColor = 'var(--accent-red)';
        input.style.flexShrink = '0';

        const badge = document.createElement('span');
        badge.style.fontFamily = 'var(--font-mono)';
        badge.style.fontSize = '0.7rem';
        badge.style.padding = '0.15rem 0.5rem';
        badge.style.border = '2px solid var(--border-color)';
        badge.style.letterSpacing = '1px';
        badge.textContent = f.value ? 'YES' : 'NO';
        badge.style.color = f.value ? '#4a7' : 'var(--accent-red)';

        input.addEventListener('change', () => {
            badge.textContent = input.checked ? 'YES' : 'NO';
            badge.style.color = input.checked ? '#4a7' : 'var(--accent-red)';
            onChange(input.checked);
        });

        row.appendChild(input);
        row.appendChild(badge);
        return row;
    } else if (f.type === 'sprite-picker') {
        const pickerWrapper = document.createElement('div');
        pickerWrapper.style.display = 'flex';
        pickerWrapper.style.gap = '0.5rem';

        input = document.createElement('input');
        input.type = 'text';
        input.id = f.id;
        input.value = f.value;
        input.style.flex = '1';
        input.addEventListener('input', () => onChange(input.value));

        const pickBtn = document.createElement('button');
        pickBtn.className = 'nav-btn';
        pickBtn.style.padding = '0.5rem';
        pickBtn.style.fontSize = '0.8rem';
        pickBtn.style.boxShadow = '2px 2px 0px var(--border-color)';
        pickBtn.style.width = 'auto';
        pickBtn.style.margin = '0';
        pickBtn.textContent = 'Browse';
        pickBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openSpriteInspector(input.value, true, (selectedSprite) => {
                input.value = selectedSprite;
                onChange(selectedSprite);
            });
        });

        pickerWrapper.appendChild(input);
        pickerWrapper.appendChild(pickBtn);
        row.appendChild(pickerWrapper);
        return row;
    } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
        input.id = f.id;
        input.value = f.value;
        if (f.readonly) input.readOnly = true;
        input.style.background = f.readonly ? 'rgba(0,0,0,0.03)' : '';
        input.addEventListener('input', () => {
            let val = input.value;
            if (f.type === 'number') {
                val = input.value.includes('.') ? parseFloat(input.value) : parseInt(input.value, 10);
                if (isNaN(val)) val = 0;
            }
            onChange(val);
        });
    }

    row.appendChild(input);

    if (f.help) {
        const helpEl = document.createElement('span');
        helpEl.style.fontSize = '0.7rem';
        helpEl.style.opacity = '0.6';
        helpEl.style.fontStyle = 'italic';
        helpEl.style.marginTop = '0.15rem';
        helpEl.textContent = f.help;
        row.appendChild(helpEl);
    }

    return row;
}

function buildDynamicObjectForm(obj, container, onChange, prefix = '') {
    if (typeof obj !== 'object' || obj === null) return;

    const keys = Object.keys(obj);
    keys.forEach(k => {
        const val = obj[k];
        const path = prefix ? `${prefix}.${k}` : k;

        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            const subHeader = document.createElement('div');
            subHeader.className = 'db-form-section-title';
            subHeader.style.fontSize = '0.82rem';
            subHeader.style.color = 'var(--text-color)';
            subHeader.style.marginTop = '0.5rem';
            subHeader.textContent = k.toUpperCase();
            container.appendChild(subHeader);

            const subContainer = document.createElement('div');
            subContainer.style.paddingLeft = '1rem';
            subContainer.style.borderLeft = '2px solid rgba(0,0,0,0.1)';
            subContainer.style.display = 'flex';
            subContainer.style.flexDirection = 'column';
            subContainer.style.gap = '0.5rem';
            container.appendChild(subContainer);

            buildDynamicObjectForm(val, subContainer, onChange, path);
        } else {
            let type = 'text';
            if (typeof val === 'number') type = 'number';

            const field = {
                id: `db-action-field-${path}`,
                label: k,
                type: type,
                value: Array.isArray(val) ? val.join(', ') : val
            };

            const row = createFormField(field, (newVal) => {
                if (Array.isArray(val)) {
                    obj[k] = newVal.split(',').map(s => s.trim()).filter(s => s !== '');
                } else {
                    obj[k] = newVal;
                }
                onChange();
            });

            if (activeDbTab === 'skills') {
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.gap = '0.5rem';
                wrapper.style.alignItems = 'flex-end';
                wrapper.style.width = '100%';

                row.style.flex = '1';
                wrapper.appendChild(row);

                const delBtn = document.createElement('button');
                delBtn.className = 'nav-btn danger';
                delBtn.style.padding = '0.6rem';
                delBtn.style.fontSize = '0.75rem';
                delBtn.style.margin = '0';
                delBtn.style.width = 'auto';
                delBtn.style.boxShadow = '2px 2px 0px var(--accent-red)';
                delBtn.textContent = 'Remove';
                delBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    delete obj[k];
                    renderFormAndPreview(selectedEntryKey);
                });

                wrapper.appendChild(delBtn);
                container.appendChild(wrapper);
            } else {
                container.appendChild(row);
            }
        }
    });
}

function renderFieldsInLayout(fields, layout, container, onChange) {
    const fieldMap = {};
    fields.forEach(f => {
        fieldMap[f.id] = f;
    });

    layout.forEach(row => {
        const rowFields = row.map(id => fieldMap[id]).filter(Boolean);
        if (rowFields.length === 0) return;

        if (rowFields.length === 1) {
            container.appendChild(createFormField(rowFields[0], (newVal) => onChange(rowFields[0], newVal)));
        } else {
            const grid = document.createElement('div');
            grid.className = 'db-form-grid';
            rowFields.forEach(f => {
                grid.appendChild(createFormField(f, (newVal) => onChange(f, newVal)));
            });
            container.appendChild(grid);
        }
    });
}

function renderFormAndPreview(key) {
    if (!ui.dbFormContainer) return;
    ui.dbFormContainer.innerHTML = '';

    const val = activeDbData[key];
    if (!val) {
        ui.dbFormContainer.innerHTML = '<div style="text-align:center; padding:2rem; opacity:0.5;">Select an entry to edit</div>';
        if (ui.dbItemPreviewCard) ui.dbItemPreviewCard.innerHTML = '';
        return;
    }

    if (activeDbTab === 'items') {
        const rarity = val.rarity || 'common';
        const type = val.type || 'material';

        const fields = [
            { id: 'db-field-key', label: 'Item Key / ID', type: 'text', value: key, readonly: true, help: 'Keys are unique identifiers and cannot be renamed once created.' },
            { id: 'db-field-name', label: 'Item Name', type: 'text', value: val.name || '' },
            { id: 'db-field-desc', label: 'Description', type: 'textarea', value: val.desc || '' },
            { id: 'db-field-type', label: 'Item Type', type: 'select', value: type, options: ['material', 'consumable', 'weapon', 'helmet', 'shield', 'armor', 'accessory', 'avatar'] },
            { id: 'db-field-rarity', label: 'Rarity', type: 'select', value: rarity, options: ['common', 'uncommon', 'rare', 'epic', 'legendary'] },
            { id: 'db-field-value', label: 'Base Value (Coins)', type: 'number', value: val.value || 0 },
            { id: 'db-field-shopListed', label: 'Listed in Shop', type: 'checkbox', value: val.shopListed !== false },
            { id: 'db-field-sprite', label: 'Sprite Filename', type: 'sprite-picker', value: val.sprite || '' }
        ];

        const layout = [
            ['db-field-key', 'db-field-name'],
            ['db-field-desc'],
            ['db-field-type', 'db-field-rarity'],
            ['db-field-value', 'db-field-shopListed'],
            ['db-field-sprite']
        ];

        renderFieldsInLayout(fields, layout, ui.dbFormContainer, (f, newVal) => {
            if (f.id === 'db-field-key') return;
            const fieldName = f.id.replace('db-field-', '');
            if (fieldName === 'shopListed') {
                if (newVal === true) delete val.shopListed; // true is default, clean it up
                else val.shopListed = false;
            } else {
                val[fieldName] = newVal;
            }
            if (fieldName === 'type') {
                if (['weapon', 'armor', 'helmet', 'shield', 'accessory'].includes(newVal) && !val.effects) {
                    val.effects = {};
                }
                if (newVal !== 'weapon') {
                    delete val.skills;
                }
                renderFormAndPreview(key);
            } else {
                updateLivePreview();
            }
        });

        const effectsHeader = document.createElement('div');
        effectsHeader.className = 'db-form-section-title';
        effectsHeader.textContent = 'Effects & Modifiers';
        ui.dbFormContainer.appendChild(effectsHeader);

        if (type === 'consumable') {
            if (!val.effects) val.effects = {};
            const effGrid = document.createElement('div');
            effGrid.className = 'db-form-grid';

            effGrid.appendChild(createFormField({ id: 'db-effect-hp', label: 'HP Restore Amount', type: 'number', value: val.effects.hpRestore || 0 }, (v) => {
                if (v === 0) delete val.effects.hpRestore;
                else val.effects.hpRestore = v;
                updateLivePreview();
            }));

            effGrid.appendChild(createFormField({ id: 'db-effect-stamina', label: 'Stamina Restore Amount', type: 'number', value: val.effects.staminaRestore || 0 }, (v) => {
                if (v === 0) delete val.effects.staminaRestore;
                else val.effects.staminaRestore = v;
                updateLivePreview();
            }));

            ui.dbFormContainer.appendChild(effGrid);
        } else if (['weapon', 'armor', 'helmet', 'shield', 'accessory'].includes(type)) {
            if (!val.effects) val.effects = {};
            const effGrid = document.createElement('div');
            effGrid.className = 'db-form-grid';

            effGrid.appendChild(createFormField({ id: 'db-effect-atk', label: 'Attack Bonus', type: 'number', value: val.effects.attackBonus || 0 }, (v) => {
                if (v === 0) delete val.effects.attackBonus;
                else val.effects.attackBonus = v;
                updateLivePreview();
            }));

            effGrid.appendChild(createFormField({ id: 'db-effect-def', label: 'Defense Bonus', type: 'number', value: val.effects.defenseBonus || 0 }, (v) => {
                if (v === 0) delete val.effects.defenseBonus;
                else val.effects.defenseBonus = v;
                updateLivePreview();
            }));

            effGrid.appendChild(createFormField({ id: 'db-effect-crit', label: 'Critical Chance (%)', type: 'number', value: val.effects.critChance || 0 }, (v) => {
                if (v === 0) delete val.effects.critChance;
                else val.effects.critChance = v;
                updateLivePreview();
            }));

            effGrid.appendChild(createFormField({ id: 'db-effect-lifesteal', label: 'Lifesteal (%)', type: 'number', value: val.effects.lifesteal || 0 }, (v) => {
                if (v === 0) delete val.effects.lifesteal;
                else val.effects.lifesteal = v;
                updateLivePreview();
            }));

            effGrid.appendChild(createFormField({ id: 'db-effect-poison', label: 'Poison Chance (%)', type: 'number', value: val.effects.poisonChance || 0 }, (v) => {
                if (v === 0) delete val.effects.poisonChance;
                else val.effects.poisonChance = v;
                updateLivePreview();
            }));

            effGrid.appendChild(createFormField({ id: 'db-effect-burn', label: 'Burn Chance (%)', type: 'number', value: val.effects.burnChance || 0 }, (v) => {
                if (v === 0) delete val.effects.burnChance;
                else val.effects.burnChance = v;
                updateLivePreview();
            }));

            ui.dbFormContainer.appendChild(effGrid);
        } else {
            const noEffText = document.createElement('div');
            noEffText.style.fontStyle = 'italic';
            noEffText.style.fontSize = '0.8rem';
            noEffText.style.opacity = '0.6';
            noEffText.textContent = 'This item type does not have stats/effects.';
            ui.dbFormContainer.appendChild(noEffText);
        }

        // --- Weapon Skills Section ---
        if (type === 'weapon') {
            const skillsHeader = document.createElement('div');
            skillsHeader.className = 'db-form-section-title';
            skillsHeader.textContent = 'Weapon Skills';
            skillsHeader.style.marginTop = '1.5rem';
            ui.dbFormContainer.appendChild(skillsHeader);

            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.gap = '0.5rem';
            wrapper.style.padding = '0.75rem';
            wrapper.style.border = '2px solid var(--border-color)';
            wrapper.style.background = 'var(--panel-bg)';
            wrapper.style.boxShadow = '2px 2px 0px var(--border-color)';

            if (!Array.isArray(val.skills)) {
                val.skills = [];
            }

            // 1. Selected Skills Tags Container
            const tagsContainer = document.createElement('div');
            tagsContainer.style.display = 'flex';
            tagsContainer.style.flexWrap = 'wrap';
            tagsContainer.style.gap = '0.35rem';

            const renderTags = () => {
                tagsContainer.innerHTML = '';
                if (val.skills.length === 0) {
                    const noSkillsText = document.createElement('div');
                    noSkillsText.style.fontStyle = 'italic';
                    noSkillsText.style.fontSize = '0.75rem';
                    noSkillsText.style.opacity = '0.5';
                    noSkillsText.style.padding = '0.2rem 0';
                    noSkillsText.textContent = 'No skills assigned to this weapon.';
                    tagsContainer.appendChild(noSkillsText);
                    return;
                }

                val.skills.forEach(skillKey => {
                    const skill = gameDb?.skills?.[skillKey] || { name: skillKey };
                    const skillName = skill.name || skillKey;

                    const tag = document.createElement('div');
                    tag.style.display = 'inline-flex';
                    tag.style.alignItems = 'center';
                    tag.style.gap = '0.35rem';
                    tag.style.background = 'var(--bg-color)';
                    tag.style.border = '1px solid var(--border-color)';
                    tag.style.padding = '0.15rem 0.5rem';
                    tag.style.fontSize = '0.72rem';
                    tag.style.fontFamily = 'var(--font-mono)';
                    tag.style.boxShadow = '1px 1px 0px var(--border-color)';

                    const label = document.createElement('span');
                    label.textContent = skillName;
                    label.title = skillKey;

                    const removeBtn = document.createElement('span');
                    removeBtn.textContent = '×';
                    removeBtn.style.cursor = 'pointer';
                    removeBtn.style.fontWeight = 'bold';
                    removeBtn.style.color = 'var(--accent-red)';
                    removeBtn.style.padding = '0 0.1rem';
                    removeBtn.style.fontSize = '0.9rem';
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        val.skills = val.skills.filter(s => s !== skillKey);
                        renderTags();
                        updateLivePreview();
                    });

                    tag.appendChild(label);
                    tag.appendChild(removeBtn);
                    tagsContainer.appendChild(tag);
                });
            };

            renderTags();
            wrapper.appendChild(tagsContainer);

            // 2. Search / Selection Dropdown Trigger
            const controlRow = document.createElement('div');
            controlRow.style.position = 'relative';
            controlRow.style.width = '100%';

            const addBtn = document.createElement('button');
            addBtn.className = 'nav-btn';
            addBtn.style.padding = '0.3rem 0.6rem';
            addBtn.style.fontSize = '0.75rem';
            addBtn.style.margin = '0';
            addBtn.style.boxShadow = '2px 2px 0px var(--border-color)';
            addBtn.textContent = '+ Assign Combat Skill';

            const dropdownPanel = document.createElement('div');
            dropdownPanel.style.display = 'none';
            dropdownPanel.style.position = 'absolute';
            dropdownPanel.style.top = '100%';
            dropdownPanel.style.left = '0';
            dropdownPanel.style.zIndex = '100';
            dropdownPanel.style.width = '100%';
            dropdownPanel.style.maxHeight = '200px';
            dropdownPanel.style.overflowY = 'auto';
            dropdownPanel.style.border = '2px solid var(--border-color)';
            dropdownPanel.style.background = 'var(--panel-bg)';
            dropdownPanel.style.boxShadow = '4px 4px 0px var(--border-color)';
            dropdownPanel.style.marginTop = '0.25rem';
            dropdownPanel.style.flexDirection = 'column';

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Search skills...';
            searchInput.style.width = '100%';
            searchInput.style.padding = '0.4rem';
            searchInput.style.border = 'none';
            searchInput.style.borderBottom = '2px solid var(--border-color)';
            searchInput.style.fontSize = '0.8rem';
            searchInput.style.background = 'var(--bg-color)';
            searchInput.style.color = 'var(--text-color)';

            const listContainer = document.createElement('div');
            listContainer.style.display = 'flex';
            listContainer.style.flexDirection = 'column';

            const updateDropdownList = () => {
                listContainer.innerHTML = '';
                const query = searchInput.value.toLowerCase().trim();
                const allSkills = gameDb && gameDb.skills ? Object.keys(gameDb.skills) : [];
                
                const unassignedSkills = allSkills.filter(sKey => !val.skills.includes(sKey));
                
                const filtered = unassignedSkills.filter(sKey => {
                    const skill = gameDb.skills[sKey];
                    const name = (skill.name || '').toLowerCase();
                    const desc = (skill.desc || '').toLowerCase();
                    return sKey.toLowerCase().includes(query) || name.includes(query) || desc.includes(query);
                });

                if (filtered.length === 0) {
                    const empty = document.createElement('div');
                    empty.style.padding = '0.5rem';
                    empty.style.fontSize = '0.75rem';
                    empty.style.opacity = '0.5';
                    empty.style.fontStyle = 'italic';
                    empty.style.textAlign = 'center';
                    empty.textContent = 'No matching unassigned skills';
                    listContainer.appendChild(empty);
                    return;
                }

                filtered.forEach(sKey => {
                    const skill = gameDb.skills[sKey];
                    const name = skill.name || sKey;

                    const option = document.createElement('div');
                    option.style.padding = '0.4rem 0.6rem';
                    option.style.cursor = 'pointer';
                    option.style.fontSize = '0.75rem';
                    option.style.borderBottom = '1px solid var(--border-color)';
                    option.style.display = 'flex';
                    option.style.flexDirection = 'column';
                    option.style.gap = '0.1rem';

                    option.innerHTML = `
                        <div style="font-weight:bold; font-family:var(--font-mono);">${name} (${sKey})</div>
                        <div style="opacity:0.6; font-size:0.7rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${skill.desc || 'No description'}</div>
                    `;

                    option.addEventListener('mouseenter', () => {
                        option.style.background = 'var(--border-color)';
                        option.style.color = 'var(--bg-color)';
                    });
                    option.addEventListener('mouseleave', () => {
                        option.style.background = '';
                        option.style.color = '';
                    });

                    option.addEventListener('click', () => {
                        val.skills.push(sKey);
                        renderTags();
                        updateLivePreview();
                        dropdownPanel.style.display = 'none';
                        searchInput.value = '';
                    });

                    listContainer.appendChild(option);
                });
            };

            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdownPanel.style.display === 'flex';
                if (isOpen) {
                    dropdownPanel.style.display = 'none';
                } else {
                    dropdownPanel.style.display = 'flex';
                    updateDropdownList();
                    setTimeout(() => searchInput.focus(), 50);
                }
            });

            searchInput.addEventListener('input', () => {
                updateDropdownList();
            });

            document.addEventListener('click', (e) => {
                if (!controlRow.contains(e.target)) {
                    dropdownPanel.style.display = 'none';
                }
            });

            dropdownPanel.appendChild(searchInput);
            dropdownPanel.appendChild(listContainer);
            controlRow.appendChild(addBtn);
            controlRow.appendChild(dropdownPanel);
            wrapper.appendChild(controlRow);

            ui.dbFormContainer.appendChild(wrapper);
        }

        // --- Crafting Recipe Section ---
        const recipeHeader = document.createElement('div');
        recipeHeader.className = 'db-form-section-title';
        recipeHeader.textContent = 'Crafting Recipe';
        recipeHeader.style.marginTop = '1.5rem';
        ui.dbFormContainer.appendChild(recipeHeader);

        if (!val.recipe) {
            const recipeNoneDiv = document.createElement('div');
            recipeNoneDiv.style.display = 'flex';
            recipeNoneDiv.style.flexDirection = 'column';
            recipeNoneDiv.style.gap = '0.5rem';

            const noRecipeText = document.createElement('div');
            noRecipeText.style.fontStyle = 'italic';
            noRecipeText.style.fontSize = '0.8rem';
            noRecipeText.style.opacity = '0.6';
            noRecipeText.textContent = 'This item cannot be crafted (no recipe).';
            recipeNoneDiv.appendChild(noRecipeText);

            const addRecipeBtn = document.createElement('button');
            addRecipeBtn.className = 'nav-btn';
            addRecipeBtn.style.padding = '0.4rem 0.8rem';
            addRecipeBtn.style.fontSize = '0.8rem';
            addRecipeBtn.style.width = 'fit-content';
            addRecipeBtn.style.boxShadow = '2px 2px 0px var(--border-color)';
            addRecipeBtn.textContent = '+ Add Recipe';
            addRecipeBtn.addEventListener('click', () => {
                val.recipe = { cost: 0, ingredients: {} };
                renderFormAndPreview(key);
                updateLivePreview();
            });
            recipeNoneDiv.appendChild(addRecipeBtn);

            ui.dbFormContainer.appendChild(recipeNoneDiv);
        } else {
            const recipeEditDiv = document.createElement('div');
            recipeEditDiv.style.display = 'flex';
            recipeEditDiv.style.flexDirection = 'column';
            recipeEditDiv.style.gap = '0.75rem';

            // Recipe Cost
            recipeEditDiv.appendChild(createFormField({
                id: 'db-recipe-cost',
                label: 'Recipe Coin Cost',
                type: 'number',
                value: val.recipe.cost || 0
            }, (v) => {
                val.recipe.cost = Math.max(0, parseInt(v) || 0);
                updateLivePreview();
            }));

            // Ingredients Title
            const ingredientsTitle = document.createElement('div');
            ingredientsTitle.style.fontWeight = 'bold';
            ingredientsTitle.style.fontSize = '0.85rem';
            ingredientsTitle.textContent = 'Ingredients:';
            recipeEditDiv.appendChild(ingredientsTitle);

            const ingredientsContainer = document.createElement('div');
            ingredientsContainer.style.display = 'flex';
            ingredientsContainer.style.flexDirection = 'column';
            ingredientsContainer.style.gap = '0.5rem';

            const ingredients = val.recipe.ingredients || {};
            const ingKeys = Object.keys(ingredients);

            if (ingKeys.length === 0) {
                const noIngText = document.createElement('div');
                noIngText.style.fontStyle = 'italic';
                noIngText.style.fontSize = '0.8rem';
                noIngText.style.opacity = '0.6';
                noIngText.textContent = 'No ingredients added yet.';
                ingredientsContainer.appendChild(noIngText);
            } else {
                ingKeys.forEach(ingKey => {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.alignItems = 'center';
                    row.style.gap = '0.5rem';

                    const ingName = activeDbData[ingKey] ? activeDbData[ingKey].name : ingKey;

                    const label = document.createElement('span');
                    label.style.flex = '1';
                    label.style.fontSize = '0.85rem';
                    label.textContent = `${ingName} (${ingKey})`;

                    const qtyInput = document.createElement('input');
                    qtyInput.type = 'number';
                    qtyInput.value = ingredients[ingKey];
                    qtyInput.min = '1';
                    qtyInput.style.width = '60px';
                    qtyInput.style.padding = '0.2rem';
                    qtyInput.addEventListener('input', () => {
                        ingredients[ingKey] = Math.max(1, parseInt(qtyInput.value) || 1);
                        updateLivePreview();
                    });

                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'nav-btn danger';
                    removeBtn.style.padding = '0.2rem 0.5rem';
                    removeBtn.style.fontSize = '0.75rem';
                    removeBtn.style.boxShadow = '1px 1px 0px var(--border-color)';
                    removeBtn.style.margin = '0';
                    removeBtn.textContent = 'Remove';
                    removeBtn.addEventListener('click', () => {
                        delete ingredients[ingKey];
                        renderFormAndPreview(key);
                        updateLivePreview();
                    });

                    row.appendChild(label);
                    row.appendChild(qtyInput);
                    row.appendChild(removeBtn);
                    ingredientsContainer.appendChild(row);
                });
            }

            recipeEditDiv.appendChild(ingredientsContainer);

            // Add Ingredient Control
            const addIngRow = document.createElement('div');
            addIngRow.style.display = 'flex';
            addIngRow.style.gap = '0.5rem';
            addIngRow.style.marginTop = '0.25rem';

            const ingSelect = document.createElement('select');
            ingSelect.style.flex = '1';
            ingSelect.style.padding = '0.3rem';

            // Populate select with all item keys except the current item
            Object.keys(activeDbData).forEach(itemKey => {
                if (itemKey !== key) {
                    const opt = document.createElement('option');
                    opt.value = itemKey;
                    opt.textContent = `${activeDbData[itemKey].name || itemKey} (${itemKey})`;
                    ingSelect.appendChild(opt);
                }
            });

            const addIngBtn = document.createElement('button');
            addIngBtn.className = 'nav-btn';
            addIngBtn.style.padding = '0.3rem 0.6rem';
            addIngBtn.style.fontSize = '0.8rem';
            addIngBtn.style.margin = '0';
            addIngBtn.style.boxShadow = '2px 2px 0px var(--border-color)';
            addIngBtn.textContent = '+ Add Ingredient';
            addIngBtn.addEventListener('click', () => {
                const selectedKey = ingSelect.value;
                if (selectedKey) {
                    ingredients[selectedKey] = 1;
                    renderFormAndPreview(key);
                    updateLivePreview();
                }
            });

            addIngRow.appendChild(ingSelect);
            addIngRow.appendChild(addIngBtn);
            recipeEditDiv.appendChild(addIngRow);

            // Remove Recipe Button
            const removeRecipeBtn = document.createElement('button');
            removeRecipeBtn.className = 'nav-btn danger';
            removeRecipeBtn.style.padding = '0.4rem 0.8rem';
            removeRecipeBtn.style.fontSize = '0.8rem';
            removeRecipeBtn.style.width = 'fit-content';
            removeRecipeBtn.style.marginTop = '0.5rem';
            removeRecipeBtn.style.boxShadow = '2px 2px 0px var(--accent-red)';
            removeRecipeBtn.textContent = 'Delete Recipe';
            removeRecipeBtn.addEventListener('click', () => {
                const confirmDelete = confirm('Are you sure you want to remove the crafting recipe for this item?');
                if (confirmDelete) {
                    delete val.recipe;
                    renderFormAndPreview(key);
                    updateLivePreview();
                }
            });
            recipeEditDiv.appendChild(removeRecipeBtn);

            ui.dbFormContainer.appendChild(recipeEditDiv);
        }

    } else if (activeDbTab === 'yokai') {
        const fields = [
            { id: 'db-field-key', label: 'Yokai Key / ID', type: 'text', value: key, readonly: true, help: 'Keys are unique identifiers and cannot be renamed.' },
            { id: 'db-field-name', label: 'Yokai Name', type: 'text', value: val.name || '' },
            { id: 'db-field-hp', label: 'Base HP', type: 'number', value: val.hp || 0 },
            { id: 'db-field-maxhp', label: 'Max HP', type: 'number', value: val.maxHp || 0 },
            { id: 'db-field-attack', label: 'Attack Power', type: 'number', value: val.attack || 0 },
            { id: 'db-field-defense', label: 'Defense Power', type: 'number', value: val.defense || 0 },
            { id: 'db-field-speed', label: 'Attack Speed Cooldown (ms)', type: 'number', value: val.speed || 3000 },
            { id: 'db-field-xpreward', label: 'XP Reward', type: 'number', value: val.xpReward || 0 },
            { id: 'db-field-coinreward', label: 'Coin Reward', type: 'number', value: val.coinReward || 0 }
        ];

        const layout = [
            ['db-field-key', 'db-field-name'],
            ['db-field-hp', 'db-field-maxhp'],
            ['db-field-attack', 'db-field-defense'],
            ['db-field-speed'],
            ['db-field-xpreward', 'db-field-coinreward']
        ];

        renderFieldsInLayout(fields, layout, ui.dbFormContainer, (f, newVal) => {
            if (f.id === 'db-field-key') return;
            const fieldName = f.id.replace('db-field-', '');
            val[fieldName] = newVal;
            updateLivePreview();
        });

        const lootHeader = document.createElement('div');
        lootHeader.className = 'db-form-section-title';
        lootHeader.textContent = 'Loot & Drops';
        ui.dbFormContainer.appendChild(lootHeader);

        if (!val.loot) val.loot = { guaranteed: null, bonusChance: 0 };

        const itemKeys = Object.keys(gameDb?.items || {});
        const lootGrid = document.createElement('div');
        lootGrid.className = 'db-form-grid';

        const guaranteedField = {
            id: 'db-loot-guaranteed',
            label: 'Guaranteed Drop Item',
            type: 'select',
            value: val.loot.guaranteed || '',
            options: ['', ...itemKeys]
        };

        lootGrid.appendChild(createFormField(guaranteedField, (v) => {
            val.loot.guaranteed = v || null;
            updateLivePreview();
        }));

        lootGrid.appendChild(createFormField({ id: 'db-loot-chance', label: 'Bonus Drop Chance (0-1)', type: 'number', value: val.loot.bonusChance || 0 }, (v) => {
            val.loot.bonusChance = Math.min(1.0, Math.max(0.0, parseFloat(v) || 0));
            updateLivePreview();
        }));

        ui.dbFormContainer.appendChild(lootGrid);

    } else if (activeDbTab === 'areas') {
        const fields = [
            { id: 'db-field-key', label: 'Area Key / ID', type: 'text', value: key, readonly: true, help: 'Unique Area identifier.' },
            { id: 'db-field-name', label: 'Area Name', type: 'text', value: val.name || '' },
            { id: 'db-field-desc', label: 'Description', type: 'textarea', value: val.desc || '' },
            { id: 'db-field-minlevel', label: 'Min Level Requirement', type: 'number', value: val.minLevel || 1 },
            { id: 'db-field-encounterchance', label: 'Yokai Encounter Chance (0-1)', type: 'number', value: val.encounterChance || 0 },
            { id: 'db-field-foragechance', label: 'Forage Loot Chance (0-1)', type: 'number', value: val.forageChance || 0 },
            { id: 'db-field-difficulty', label: 'Difficulty Multiplier', type: 'number', value: val.difficultyMultiplier || 1.0 },
            { id: 'db-field-background', label: 'Area Background Image', type: 'sprite-picker', value: val.background || '', help: 'Pick a sprite asset for the area background.' }
        ];

        const layout = [
            ['db-field-key', 'db-field-name'],
            ['db-field-desc'],
            ['db-field-minlevel', 'db-field-difficulty'],
            ['db-field-encounterchance', 'db-field-foragechance'],
            ['db-field-background']
        ];

        renderFieldsInLayout(fields, layout, ui.dbFormContainer, (f, newVal) => {
            if (f.id === 'db-field-key') return;
            const fieldName = f.id === 'db-field-difficulty' ? 'difficultyMultiplier' :
                f.id === 'db-field-minlevel' ? 'minLevel' :
                    f.id === 'db-field-encounterchance' ? 'encounterChance' :
                        f.id === 'db-field-foragechance' ? 'forageChance' :
                            f.id.replace('db-field-', '');
            val[fieldName] = newVal;
            updateLivePreview();
        });

        const poolsHeader = document.createElement('div');
        poolsHeader.className = 'db-form-section-title';
        poolsHeader.textContent = 'Encounter & Forage Pools';
        ui.dbFormContainer.appendChild(poolsHeader);

        const yokaiKeys = Object.keys(gameDb?.yokai || {});
        const itemKeys = Object.keys(gameDb?.items || {});

        const yokaiPoolField = {
            id: 'db-field-yokaipool',
            label: 'Yokai Encounter Pool (comma-separated)',
            type: 'text',
            value: Array.isArray(val.yokaiPool) ? val.yokaiPool.join(', ') : '',
            help: `Available Yokai: ${yokaiKeys.join(', ')}`
        };
        ui.dbFormContainer.appendChild(createFormField(yokaiPoolField, (newVal) => {
            val.yokaiPool = newVal.split(',').map(s => s.trim()).filter(s => s !== '');
            updateLivePreview();
        }));

        const lootPoolField = {
            id: 'db-field-lootpool',
            label: 'Loot Forage Pool (comma-separated)',
            type: 'text',
            value: Array.isArray(val.lootPool) ? val.lootPool.join(', ') : '',
            help: `Available Items: ${itemKeys.join(', ')}`
        };
        ui.dbFormContainer.appendChild(createFormField(lootPoolField, (newVal) => {
            val.lootPool = newVal.split(',').map(s => s.trim()).filter(s => s !== '');
            updateLivePreview();
        }));

    } else if (activeDbTab === 'actions') {
        const titleEl = document.createElement('div');
        titleEl.className = 'db-form-section-title';
        titleEl.textContent = `Action Block: ${key.toUpperCase()}`;
        ui.dbFormContainer.appendChild(titleEl);

        buildDynamicObjectForm(val, ui.dbFormContainer, () => {
            updateLivePreview();
        });
    } else if (activeDbTab === 'skills') {
        const fields = [
            { id: 'db-field-key', label: 'Skill Key / ID', type: 'text', value: key, readonly: true, help: 'Keys are unique identifiers.' },
            { id: 'db-field-name', label: 'Skill Name', type: 'text', value: val.name || '' },
            { id: 'db-field-desc', label: 'Description', type: 'textarea', value: val.desc || '' },
            { id: 'db-field-staminacost', label: 'Stamina Cost', type: 'number', value: val.staminaCost || 0 },
            { id: 'db-field-cooldown', label: 'Cooldown (ms)', type: 'number', value: val.cooldown || 0 }
        ];

        fields.forEach(f => {
            ui.dbFormContainer.appendChild(createFormField(f, (newVal) => {
                if (f.id === 'db-field-key') return;
                const fieldName = f.id === 'db-field-staminacost' ? 'staminaCost' : f.id.replace('db-field-', '');
                val[fieldName] = newVal;
                updateLivePreview();
            }));
        });

        const effectsHeader = document.createElement('div');
        effectsHeader.className = 'db-form-section-title';
        effectsHeader.textContent = 'Skill Effects';
        ui.dbFormContainer.appendChild(effectsHeader);

        if (!val.effects) val.effects = {};
        buildDynamicObjectForm(val.effects, ui.dbFormContainer, () => {
            updateLivePreview();
        });

        const addEffectWrapper = document.createElement('div');
        addEffectWrapper.style.display = 'flex';
        addEffectWrapper.style.gap = '0.5rem';
        addEffectWrapper.style.marginTop = '0.75rem';
        addEffectWrapper.style.alignItems = 'center';

        const effectSelect = document.createElement('select');
        effectSelect.style.padding = '0.6rem 0.8rem';
        effectSelect.style.fontFamily = 'var(--font-mono)';
        effectSelect.style.fontSize = '0.82rem';
        effectSelect.style.border = '2px solid var(--border-color)';
        effectSelect.style.background = 'transparent';
        effectSelect.style.color = 'var(--text-color)';
        effectSelect.style.outline = 'none';

        const availableEffects = [
            { key: 'damageMultiplier', label: 'Damage Multiplier (number)', default: 1.0 },
            { key: 'healAmount', label: 'Heal Amount (number)', default: 20 },
            { key: 'ignoreDefense', label: 'Ignore Defense (boolean)', default: true },
            { key: 'inflictEffect', label: 'Inflict Effect (string)', default: 'burned' },
            { key: 'effectTicks', label: 'Effect Ticks (number)', default: 3 }
        ];

        const currentEffectKeys = Object.keys(val.effects);
        const addable = availableEffects.filter(eff => !currentEffectKeys.includes(eff.key));

        if (addable.length > 0) {
            addable.forEach(eff => {
                const opt = document.createElement('option');
                opt.value = eff.key;
                opt.textContent = eff.label;
                effectSelect.appendChild(opt);
            });

            const addBtn = document.createElement('button');
            addBtn.className = 'nav-btn';
            addBtn.style.padding = '0.6rem 1rem';
            addBtn.style.fontSize = '0.82rem';
            addBtn.style.margin = '0';
            addBtn.style.width = 'auto';
            addBtn.style.boxShadow = '2px 2px 0px var(--border-color)';
            addBtn.textContent = 'Add Effect';

            addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedKey = effectSelect.value;
                const effObj = availableEffects.find(eff => eff.key === selectedKey);
                if (effObj) {
                    val.effects[selectedKey] = effObj.default;
                    renderFormAndPreview(key);
                }
            });

            addEffectWrapper.appendChild(effectSelect);
            addEffectWrapper.appendChild(addBtn);
            ui.dbFormContainer.appendChild(addEffectWrapper);
        }
    } else if (activeDbTab === 'players') {
        if (!val.state) val.state = {};
        if (!val.state.stats) val.state.stats = {};

        const fields = [
            { id: 'db-field-key', label: 'Username', type: 'text', value: key, readonly: true },
            { id: 'db-field-isadmin', label: 'Is Administrator', type: 'checkbox', value: val.isAdmin === true },
            { id: 'db-field-level', label: 'Player Level', type: 'number', value: val.state.level || 1 },
            { id: 'db-field-coins', label: 'Coins Balance', type: 'number', value: val.state.coins || 0 },
            { id: 'db-field-stamina', label: 'Current Stamina', type: 'number', value: val.state.stamina || 100 },
            { id: 'db-field-maxstamina', label: 'Max Stamina', type: 'number', value: val.state.maxStamina || 100 },
            { id: 'db-field-health', label: 'Current Health', type: 'number', value: val.state.stats.health || 50 },
            { id: 'db-field-maxhealth', label: 'Max Health', type: 'number', value: val.state.stats.maxHealth || 50 },
            { id: 'db-field-attack', label: 'Base Attack', type: 'number', value: val.state.stats.attack || 5 },
            { id: 'db-field-defense', label: 'Base Defense', type: 'number', value: val.state.stats.defense || 5 }
        ];

        const layout = [
            ['db-field-key', 'db-field-isadmin'],
            ['db-field-level', 'db-field-coins'],
            ['db-field-stamina', 'db-field-maxstamina'],
            ['db-field-health', 'db-field-maxhealth'],
            ['db-field-attack', 'db-field-defense']
        ];

        renderFieldsInLayout(fields, layout, ui.dbFormContainer, (f, newVal) => {
            if (f.id === 'db-field-key') return;
            
            if (f.id === 'db-field-isadmin') {
                val.isAdmin = newVal;
            } else if (f.id === 'db-field-level') {
                val.state.level = newVal;
            } else if (f.id === 'db-field-coins') {
                val.state.coins = newVal;
            } else if (f.id === 'db-field-stamina') {
                val.state.stamina = newVal;
            } else if (f.id === 'db-field-maxstamina') {
                val.state.maxStamina = newVal;
            } else if (f.id === 'db-field-health') {
                val.state.stats.health = newVal;
            } else if (f.id === 'db-field-maxhealth') {
                val.state.stats.maxHealth = newVal;
            } else if (f.id === 'db-field-attack') {
                val.state.stats.attack = newVal;
            } else if (f.id === 'db-field-defense') {
                val.state.stats.defense = newVal;
            }
            updateLivePreview();
        });
    }

    updateLivePreview();
}

function updateLivePreview() {
    if (!ui.dbItemPreviewCard) return;
    ui.dbItemPreviewCard.innerHTML = '';

    const val = activeDbData[selectedEntryKey];
    if (!val) return;

    if (activeDbTab === 'items') {
        const rarity = val.rarity || 'common';
        const type = val.type || 'material';

        const card = document.createElement('div');
        card.className = `inventory-item item-rarity-${rarity}`;
        card.style.flexDirection = 'column';
        card.style.alignItems = 'stretch';
        card.style.margin = '0';
        card.style.width = '100%';
        card.style.gap = '0.75rem';

        let statsHtml = '';
        if (val.effects) {
            if (val.effects.hpRestore) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-green); font-weight:700;">♥ Restores ${val.effects.hpRestore} HP</div>`;
            if (val.effects.staminaRestore) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-green); font-weight:700;">◆ Restores ${val.effects.staminaRestore} Stamina</div>`;
            if (val.effects.attackBonus) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-red); font-weight:700;">⚔ +${val.effects.attackBonus} Attack</div>`;
            if (val.effects.defenseBonus) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-green); font-weight:700;">⛨ +${val.effects.defenseBonus} Defense</div>`;
            if (val.effects.critChance) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-red); font-weight:700;">❖ +${val.effects.critChance}% Critical Chance</div>`;
            if (val.effects.lifesteal) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-red); font-weight:700;">▲ +${val.effects.lifesteal}% Lifesteal</div>`;
            if (val.effects.poisonChance) statsHtml += `<div style="font-size:0.75rem; color:purple; font-weight:700;">☠ +${val.effects.poisonChance}% Poison Chance</div>`;
            if (val.effects.burnChance) statsHtml += `<div style="font-size:0.75rem; color:orange; font-weight:700;">☼ +${val.effects.burnChance}% Burn Chance</div>`;
        }

        const imgHtml = val.sprite
            ? `<img src="/sprites/${val.sprite}" class="item-sprite" alt="${val.name}" style="width:48px; height:48px; object-fit:contain; image-rendering:pixelated; border:2px solid var(--border-color); background:var(--panel-bg); cursor:pointer; align-self:center; box-shadow: 2px 2px 0px var(--border-color);" title="Click to inspect sprite">`
            : `<div style="width:48px; height:48px; border:2px dashed var(--border-color); background:var(--panel-bg); display:flex; align-items:center; justify-content:center; align-self:center; font-size:1.5rem;">?</div>`;

        let recipeHtml = '';
        if (val.recipe) {
            const recipe = val.recipe;
            const cost = recipe.cost || 0;
            const ingredients = recipe.ingredients || {};
            let ingListHtml = '';
            Object.entries(ingredients).forEach(([ingKey, qty]) => {
                const ingItem = activeDbData[ingKey];
                const ingName = ingItem ? ingItem.name : ingKey;
                ingListHtml += `<div style="font-size:0.7rem; color:var(--text-color); opacity:0.8;">• ${qty}x ${ingName}</div>`;
            });
            recipeHtml = `
                <div style="margin-top:0.5rem; border-top:1px dashed var(--border-color); padding-top:0.5rem; width:100%; text-align:center;">
                    <span style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--accent-red);">[Craftable]</span>
                    ${cost > 0 ? `<div style="font-size:0.7rem; font-family:var(--font-mono); font-weight:bold;">Cost: ${cost} coins</div>` : ''}
                    <div style="margin-top:0.2rem;">
                        ${ingListHtml || '<div style="font-size:0.7rem; font-style:italic;">No ingredients</div>'}
                    </div>
                </div>
            `;
        }

        let skillsHtml = '';
        if (type === 'weapon' && Array.isArray(val.skills) && val.skills.length > 0) {
            let skillBadges = val.skills.map(sKey => {
                const skill = gameDb?.skills?.[sKey] || { name: sKey };
                return `<span style="font-family:var(--font-mono); font-size:0.65rem; background:rgba(0,0,0,0.1); border:1px solid var(--border-color); padding:0.1rem 0.3rem; border-radius:2px;">${skill.name || sKey}</span>`;
            }).join(' ');
            skillsHtml = `
                <div style="margin-top:0.5rem; border-top:1px dashed var(--border-color); padding-top:0.5rem; width:100%; text-align:center;">
                    <span style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--accent-red); letter-spacing:1px;">[Weapon Skills]</span>
                    <div style="display:flex; flex-wrap:wrap; gap:0.25rem; justify-content:center; margin-top:0.25rem;">
                        ${skillBadges}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            ${imgHtml}
            <div class="item-info" style="gap: 0.25rem;">
                <div class="item-name-qty" style="flex-wrap:wrap; gap:0.5rem; justify-content:center;">
                    <span class="item-name" style="font-size:0.95rem; text-align:center; width:100%;">${val.name || selectedEntryKey}</span>
                    <span class="rarity-badge badge-${rarity}" style="font-size:0.6rem; padding:0.1rem 0.3rem;">${rarity.toUpperCase()}</span>
                    <span class="item-qty" style="font-size:0.6rem; padding:0.1rem 0.3rem;">${type.toUpperCase()}</span>
                </div>
                <p class="item-desc" style="font-size:0.8rem; text-align:center; opacity:0.8; margin-top:0.25rem;">${val.desc || 'No description provided.'}</p>
                <div style="display:flex; flex-direction:column; align-items:center; margin-top:0.25rem; gap:0.15rem;">
                    ${statsHtml}
                    <div style="font-size:0.75rem; font-family:var(--font-mono); font-weight:700; margin-top:0.25rem; background:rgba(0,0,0,0.05); padding:0.1rem 0.4rem; border:1px solid var(--border-color);">⟁ Price: ${val.value || 0} coins</div>
                </div>
                ${recipeHtml}
                ${skillsHtml}
            </div>
        `;

        const img = card.querySelector('.item-sprite');
        if (img) {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                openSpriteInspector(val.sprite);
            });
        }

        ui.dbItemPreviewCard.appendChild(card);

    } else if (activeDbTab === 'yokai') {
        const card = document.createElement('div');
        card.className = `yokai-card`;
        card.style.border = '2px solid var(--border-color)';
        card.style.background = 'var(--bg-color)';
        card.style.padding = '1.25rem';
        card.style.boxShadow = '4px 4px 0px var(--border-color)';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'center';
        card.style.width = '100%';
        card.style.gap = '0.5rem';

        let lootInfo = 'None';
        if (val.loot && val.loot.guaranteed) {
            const item = gameDb?.items?.[val.loot.guaranteed] || { name: val.loot.guaranteed };
            lootInfo = `${item.name} (${Math.floor(val.loot.bonusChance * 100)}% bonus chance)`;
        }

        card.innerHTML = `
            <h3 style="text-transform: uppercase; font-size: 1rem; letter-spacing: 1px; border-bottom: 2px solid var(--border-color); padding-bottom: 0.35rem; width: 100%; text-align: center; margin-bottom: 0.5rem;">${val.name || selectedEntryKey}</h3>
            <div style="display:flex; flex-direction:column; width:100%; font-family:var(--font-mono); font-size:0.72rem; gap:0.25rem;">
                <div style="display:flex; justify-content:space-between;"><span>♥ HP:</span> <strong>${val.hp} / ${val.maxHp}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>⚔ ATK:</span> <strong>${val.attack}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>⛨ DEF:</span> <strong>${val.defense}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>◆ SPD Cooldown:</span> <strong>${val.speed}ms</strong></div>
                <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border-color); padding-top:0.25rem;"><span>◈ XP Reward:</span> <strong>${val.xpReward}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>⟁ Coins Reward:</span> <strong>${val.coinReward}</strong></div>
                <div style="display:flex; flex-direction:column; border-top:1px dashed var(--border-color); padding-top:0.25rem; word-break:break-all;">
                    <span>❖ Drop:</span>
                    <strong style="color:var(--accent-green); margin-top:0.1rem;">${lootInfo}</strong>
                </div>
            </div>
        `;
        ui.dbItemPreviewCard.appendChild(card);

    } else if (activeDbTab === 'areas') {
        const card = document.createElement('div');
        card.style.border = '2px solid var(--border-color)';
        card.style.background = 'var(--panel-bg)';
        card.style.padding = '1.25rem';
        card.style.boxShadow = '4px 4px 0px var(--border-color)';
        card.style.width = '100%';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '0.5rem';

        const yPool = Array.isArray(val.yokaiPool) ? val.yokaiPool.join(', ') : 'None';
        const lPool = Array.isArray(val.lootPool) ? val.lootPool.join(', ') : 'None';

        let bgPreviewHtml = '';
        if (val.background) {
            bgPreviewHtml = `<div style="width:100%; height:80px; border:2px solid var(--border-color); background-image:url(/sprites/${encodeURIComponent(val.background)}); background-size:cover; background-position:center; margin-top:0.25rem; box-shadow: 2px 2px 0px var(--border-color);"></div>`;
        } else {
            bgPreviewHtml = `<div style="width:100%; height:40px; border:2px dashed var(--border-color); display:flex; align-items:center; justify-content:center; font-size:0.7rem; opacity:0.5; margin-top:0.25rem;">No background image</div>`;
        }

        card.innerHTML = `
            <h3 style="text-transform: uppercase; font-size: 1rem; letter-spacing: 1px; border-bottom: 2px solid var(--border-color); padding-bottom: 0.35rem; width: 100%; text-align: center; margin-bottom: 0.5rem;">${val.name || selectedEntryKey}</h3>
            <div style="font-size: 0.75rem; font-style: italic; text-align: center; opacity: 0.8; margin-bottom: 0.5rem;">${val.desc || 'No description.'}</div>
            ${bgPreviewHtml}
            <div style="display:flex; flex-direction:column; width:100%; font-family:var(--font-mono); font-size:0.72rem; gap:0.25rem; margin-top:0.5rem;">
                <div style="display:flex; justify-content:space-between;"><span>◈ Min Level:</span> <strong>Lv. ${val.minLevel || 1}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>▲ Difficulty Mult:</span> <strong>x${val.difficultyMultiplier || 1.0}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>⚔ Encounter Chance:</span> <strong>${Math.floor((val.encounterChance || 0) * 100)}%</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>❖ Forage Chance:</span> <strong>${Math.floor((val.forageChance || 0) * 100)}%</strong></div>
                <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border-color); padding-top:0.25rem; margin-top:0.25rem;">
                    <span>◆ Background:</span> 
                    <strong style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${val.background || 'None'}">${val.background || 'None'}</strong>
                </div>
                <div style="display:flex; flex-direction:column; border-top:1px dashed var(--border-color); padding-top:0.25rem; margin-top: 0.25rem;">
                    <span>☠ Yokai Spawns:</span>
                    <strong style="color:var(--accent-red); margin-top:0.1rem;">${yPool}</strong>
                </div>
                <div style="display:flex; flex-direction:column; border-top:1px dashed var(--border-color); padding-top:0.25rem; margin-top: 0.25rem;">
                    <span>❖ Forage Drops:</span>
                    <strong style="color:var(--accent-green); margin-top:0.1rem;">${lPool}</strong>
                </div>
            </div>
        `;
        ui.dbItemPreviewCard.appendChild(card);

    } else if (activeDbTab === 'actions') {
        const card = document.createElement('div');
        card.style.border = '2px solid var(--border-color)';
        card.style.background = 'var(--panel-bg)';
        card.style.padding = '1rem';
        card.style.boxShadow = '4px 4px 0px var(--border-color)';
        card.style.width = '100%';

        card.innerHTML = `
            <h4 style="font-family:var(--font-mono); text-transform:uppercase; font-size:0.8rem; border-bottom:2px solid var(--border-color); padding-bottom:0.25rem; margin-bottom:0.5rem;">${selectedEntryKey} Configuration</h4>
            <pre style="font-family:var(--font-mono); font-size:0.7rem; white-space:pre-wrap; word-break:break-all; font-weight:bold;">${JSON.stringify(val, null, 2)}</pre>
        `;
        ui.dbItemPreviewCard.appendChild(card);
    } else if (activeDbTab === 'skills') {
        const card = document.createElement('div');
        card.className = 'inventory-item';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'stretch';
        card.style.margin = '0';
        card.style.width = '100%';
        card.style.gap = '0.5rem';
        card.style.background = 'linear-gradient(135deg, #4c6ef5, #3b5bdb)';
        card.style.color = 'white';
        card.style.border = '2px solid var(--border-color)';
        card.style.boxShadow = '4px 4px 0px var(--border-color)';

        let effsHtml = '';
        if (val.effects) {
            Object.entries(val.effects).forEach(([ek, ev]) => {
                effsHtml += `<div style="font-family:var(--font-mono); font-size:0.7rem; font-weight:700;">• ${ek}: ${ev}</div>`;
            });
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-main); font-weight:700; text-transform:uppercase;">
                <span style="font-size:0.95rem;">${val.name || selectedEntryKey}</span>
                <span style="font-family:var(--font-mono); font-size:0.75rem; background:rgba(0,0,0,0.2); padding:0.1rem 0.4rem; border-radius:2px;">${val.staminaCost || 0}st</span>
            </div>
            <p style="font-size:0.8rem; opacity:0.9; margin:0;">${val.desc || 'No description.'}</p>
            <div style="font-size:0.75rem; font-family:var(--font-mono); margin-top:0.25rem;">Cooldown: ${(val.cooldown || 0) / 1000}s</div>
            ${effsHtml ? `<div style="border-top:1px dashed rgba(255,255,255,0.3); padding-top:0.25rem; margin-top:0.25rem;">${effsHtml}</div>` : ''}
        `;
        ui.dbItemPreviewCard.appendChild(card);
    } else if (activeDbTab === 'players') {
        const card = document.createElement('div');
        card.style.border = '2px solid var(--border-color)';
        card.style.background = 'var(--panel-bg)';
        card.style.padding = '1rem';
        card.style.boxShadow = '4px 4px 0px var(--border-color)';
        card.style.width = '100%';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '0.75rem';

        const state = val.state || {};
        const stats = state.stats || {};
        const isAdminText = val.isAdmin ? '<span style="color:var(--accent-red); font-weight:bold; font-size:0.75rem; border:1px solid var(--accent-red); padding:0.1rem 0.3rem; background:rgba(212,47,47,0.1);">ADMIN</span>' : '';

        let avatarSprite = state.sprite;
        if (!avatarSprite && state.equipment && state.equipment.avatar) {
            const avatarItem = gameDb?.items?.[state.equipment.avatar];
            if (avatarItem && avatarItem.sprite) {
                avatarSprite = avatarItem.sprite;
            }
        }
        const avatarHtml = avatarSprite
            ? `<img src="/sprites/${avatarSprite}" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid var(--border-color); background:var(--bg-color); image-rendering:pixelated; box-shadow:2px 2px 0px var(--border-color);" alt="">`
            : `<div style="width:48px; height:48px; border-radius:50%; border:2px dashed var(--border-color); background:var(--bg-color); display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:bold; box-shadow:2px 2px 0px var(--border-color);">☻</div>`;

        let equipHtml = '';
        if (state.equipment) {
            const slots = ['weapon', 'armor', 'helmet', 'shield', 'accessory'];
            slots.forEach(slot => {
                const itemKey = state.equipment[slot];
                if (itemKey) {
                    const item = gameDb?.items?.[itemKey] || { name: itemKey, rarity: 'common' };
                    equipHtml += `<div style="display:flex; justify-content:space-between; opacity:0.85; font-size:0.7rem; font-family:var(--font-mono); align-items:center;">
                        <span>${slot.toUpperCase()}:</span> 
                        <span class="rarity-badge badge-${item.rarity || 'common'}" style="font-size:0.6rem; padding:0.05rem 0.2rem; display:inline-block; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</span>
                    </div>`;
                }
            });
        }
        if (!equipHtml) {
            equipHtml = '<div style="font-style:italic; opacity:0.5; font-size:0.7rem; text-align:center;">No equipment equipped</div>';
        }

        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.75rem; border-bottom:2px solid var(--border-color); padding-bottom:0.5rem; width:100%;">
                ${avatarHtml}
                <div style="display:flex; flex-direction:column; gap:0.15rem; flex:1; min-width:0;">
                    <div style="font-family:var(--font-main); font-weight:700; text-transform:uppercase; font-size:0.95rem; display:flex; align-items:center; justify-content:space-between; width:100%; gap:0.25rem;">
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${selectedEntryKey}</span>
                        ${isAdminText}
                    </div>
                    <div style="font-size:0.7rem; opacity:0.6; font-family:var(--font-mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Area: ${state.currentArea || getDefaultAreaKey()}</div>
                </div>
            </div>
            <div style="font-family:var(--font-mono); font-size:0.72rem; display:flex; flex-direction:column; gap:0.25rem;">
                <div style="display:flex; justify-content:space-between;"><span>Level:</span> <strong>Lv. ${state.level || 1}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Coins:</span> <strong>${state.coins || 0}c</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>HP:</span> <strong>${stats.health || 50} / ${stats.maxHealth || 50}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Stamina:</span> <strong>${state.stamina || 100} / ${state.maxStamina || 100}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>ATK:</span> <strong>${stats.attack || 5}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>DEF:</span> <strong>${stats.defense || 5}</strong></div>
            </div>
            <div style="border-top:1px dashed var(--border-color); padding-top:0.5rem; display:flex; flex-direction:column; gap:0.2rem;">
                <span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; opacity:0.7;">Equipped Items:</span>
                ${equipHtml}
            </div>
        `;
        ui.dbItemPreviewCard.appendChild(card);
    }

    if (ui.dbVisualizerInput && isFormMode) {
        ui.dbVisualizerInput.value = JSON.stringify(activeDbData, null, 2);
    }

    if (ui.dbItemPreviewCard && selectedEntryKey) {
        const refs = findCrossReferences(activeDbTab, selectedEntryKey);
        const refContainer = document.createElement('div');
        refContainer.style.border = '2px solid var(--border-color)';
        refContainer.style.background = 'var(--panel-bg)';
        refContainer.style.padding = '1rem';
        refContainer.style.boxShadow = '4px 4px 0px var(--border-color)';
        refContainer.style.width = '100%';
        refContainer.style.marginTop = '1rem';
        refContainer.style.display = 'flex';
        refContainer.style.flexDirection = 'column';
        refContainer.style.gap = '0.5rem';

        let refsHtml = '';
        if (refs.length > 0) {
            refsHtml = refs.map(ref => {
                let badgeColor = 'var(--text-color)';
                let badgeBg = 'rgba(0,0,0,0.04)';
                if (ref.type === 'yokai') { badgeColor = 'var(--accent-red)'; badgeBg = 'rgba(201,74,74,0.06)'; }
                else if (ref.type === 'areas') { badgeColor = 'var(--accent-green)'; badgeBg = 'rgba(89,124,94,0.06)'; }
                else if (ref.type === 'players') { badgeColor = '#d4a017'; badgeBg = 'rgba(212,160,23,0.06)'; }

                return `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.68rem; font-family:var(--font-mono); border-bottom:1px solid rgba(0,0,0,0.04); padding:0.25rem 0; gap:0.5rem;">
                    <span style="opacity:0.6; text-transform:uppercase; font-size:0.6rem; font-weight:bold;">${ref.category}</span>
                    <span class="nav-btn-like" onclick="selectDbEntry('${ref.type}', '${ref.key}')" style="color:${badgeColor}; background:${badgeBg}; font-weight:bold; cursor:pointer; padding:0.05rem 0.25rem; border:1px solid ${badgeColor}; border-radius:2px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-transform:none; font-family:var(--font-mono); font-size:0.65rem;" title="Click to view entry">${ref.label}</span>
                </div>`;
            }).join('');
        } else {
            refsHtml = '<div style="font-style:italic; opacity:0.5; font-size:0.7rem; text-align:center; padding:0.2rem 0;">No active dependencies found</div>';
        }

        refContainer.innerHTML = `
            <h4 style="font-family: var(--font-mono); font-size: 0.78rem; font-weight: 700; border-bottom: 2px solid var(--border-color); padding-bottom: 0.25rem; width: 100%; text-align: center; letter-spacing: 1px; color: #888; margin: 0 0 0.5rem 0;">
                CROSS-REFERENCES</h4>
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                ${refsHtml}
            </div>
        `;
        ui.dbItemPreviewCard.appendChild(refContainer);
    }
}

function addNewEntry() {
    const inputKey = prompt("Enter a unique key / ID for the new entry:");
    if (inputKey === null) return; // User cancelled

    const cleanKey = inputKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanKey) {
        alert("Invalid Key: Key cannot be empty.");
        return;
    }

    const keys = Object.keys(activeDbData);
    if (keys.includes(cleanKey)) {
        alert(`Duplicate Key: An entry with key "${cleanKey}" already exists.`);
        return;
    }

    if (activeDbTab === 'items') {
        activeDbData[cleanKey] = {
            name: 'New Item',
            desc: 'A newly added fantasy item.',
            value: 10,
            type: 'material',
            rarity: 'common',
            sprite: 'wooden_sword.png'
        };
    } else if (activeDbTab === 'yokai') {
        activeDbData[cleanKey] = {
            name: 'New Yokai',
            hp: 50,
            maxHp: 50,
            attack: 5,
            defense: 5,
            speed: 3000,
            xpReward: 40,
            coinReward: 10,
            loot: {
                guaranteed: null,
                bonusChance: 0.35
            }
        };
    } else if (activeDbTab === 'areas') {
        activeDbData[cleanKey] = {
            name: 'New Area',
            desc: 'A wilderness zone waiting to be explored.',
            minLevel: 1,
            encounterChance: 0.3,
            forageChance: 0.3,
            yokaiPool: [],
            lootPool: [],
            difficultyMultiplier: 1.0,
            background: ''
        };
    } else if (activeDbTab === 'actions') {
        activeDbData[cleanKey] = {};
    } else if (activeDbTab === 'skills') {
        activeDbData[cleanKey] = {
            name: 'New Skill',
            desc: 'A newly added skill.',
            staminaCost: 10,
            cooldown: 3000,
            effects: {
                damageMultiplier: 1.2
            }
        };
    } else if (activeDbTab === 'players') {
        activeDbData[cleanKey] = {
            isAdmin: false,
            state: {
                level: 1,
                experience: 0,
                experienceNeeded: 100,
                coins: 100,
                stamina: 100,
                maxStamina: 100,
                stats: { health: 50, maxHealth: 50, attack: 5, defense: 5 },
                inventory: {},
                currentArea: getDefaultAreaKey(),
                quests: { active: [], available: [] }
            }
        };
    }

    selectedEntryKey = cleanKey;
    initCategoryFilter();
    renderEntriesList();
    selectEntry(cleanKey);

    setTimeout(() => {
        const activeRow = ui.dbEntriesList.querySelector('.db-entry-row.active');
        if (activeRow) activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function deleteEntry() {
    const key = selectedEntryKey;
    if (!key || !activeDbData[key]) {
        alert("Select an entry to delete.");
        return;
    }

    const refs = findCrossReferences(activeDbTab, key);
    if (refs.length > 0) {
        const refLabels = refs.map(ref => `  - [${ref.category}] in "${ref.type}" database: ${ref.label}`).slice(0, 10).join('\n');
        const refCountText = refs.length > 10 ? `\n  - ... and ${refs.length - 10} more references.` : '';
        const warnMessage = `⚠️ CRITICAL DATABASE DEPENDENCIES DETECTED!\n\nThe entry "${key}" is referenced in the following parts of the game:\n\n${refLabels}${refCountText}\n\nDeleting this entry will leave orphaned references and may cause game errors or crashes!\n\nAre you absolutely sure you want to delete this entry anyway?`;
        const confirmDelete = confirm(warnMessage);
        if (!confirmDelete) return;
    } else {
        const confirmDelete = confirm(`⚠️ DELETE ENTRY\n\nAre you sure you want to permanently delete the entry "${key}" from this database copy?\n\nThis will take effect when you Save Changes.`);
        if (!confirmDelete) return;
    }

    delete activeDbData[key];
    selectedEntryKey = null;

    initCategoryFilter();
    renderEntriesList();

    const remainingKeys = Object.keys(activeDbData);
    if (remainingKeys.length > 0) {
        selectEntry(remainingKeys[0]);
    } else {
        renderFormAndPreview(null);
    }
}

function openSpriteInspector(spriteFilename, isPickerMode = false, onSelectCallback = null) {
    if (!ui.spriteInspectorModal) return;

    spritePage = 1; // Reset to page 1 on open
    ui.spriteInspectorModal.style.display = 'flex';
    ui.spriteInspectFilename.textContent = spriteFilename || 'No file selected';
    ui.spriteInspectBigImg.src = spriteFilename ? `/sprites/${spriteFilename}` : '';

    activePickerCallback = onSelectCallback;
    ui.spriteModalTitle.textContent = isPickerMode ? 'Pick Sprite Asset' : 'Sprite Inspector';

    if (ui.spriteModalSelectBtn) {
        ui.spriteModalSelectBtn.style.display = isPickerMode ? 'block' : 'none';
        ui.spriteModalSelectBtn.disabled = !spriteFilename;
    }

    if (ui.spriteInspectUsage) {
        ui.spriteInspectUsage.innerHTML = '<strong style="display:block; margin-bottom:0.25rem; font-size:0.75rem;">Database Usage:</strong>';
        if (spriteFilename && gameDb && gameDb.items) {
            const usageItems = Object.entries(gameDb.items)
                .filter(([k, it]) => it.sprite === spriteFilename)
                .map(([k, it]) => `${it.name} (${k})`);

            if (usageItems.length > 0) {
                ui.spriteInspectUsage.innerHTML += `<ul style="margin:0; padding-left:1rem; font-size:0.7rem;">${usageItems.map(it => `<li>${it}</li>`).join('')}</ul>`;
            } else {
                ui.spriteInspectUsage.innerHTML += '<span style="font-size:0.7rem; color:#888;">Not used in items database</span>';
            }
        } else {
            ui.spriteInspectUsage.innerHTML += '<span style="font-size:0.7rem; color:#888;">No usage details</span>';
        }
    }

    renderSpriteGallery(spriteFilename);
}

function renderSpriteGallery(selectedSprite) {
    if (!ui.spriteGalleryList) return;
    ui.spriteGalleryList.innerHTML = '';

    const searchVal = (ui.spriteSearchInput ? ui.spriteSearchInput.value.trim().toLowerCase() : '');
    const folderVal = (ui.spriteFolderSelect ? ui.spriteFolderSelect.value : 'all');
    
    let filteredSprites = allSprites;
    
    if (folderVal !== 'all') {
        filteredSprites = filteredSprites.filter(sprite => {
            const parts = sprite.split('/');
            const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Base Sprites';
            return folder === folderVal;
        });
    }
    
    filteredSprites = filteredSprites.filter(f => f.toLowerCase().includes(searchVal));

    const totalSprites = filteredSprites.length;
    const totalPages = Math.max(1, Math.ceil(totalSprites / SPRITES_PER_PAGE));

    if (spritePage > totalPages) spritePage = totalPages;
    if (spritePage < 1) spritePage = 1;

    const prevBtn = document.getElementById('sprite-prev-page');
    const nextBtn = document.getElementById('sprite-next-page');
    const indicator = document.getElementById('sprite-page-indicator');

    if (indicator) {
        indicator.textContent = `Page ${spritePage} of ${totalPages}`;
    }
    if (prevBtn) {
        prevBtn.disabled = spritePage === 1;
        prevBtn.style.opacity = spritePage === 1 ? '0.5' : '1';
    }
    if (nextBtn) {
        nextBtn.disabled = spritePage === totalPages;
        nextBtn.style.opacity = spritePage === totalPages ? '0.5' : '1';
    }

    if (totalSprites === 0) {
        ui.spriteGalleryList.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:1.5rem; opacity:0.5; font-size:0.75rem;">No sprites match search</div>';
        return;
    }

    const startIndex = (spritePage - 1) * SPRITES_PER_PAGE;
    const endIndex = Math.min(startIndex + SPRITES_PER_PAGE, totalSprites);
    const paginatedSprites = filteredSprites.slice(startIndex, endIndex);

    paginatedSprites.forEach(sprite => {
        const thumb = document.createElement('div');
        thumb.className = 'sprite-thumbnail';
        if (sprite === selectedSprite) {
            thumb.classList.add('selected');
        }
        thumb.title = sprite;
        thumb.innerHTML = `<img src="/sprites/${sprite}" alt="${sprite}">`;

        thumb.addEventListener('click', () => {
            ui.spriteInspectBigImg.src = `/sprites/${sprite}`;
            ui.spriteInspectFilename.textContent = sprite;

            ui.spriteGalleryList.querySelectorAll('.sprite-thumbnail').forEach(t => t.classList.remove('selected'));
            thumb.classList.add('selected');

            if (ui.spriteInspectUsage && gameDb && gameDb.items) {
                const usageItems = Object.entries(gameDb.items)
                    .filter(([k, it]) => it.sprite === sprite)
                    .map(([k, it]) => `${it.name} (${k})`);
                ui.spriteInspectUsage.innerHTML = '<strong style="display:block; margin-bottom:0.25rem; font-size:0.75rem;">Database Usage:</strong>';
                if (usageItems.length > 0) {
                    ui.spriteInspectUsage.innerHTML += `<ul style="margin:0; padding-left:1rem; font-size:0.7rem;">${usageItems.map(it => `<li>${it}</li>`).join('')}</ul>`;
                } else {
                    ui.spriteInspectUsage.innerHTML += '<span style="font-size:0.7rem; color:#888;">Not used in items database</span>';
                }
            }

            if (ui.spriteModalSelectBtn) {
                ui.spriteModalSelectBtn.disabled = false;
            }
        });

        ui.spriteGalleryList.appendChild(thumb);
    });
}

function closeSpriteModal() {
    if (ui.spriteInspectorModal) {
        ui.spriteInspectorModal.style.display = 'none';
    }
    activePickerCallback = null;
}

function showItemPreviewModal(itemKey) {
    const item = gameDb && gameDb.items && gameDb.items[itemKey];
    if (!item) return;

    const modal = document.getElementById('item-preview-modal');
    const body = document.getElementById('item-preview-modal-body');
    if (!modal || !body) return;

    body.innerHTML = '';

    const rarity = item.rarity || 'common';
    const type = item.type || 'material';

    const card = document.createElement('div');
    card.className = `inventory-item item-rarity-${rarity}`;
    card.style.flexDirection = 'column';
    card.style.alignItems = 'stretch';
    card.style.margin = '0';
    card.style.width = '100%';
    card.style.gap = '0.75rem';

    let statsHtml = '';
    if (item.effects) {
        if (item.effects.hpRestore) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-green); font-weight:700;">♥ Restores ${item.effects.hpRestore} HP</div>`;
        if (item.effects.staminaRestore) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-green); font-weight:700;">◆ Restores ${item.effects.staminaRestore} Stamina</div>`;
        if (item.effects.attackBonus) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-red); font-weight:700;">⚔ +${item.effects.attackBonus} Attack</div>`;
        if (item.effects.defenseBonus) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-green); font-weight:700;">⛨ +${item.effects.defenseBonus} Defense</div>`;
        if (item.effects.critChance) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-red); font-weight:700;">❖ +${item.effects.critChance}% Critical Chance</div>`;
        if (item.effects.lifesteal) statsHtml += `<div style="font-size:0.75rem; color:var(--accent-red); font-weight:700;">▲ +${item.effects.lifesteal}% Lifesteal</div>`;
        if (item.effects.poisonChance) statsHtml += `<div style="font-size:0.75rem; color:purple; font-weight:700;">☠ +${item.effects.poisonChance}% Poison Chance</div>`;
        if (item.effects.burnChance) statsHtml += `<div style="font-size:0.75rem; color:orange; font-weight:700;">☼ +${item.effects.burnChance}% Burn Chance</div>`;
    }

    const imgHtml = item.sprite
        ? `<img src="/sprites/${item.sprite}" class="item-sprite-preview" alt="${item.name}" style="width:64px; height:64px; object-fit:contain; image-rendering:pixelated; align-self:center;">`
        : `<div style="width:64px; height:64px; border:2px dashed var(--border-color); background:var(--panel-bg); display:flex; align-items:center; justify-content:center; align-self:center; font-size:1.5rem;">?</div>`;

    card.innerHTML = `
        ${imgHtml}
        <div class="item-info" style="gap: 0.25rem;">
            <div class="item-name-qty" style="flex-wrap:wrap; gap:0.5rem; justify-content:center;">
                <span class="item-name" style="font-size:0.95rem; text-align:center; width:100%;">${item.name}</span>
                <span class="rarity-badge badge-${rarity}" style="font-size:0.6rem; padding:0.1rem 0.3rem;">${rarity.toUpperCase()}</span>
                <span class="item-qty" style="font-size:0.6rem; padding:0.1rem 0.3rem;">${type.toUpperCase()}</span>
            </div>
            <p class="item-desc" style="font-size:0.8rem; text-align:center; opacity:0.8; margin-top:0.25rem;">${item.desc || 'No description provided.'}</p>
            <div style="display:flex; flex-direction:column; align-items:center; margin-top:0.25rem; gap:0.15rem;">
                ${statsHtml}
                <div style="font-size:0.75rem; font-family:var(--font-mono); font-weight:700; margin-top:0.25rem; background:rgba(0,0,0,0.05); padding:0.1rem 0.4rem; border:1px solid var(--border-color);">⟁ Base Value: ${item.value || 0} coins</div>
            </div>
        </div>
    `;

    body.appendChild(card);
    modal.style.display = 'flex';
}

function closeItemPreviewModal() {
    const modal = document.getElementById('item-preview-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadBackupsList() {
    if (!ui.dbBackupsList) return;
    ui.dbBackupsList.innerHTML = '<div class="empty-inventory" style="margin: 1rem;">Loading backups...</div>';

    try {
        const res = await fetch('/api/admin/database/backups');
        if (!res.ok) throw new Error(`Failed to load backups: ${res.statusText}`);
        const data = await res.json();

        let backups = data.backups || [];

        // Apply filter
        if (activeBackupFilter !== 'all') {
            backups = backups.filter(b => b.type === activeBackupFilter);
        }

        if (backups.length === 0) {
            const filterMsg = activeBackupFilter !== 'all' ? ` for "${activeBackupFilter}"` : '';
            ui.dbBackupsList.innerHTML = `<div class="empty-inventory" style="margin: 1rem;">No backups found${filterMsg}. Backups are created automatically when you save changes.</div>`;
            return;
        }

        ui.dbBackupsList.innerHTML = '';

        for (const backup of backups) {
            const card = document.createElement('div');
            card.className = 'backup-card';

            const created = new Date(backup.created);
            const timeStr = created.toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const sizeKB = (backup.size / 1024).toFixed(1);

            card.innerHTML = `
                <div class="backup-info">
                    <div class="backup-info-top">
                        <span class="backup-type-badge backup-type-${backup.type}">${backup.type}</span>
                        <span class="backup-timestamp">${timeStr}</span>
                    </div>
                    <span class="backup-meta">${backup.filename} · ${sizeKB} KB</span>
                </div>
                <div class="backup-actions">
                    <button class="backup-restore-btn" data-filename="${backup.filename}" data-type="${backup.type}">Restore</button>
                    <button class="backup-delete-btn" data-filename="${backup.filename}">Delete</button>
                </div>
            `;

            ui.dbBackupsList.appendChild(card);
        }

        // Wire up restore buttons
        ui.dbBackupsList.querySelectorAll('.backup-restore-btn').forEach(btn => {
            btn.addEventListener('click', () => handleRestoreBackup(btn.dataset.filename, btn.dataset.type));
        });

        // Wire up delete buttons
        ui.dbBackupsList.querySelectorAll('.backup-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteBackup(btn.dataset.filename));
        });

    } catch (err) {
        ui.dbBackupsList.innerHTML = `<div class="empty-inventory" style="margin: 1rem;">Error loading backups: ${err.message}</div>`;
    }
}

async function handleRestoreBackup(filename, type) {
    const confirmRestore = confirm(
        `⚠️ RESTORE BACKUP\n\nYou are about to restore the ${type.toUpperCase()} database from:\n${filename}\n\nThis will overwrite the current active database. A backup of the current state will be created before restoring.\n\nProceed?`
    );
    if (!confirmRestore) return;

    try {
        const res = await fetch('/api/admin/database/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            logAction(`[SYSTEM] Administrator restored ${type.toUpperCase()} database from backup: ${filename}`);
            alert(`Restore Complete: ${data.message}`);
            loadBackupsList(); // Refresh list (pre-restore backup was created)
        } else {
            alert(`Restore Failed: ${data.error || 'Unknown error.'}`);
        }
    } catch (err) {
        alert(`Connection Error: ${err.message}`);
    }
}

async function handleDeleteBackup(filename) {
    const confirmDelete = confirm(
        `DELETE BACKUP\n\nAre you sure you want to permanently delete this backup?\n${filename}\n\nThis action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
        const res = await fetch(`/api/admin/database/backups/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });

        const data = await res.json();
        if (res.ok && data.success) {
            logAction(`[SYSTEM] Administrator deleted backup: ${filename}`);
            loadBackupsList(); // Refresh
        } else {
            alert(`Delete Failed: ${data.error || 'Unknown error.'}`);
        }
    } catch (err) {
        alert(`Connection Error: ${err.message}`);
    }
}

function setupBackupFilters() {
    const filterBtns = [ui.backupFilterAll, ui.backupFilterItems, ui.backupFilterYokai, ui.backupFilterActions, ui.backupFilterAreas, ui.backupFilterSkills];
    const filterValues = ['all', 'items', 'yokai', 'actions', 'areas', 'skills'];

    filterBtns.forEach((btn, i) => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            activeBackupFilter = filterValues[i];
            filterBtns.forEach(b => { if (b) b.classList.remove('active'); });
            btn.classList.add('active');
            loadBackupsList();
        });
    });
}

function setupAdminDbFilters() {
    if (ui.dbViewItems) {
        ui.dbViewItems.addEventListener('click', () => loadAdminDatabase('items'));
    }
    if (ui.dbViewYokai) {
        ui.dbViewYokai.addEventListener('click', () => loadAdminDatabase('yokai'));
    }
    if (ui.dbViewActions) {
        ui.dbViewActions.addEventListener('click', () => loadAdminDatabase('actions'));
    }
    if (ui.dbViewAreas) {
        ui.dbViewAreas.addEventListener('click', () => loadAdminDatabase('areas'));
    }
    if (ui.dbViewSkills) {
        ui.dbViewSkills.addEventListener('click', () => loadAdminDatabase('skills'));
    }
    if (ui.dbViewPlayers) {
        ui.dbViewPlayers.addEventListener('click', () => loadAdminDatabase('players'));
    }
    if (ui.dbViewBackups) {
        ui.dbViewBackups.addEventListener('click', () => switchDbPanel('backups'));
    }

    // Visual DB Editor UI Event Handlers
    if (ui.dbSearchInput) {
        ui.dbSearchInput.addEventListener('input', () => renderEntriesList());
    }
    if (ui.dbCategoryFilter) {
        ui.dbCategoryFilter.addEventListener('change', () => {
            selectedEntryKey = null;
            renderEntriesList();
            const keys = Object.keys(activeDbData);
            // Auto-select first matching entry if possible
            const matchKeys = keys.filter(k => {
                if (ui.dbCategoryFilter.value === 'all') return true;
                if (activeDbTab === 'items') return activeDbData[k].type === ui.dbCategoryFilter.value;
                return true;
            });
            if (matchKeys.length > 0) selectEntry(matchKeys[0]);
            else renderFormAndPreview(null);
        });
    }
    if (ui.dbSortFilter) {
        ui.dbSortFilter.addEventListener('change', () => renderEntriesList());
    }
    if (ui.dbAddEntryBtn) {
        ui.dbAddEntryBtn.addEventListener('click', () => addNewEntry());
    }
    if (ui.dbDeleteEntryBtn) {
        ui.dbDeleteEntryBtn.addEventListener('click', () => deleteEntry());
    }

    // Editor mode toggle listener
    if (ui.dbEditorModeToggle) {
        ui.dbEditorModeToggle.addEventListener('click', () => {
            if (isFormMode) {
                // Switch to Raw JSON Mode
                ui.dbVisualizerInput.value = JSON.stringify(activeDbData, null, 2);
                if (ui.dbRawContainer) ui.dbRawContainer.style.display = 'block';
                if (ui.dbStructuredContainer) ui.dbStructuredContainer.style.display = 'none';
                if (ui.dbModeLabel) ui.dbModeLabel.textContent = 'Active Mode: RAW JSON';
                ui.dbEditorModeToggle.textContent = 'Form Editor';
                isFormMode = false;
            } else {
                // Try parsing Raw JSON first
                const rawContent = ui.dbVisualizerInput.value.trim();
                if (!rawContent) {
                    alert("JSON parsing failed: Configuration is empty.");
                    return;
                }
                try {
                    const parsed = JSON.parse(rawContent);
                    activeDbData = parsed;
                    isFormMode = true;
                    if (ui.dbRawContainer) ui.dbRawContainer.style.display = 'none';
                    if (ui.dbStructuredContainer) ui.dbStructuredContainer.style.display = 'flex';
                    if (ui.dbModeLabel) ui.dbModeLabel.textContent = 'Active Mode: FORM';
                    ui.dbEditorModeToggle.textContent = 'Raw JSON';

                    // Re-render Form
                    initCategoryFilter();
                    renderEntriesList();
                    const keys = Object.keys(activeDbData);
                    if (keys.length > 0) {
                        selectEntry(keys.includes(selectedEntryKey) ? selectedEntryKey : keys[0]);
                    } else {
                        renderFormAndPreview(null);
                    }
                } catch (err) {
                    alert(`JSON Parse Error: Cannot switch to form mode until formatting errors are resolved. Details: ${err.message}`);
                }
            }
        });
    }

    // Sprite Inspector Close Handlers
    if (ui.spriteModalClose) {
        ui.spriteModalClose.addEventListener('click', closeSpriteModal);
    }
    if (ui.spriteInspectorModal) {
        ui.spriteInspectorModal.addEventListener('click', (e) => {
            if (e.target === ui.spriteInspectorModal) closeSpriteModal();
        });
    }
    if (ui.spriteSearchInput) {
        ui.spriteSearchInput.addEventListener('input', () => {
            spritePage = 1; // Reset to page 1 on search input change
            const activeSelected = ui.spriteInspectFilename.textContent;
            renderSpriteGallery(activeSelected === 'No file selected' ? null : activeSelected);
        });
    }
    if (ui.spriteFolderSelect) {
        ui.spriteFolderSelect.addEventListener('change', () => {
            spritePage = 1; // Reset to page 1 on folder change
            const activeSelected = ui.spriteInspectFilename.textContent;
            renderSpriteGallery(activeSelected === 'No file selected' ? null : activeSelected);
        });
    }
    if (ui.spriteModalSelectBtn) {
        ui.spriteModalSelectBtn.addEventListener('click', () => {
            const selectedSprite = ui.spriteInspectFilename.textContent;
            if (selectedSprite && selectedSprite !== 'No file selected') {
                if (activePickerCallback) {
                    activePickerCallback(selectedSprite);
                }
                closeSpriteModal();
            }
        });
    }

    // Sprite Inspector Pagination Controllers
    const spritePrevBtn = document.getElementById('sprite-prev-page');
    if (spritePrevBtn) {
        spritePrevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (spritePage > 1) {
                spritePage--;
                const activeSelected = ui.spriteInspectFilename.textContent;
                renderSpriteGallery(activeSelected === 'No file selected' ? null : activeSelected);
            }
        });
    }
    const spriteNextBtn = document.getElementById('sprite-next-page');
    if (spriteNextBtn) {
        spriteNextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            spritePage++;
            const activeSelected = ui.spriteInspectFilename.textContent;
            renderSpriteGallery(activeSelected === 'No file selected' ? null : activeSelected);
        });
    }

    // Item Preview Modal Close Handlers
    const itemClose = document.getElementById('item-preview-close');
    if (itemClose) {
        itemClose.addEventListener('click', closeItemPreviewModal);
    }
    const itemModal = document.getElementById('item-preview-modal');
    if (itemModal) {
        itemModal.addEventListener('click', (e) => {
            if (e.target === itemModal) closeItemPreviewModal();
        });
    }

    // Global Click Listener on body to inspect sprites
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('item-sprite') && e.target.src) {
            const parts = e.target.src.split('/sprites/');
            if (parts.length > 1) {
                const spriteFile = decodeURIComponent(parts[1]);

                // Check if Admin DB is active
                if (ui.viewAdminDb && ui.viewAdminDb.classList.contains('active')) {
                    openSpriteInspector(spriteFile);
                } else {
                    // Outside Admin DB: Show the item preview card
                    if (gameDb && gameDb.items) {
                        const itemKey = e.target.dataset.itemKey || Object.keys(gameDb.items).find(k => gameDb.items[k].sprite === spriteFile);
                        if (itemKey) {
                            showItemPreviewModal(itemKey);
                        }
                    }
                }
            }
        }
    });

    if (ui.dbSaveBtn) {
        ui.dbSaveBtn.addEventListener('click', async () => {
            let parsedJSON;

            if (isFormMode) {
                parsedJSON = activeDbData;
            } else {
                const rawContent = ui.dbVisualizerInput.value.trim();
                if (!rawContent) {
                    alert("Cannot save empty database configuration.");
                    return;
                }
                try {
                    parsedJSON = JSON.parse(rawContent);
                } catch (err) {
                    alert(`JSON Format Error: Your database configuration contains invalid JSON syntax. Please check for trailing commas or unquoted keys. Details: ${err.message}`);
                    return;
                }
            }

            // === SAFETY NET: Tier 1 — Admin Confirmation Dialog ===
            const confirmSave = confirm(
                `⚠️ WARNING: You are about to overwrite the active ${activeDbTab.toUpperCase()} database on the server.\n\nThis change will update gameplay parameters for all active players in real-time.\n\nA backup of the current database will be created automatically.\n\nProceed with save?`
            );
            if (!confirmSave) {
                logAction(`[SYSTEM] Database save cancelled by administrator.`);
                return;
            }

            ui.dbSaveBtn.disabled = true;
            const originalText = ui.dbSaveBtn.textContent;
            ui.dbSaveBtn.textContent = 'Saving...';

            try {
                const res = await fetch('/api/admin/database/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: activeDbTab, data: parsedJSON })
                });

                const responseData = await res.json();
                if (res.ok && responseData.success) {
                    logAction(`[SYSTEM] Administrator successfully saved changes to the ${activeDbTab.toUpperCase()} database.`);
                    alert(`Database Sync Complete: ${responseData.message}`);
                    originalDbData = JSON.parse(JSON.stringify(activeDbData));
                    if (adminDbCache) {
                        adminDbCache[activeDbTab] = JSON.parse(JSON.stringify(activeDbData));
                    }
                } else {
                    alert(`Save Failed: ${responseData.error || 'Unknown error occurred.'}`);
                }
            } catch (err) {
                alert(`Connection Error: Failed to contact the database update server. ${err.message}`);
            } finally {
                ui.dbSaveBtn.disabled = false;
                ui.dbSaveBtn.textContent = originalText;
            }
        });
    }

    setupBackupFilters();
}

setupAdminDbFilters();

// Travel & Area Event Listeners
if (ui.activityAreaTravel) {
    ui.activityAreaTravel.addEventListener('change', () => {
        const areaKey = ui.activityAreaTravel.value;
        if (!areaKey) return;
        socket.emit('travelArea', { areaKey });
    });
}

function updateTravelDropdown(currentState) {
    if (!ui.activityAreaTravel || !gameDb || !gameDb.areas) return;

    ui.activityAreaTravel.innerHTML = '';

    const currentAreaKey = currentState ? (currentState.currentArea || getDefaultAreaKey()) : getDefaultAreaKey();

    Object.entries(gameDb.areas).forEach(([key, area]) => {
        const option = document.createElement('option');
        option.value = key;

        let label = `${area.name}`;
        if (area.minLevel > 1) {
            label += ` (Lv. ${area.minLevel})`;
        }
        option.textContent = label;

        // Disabled if level is too low
        if (currentState && currentState.level < area.minLevel) {
            option.disabled = true;
        }

        if (key === currentAreaKey) {
            option.selected = true;
        }
        ui.activityAreaTravel.appendChild(option);
    });
}

socket.on('travelResult', (data) => {
    if (data.success) {
        logAction(data.message);
        updateStatsDisplay(data.state);
    } else {
        logAction(data.message);
        alert(data.message);
        // Reset dropdown selection to current state if failed
        if (lastState) {
            ui.activityAreaTravel.value = lastState.currentArea || getDefaultAreaKey();
        }
    }
});

socket.on('kicked', (data) => {
    alert(data.message);
    socket.disconnect();
    showContainer('auth');
    authForm.error.style.color = 'var(--accent-red)';
    authForm.error.textContent = data.message;
});

// Multiplayer Party Click Listeners
if (ui.partyCreateBtn) {
    ui.partyCreateBtn.addEventListener('click', () => {
        socket.emit('partyCreate');
    });
}

if (ui.partyJoinBtn) {
    ui.partyJoinBtn.addEventListener('click', () => {
        const code = ui.partyCodeInput.value.trim().toUpperCase();
        if (code.length !== 6) {
            alert("Lobby code must be exactly 6 characters.");
            return;
        }
        socket.emit('partyJoin', { lobbyCode: code });
    });
}

if (ui.partyLeaveBtn) {
    ui.partyLeaveBtn.addEventListener('click', () => {
        socket.emit('partyLeave');
    });
}

// Multiplayer Party Socket Listeners
socket.on('partyUpdate', (data) => {
    if (!data) {
        if (ui.partySetupPanel) ui.partySetupPanel.style.display = 'flex';
        if (ui.partyLobbyPanel) ui.partyLobbyPanel.style.display = 'none';
        if (ui.partyMembersList) ui.partyMembersList.innerHTML = '';
        if (ui.partyCodeInput) ui.partyCodeInput.value = '';
    } else {
        if (ui.partySetupPanel) ui.partySetupPanel.style.display = 'none';
        if (ui.partyLobbyPanel) ui.partyLobbyPanel.style.display = 'flex';
        if (ui.partyLobbyCodeDisplay) ui.partyLobbyCodeDisplay.textContent = data.lobbyCode;
        
        if (ui.partyMembersList) {
            ui.partyMembersList.innerHTML = '';
            data.members.forEach(member => {
                const card = document.createElement('div');
                card.className = 'party-member-card';
                card.style.border = '2px solid var(--border-color)';
                card.style.padding = '0.75rem';
                card.style.background = 'var(--bg-color)';
                card.style.boxShadow = '2px 2px 0px var(--border-color)';
                card.style.display = 'flex';
                card.style.justifyContent = 'space-between';
                card.style.alignItems = 'center';
                
                const nameSpan = document.createElement('span');
                nameSpan.style.fontFamily = 'var(--font-mono)';
                nameSpan.style.fontWeight = 'bold';
                nameSpan.textContent = member;
                if (member === data.leader) {
                    nameSpan.innerHTML += ' <span style="color: gold; font-size: 0.85rem;" title="Party Leader">👑</span>';
                }
                card.appendChild(nameSpan);
                ui.partyMembersList.appendChild(card);
            });
        }
    }
});

socket.on('partyFeedback', (data) => {
    if (data) {
        logAction(`[PARTY] ${data.message}`);
        if (!data.success) {
            alert(data.message);
        }
    }
});

socket.on('partyCombatUpdate', (data) => {
    if (!ui.combatPartyMembers) return;
    if (!data || !data.members || data.members.length === 0) {
        ui.combatPartyMembers.style.display = 'none';
        return;
    }
    
    const otherMembers = data.members.filter(m => m.username !== currentUsername);
    if (otherMembers.length === 0) {
        ui.combatPartyMembers.style.display = 'none';
        return;
    }
    
    ui.combatPartyMembers.style.display = 'flex';
    ui.combatPartyMembers.innerHTML = '';
    
    otherMembers.forEach(member => {
        const hpPercent = Math.min(100, Math.max(0, (member.health / member.maxHealth) * 100));
        const card = document.createElement('div');
        card.style.border = '2px solid var(--border-color)';
        card.style.background = 'var(--bg-color)';
        card.style.padding = '0.5rem 0.75rem';
        card.style.boxShadow = '2px 2px 0px var(--border-color)';
        card.style.minWidth = '160px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '0.25rem';
        card.innerHTML = `
            <div style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: bold; display: flex; justify-content: space-between;">
                <span>${member.username}</span>
                <span style="color: var(--accent-red);">${member.health}/${member.maxHealth} HP</span>
            </div>
            <div class="progress-bar" style="height: 6px; margin: 0; background: rgba(0,0,0,0.1); border: 1px solid var(--border-color);">
                <div class="progress-fill" style="width: ${hpPercent}%; background: var(--accent-red); transition: width 0.2s ease;"></div>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666;">Stamina: ${member.stamina}/${member.maxStamina}</div>
        `;
        ui.combatPartyMembers.appendChild(card);
    });
});

checkAuth();

// Player Sprite Picker Modal Logic
const playerSpriteModal = document.getElementById('player-sprite-modal');
const playerSpriteClose = document.getElementById('player-sprite-close');
const playerSpriteList = document.getElementById('player-sprite-list');

if (playerSpriteClose) {
    playerSpriteClose.addEventListener('click', () => {
        if (playerSpriteModal) playerSpriteModal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === playerSpriteModal) {
        playerSpriteModal.style.display = 'none';
    }
});

async function openPlayerSpritePicker() {
    if (!playerSpriteModal || !playerSpriteList) return;

    playerSpriteList.innerHTML = '<div style="grid-column: 1 / -1; font-family: var(--font-mono); font-size: 0.85rem;">Loading sprites...</div>';
    playerSpriteModal.style.display = 'flex';

    try {
        const res = await fetch('/api/sprites');
        const data = await res.json();

        if (data.success && data.sprites) {
            playerSpriteList.innerHTML = '';
            if (data.sprites.length === 0) {
                playerSpriteList.innerHTML = `
                    <div style="grid-column: 1 / -1; font-family: var(--font-main); font-size: 0.95rem; text-align: center; padding: 2rem 1rem; color: var(--border-color); line-height: 1.5; text-transform: uppercase; letter-spacing: 0.5px;">
                        ✦ No Avatars Owned ✦
                        <div style="font-family: var(--font-mono); font-size: 0.75rem; color: #888; margin-top: 0.5rem; text-transform: none; letter-spacing: 0;">
                            Purchase premium character sprites from the Merchant or discover them as rare loot in the wilds.
                        </div>
                    </div>
                `;
            } else {
                // Group by folder
                const folders = {};
                data.sprites.forEach(sprite => {
                    const parts = sprite.split('/');
                    const filename = parts.pop();
                    const folder = parts.length > 0 ? parts.join('/') : 'Base Avatars';
                    if (!folders[folder]) folders[folder] = [];
                    folders[folder].push(sprite);
                });

                Object.keys(folders).sort().forEach(folder => {
                    const header = document.createElement('div');
                    header.style.gridColumn = '1 / -1';
                    header.style.textAlign = 'left';
                    header.style.fontWeight = 'bold';
                    header.style.borderBottom = '2px dashed var(--border-color)';
                    header.style.marginTop = '0.75rem';
                    header.style.paddingBottom = '0.25rem';
                    header.style.fontFamily = 'var(--font-mono)';
                    header.style.fontSize = '0.75rem';
                    header.style.color = '#888';
                    header.style.textTransform = 'uppercase';
                    header.style.width = '100%';
                    header.textContent = `📁 ${folder}`;
                    playerSpriteList.appendChild(header);

                    folders[folder].forEach(sprite => {
                        const item = document.createElement('div');
                        item.className = 'player-avatar-picker-item';
                        item.title = sprite;
                        item.innerHTML = `<img src="/sprites/${sprite}" alt="${sprite}">`;
                        item.addEventListener('click', () => {
                            socket.emit('changeSprite', { sprite });
                            playerSpriteModal.style.display = 'none';
                        });
                        playerSpriteList.appendChild(item);
                    });
                });
            }
        } else {
            playerSpriteList.innerHTML = '<div style="grid-column: 1 / -1; color: var(--accent-red);">Failed to load sprites.</div>';
        }
    } catch (err) {
        playerSpriteList.innerHTML = '<div style="grid-column: 1 / -1; color: var(--accent-red);">Error loading sprites.</div>';
    }
}

socket.on('spriteChangeResult', (data) => {
    if (data.success) {
        logAction(data.message);
        updateStatsDisplay(data.state);
    } else {
        logAction(`[WARNING] ${data.message}`);
        alert(data.message);
    }
});

// Performance Monitor Implementation
(function () {
    const perfToggleBtn = document.getElementById('perf-toggle-btn');
    const perfMonitor = document.getElementById('perf-monitor');

    if (perfToggleBtn && perfMonitor) {
        perfToggleBtn.addEventListener('click', () => {
            const isActive = perfMonitor.classList.toggle('active');
            perfToggleBtn.classList.toggle('active', isActive);
        });
    }

    // Drag-and-drop Logic
    if (perfMonitor) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        perfMonitor.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - perfMonitor.getBoundingClientRect().left;
            offsetY = e.clientY - perfMonitor.getBoundingClientRect().top;

            perfMonitor.style.bottom = 'auto';
            perfMonitor.style.right = 'auto';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const x = Math.max(0, Math.min(window.innerWidth - perfMonitor.offsetWidth, e.clientX - offsetX));
            const y = Math.max(0, Math.min(window.innerHeight - perfMonitor.offsetHeight, e.clientY - offsetY));
            perfMonitor.style.left = `${x}px`;
            perfMonitor.style.top = `${y}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // 1. FPS Tracker
    let frames = 0;
    let lastFpsUpdateTime = performance.now();
    let fps = 0;

    function trackFps() {
        frames++;
        const now = performance.now();
        if (now >= lastFpsUpdateTime + 1000) {
            fps = Math.round((frames * 1000) / (now - lastFpsUpdateTime));
            const fpsEl = document.getElementById('perf-fps');
            if (fpsEl) {
                fpsEl.textContent = fps;
                if (fps < 30) {
                    fpsEl.style.color = 'var(--accent-red)';
                } else if (fps < 55) {
                    fpsEl.style.color = '#d4a017';
                } else {
                    fpsEl.style.color = 'var(--accent-green)';
                }
            }
            frames = 0;
            lastFpsUpdateTime = now;
        }
        requestAnimationFrame(trackFps);
    }
    requestAnimationFrame(trackFps);

    // 2. Latency (Ping/Pong)
    let pingStartTime = 0;

    function checkLatency() {
        if (socket && socket.connected) {
            pingStartTime = performance.now();
            socket.emit('ping-check');
        }
    }

    socket.on('pong-check', () => {
        const duration = Math.round(performance.now() - pingStartTime);
        const pingEl = document.getElementById('perf-ping');
        if (pingEl) {
            pingEl.textContent = `${duration} ms`;
            if (duration < 50) {
                pingEl.style.color = 'var(--accent-green)';
            } else if (duration < 150) {
                pingEl.style.color = '#d4a017';
            } else {
                pingEl.style.color = 'var(--accent-red)';
            }
        }
    });

    setInterval(checkLatency, 5000);

    // 3. DOM & Memory usage
    function updateStats() {
        const domCount = document.getElementsByTagName('*').length;
        const domEl = document.getElementById('perf-dom');
        if (domEl) {
            domEl.textContent = domCount;
        }

        if (window.performance && window.performance.memory) {
            const memRow = document.getElementById('perf-mem-row');
            const memEl = document.getElementById('perf-mem');
            if (memRow && memEl) {
                memRow.style.display = 'flex';
                const usedHeap = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
                const totalHeap = Math.round(performance.memory.totalJSHeapSize / (1024 * 1024));
                memEl.textContent = `${usedHeap} MB / ${totalHeap} MB`;
            }
        }
    }

    setInterval(updateStats, 2000);
    // Initial check
    setTimeout(updateStats, 500);
})();

