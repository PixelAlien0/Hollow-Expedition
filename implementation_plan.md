# Implementation Plan: Inventory Categories & Pagination

This plan details the interface layout and logic upgrades to build a high-fidelity **Category Filters & Pagination system** inside our active inventory viewport, ensuring excellent usability and a premium user experience when players acquire many materials and consumables.

---

## User Review Required

Please review the proposed design mockups. We will be adding visual filtering tabs and bottom navigation bars following our established Japandi Brutalist theme constraints.

> [!IMPORTANT]
> **We propose implementing the inventory improvements through these updates:**
>
> 1. **Brutalist Category Filter Tabs (Frontend HTML):**
>    - Place a dedicated `.inventory-filters` bar at the top of the inventory viewport.
>    - Add three desaturated, hollow button selectors: **All**, **Consumables**, and **Materials**.
>    - Switching active filters will highlight the selected tab and dynamically filter the item list.
>
> 2. **Monospaced Pagination Controls (Frontend HTML):**
>    - Place a sleek `.inventory-pagination` control panel at the bottom of the inventory viewport.
>    - Add **Prev** and **Next** button controls flanking a bold monospaced page count indicator (e.g. `Page 1 of 3`).
>    - When a player has more than 4 items (configurable limit `ITEMS_PER_PAGE = 4`), the list dynamically slices into pages.
>
> 3. **Page/Filter State Engine (`public/game.js`):**
>    - Maintain local client-side states `inventoryCategory = 'all'` and `inventoryPage = 1`.
>    - Re-wire `renderInventory()` to dynamically slice, clamp, and display item arrays matching filter states.

---

## Proposed Layout Changes (`public/index.html`)

We will modify `#view-inventory` to look as follows:

```html
<!-- Inventory View -->
<main id="view-inventory" class="activity panel view-panel">
    <header class="activity-header">
        <h2>Your Inventory</h2>
    </header>
    
    <!-- Rarity/Category Filter Tabs -->
    <div class="inventory-filters" style="display: flex; gap: 0.75rem; padding: 1rem 1.5rem; border-bottom: 2px solid var(--border-color); background: rgba(0,0,0,0.01);">
        <button id="inv-filter-all" class="nav-btn active" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; box-shadow: 2px 2px 0px var(--border-color); margin: 0; width: auto;">All</button>
        <button id="inv-filter-consumable" class="nav-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; box-shadow: 2px 2px 0px var(--border-color); margin: 0; width: auto;">Consumables</button>
        <button id="inv-filter-material" class="nav-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; box-shadow: 2px 2px 0px var(--border-color); margin: 0; width: auto;">Materials</button>
    </div>
    
    <div class="players-page" style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        <ul id="inventory-list" class="scroll-area" style="list-style: none; display: flex; flex-direction: column; gap: 1rem; padding: 0;">
            <!-- Dynamically loaded item cards will render here -->
        </ul>
    </div>
    
    <!-- Pagination Navigation Controls -->
    <div class="inventory-pagination" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-top: 2px solid var(--border-color); background: rgba(0,0,0,0.01); height: 60px;">
        <button id="inv-prev-page" class="nav-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; box-shadow: 2px 2px 0px var(--border-color); margin: 0; width: auto;">&larr; Prev</button>
        <span id="inv-page-indicator" style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700;">Page 1 of 1</span>
        <button id="inv-next-page" class="nav-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; box-shadow: 2px 2px 0px var(--border-color); margin: 0; width: auto;">Next &rarr;</button>
    </div>
</main>
```

---

## Proposed JavaScript Changes (`public/game.js`)

### 1. Register UI selectors
Add `invFilterAll`, `invFilterConsumable`, `invFilterMaterial`, `invPrevPage`, `invNextPage`, and `invPageIndicator` inside our `ui` object map.

### 2. State & Array Slicing inside `renderInventory()`
* Define filter arrays to evaluate `gameDb.items[itemKey].type` matching `'material'` or `'consumable'`.
* Slice filtered arrays dynamically based on `inventoryPage` and `ITEMS_PER_PAGE = 4`.
* Disable **Prev** and **Next** buttons appropriately (e.g. disable Prev on Page 1, disable Next on the last page).

### 3. Register Event Listeners
* Add click listeners to filter tabs:
  - Toggle the `.active` class state.
  - Reset `inventoryPage = 1`.
  - Update `inventoryCategory = 'all' | 'consumable' | 'material'`.
  - Call `renderInventory()`.
* Add click listeners to page selectors:
  - Increment/decrement `inventoryPage`.
  - Call `renderInventory()`.

---

## Verification Plan

### Automated & Manual Verification
1. **Layout Integrity:** Open the **Inventory** tab. Verify the filter bar and bottom pagination selector display cleanly and match the Brutalist style.
2. **Category Filter Test:** Collect materials (Matcha Leaves) and consumables (Rice Balls). Select **Consumables** and verify that only Rice Balls render. Select **Materials** and verify only Matcha Leaves display.
3. **Pagination Split Test:** Collect more than 4 distinct items. Verify that the inventory list automatically splits the view, renders exactly 4 cards on Page 1, disables the Prev page control, and enables the Next page control.
4. **Pagination Navigation Test:** Click **Next** on Page 1. Verify the list swaps cards to Page 2, disables the Next page button, and updates the text to `Page 2 of 2`.
