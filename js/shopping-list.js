class ShoppingList {
    constructor(storage) {
        this.storage = storage;
        this.initializeShoppingList();
        this.bindEvents();
    }
    initializeShoppingList() {
        this.renderShoppingList();
    }
    bindEvents() {
        document.getElementById('add-manual-item-btn').addEventListener('click', () => {
            this.addManualItem();
        });
        ['manual-item-name', 'manual-item-quantity'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addManualItem();
                }
            });
        });
        document.getElementById('clear-shopping-btn').addEventListener('click', () => {
            this.clearShoppingList();
        });
        document.getElementById('export-shopping-btn').addEventListener('click', () => {
            this.exportShoppingList();
        });
    }
    renderShoppingList() {
        const shoppingList = this.storage.getShoppingList();
        const categoriesContainer = document.getElementById('shopping-categories');
        const emptyState = document.getElementById('shopping-empty');
        if (!shoppingList || shoppingList.items.length === 0) {
            categoriesContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        categoriesContainer.style.display = 'block';
        emptyState.style.display = 'none';
        const groupedItems = this.storage.groupShoppingItemsByCategory();
        categoriesContainer.innerHTML = '';
        Object.entries(groupedItems).forEach(([category, items]) => {
            if (items.length > 0) {
                const categoryElement = this.createCategoryElement(category, items);
                categoriesContainer.appendChild(categoryElement);
            }
        });
        const categories = categoriesContainer.querySelectorAll('.shopping-category');
        categories.forEach((category, index) => {
            category.style.animationDelay = `${index * 0.1}s`;
            category.classList.add('animate-fade-in');
        });
    }
    createCategoryElement(category, items) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'shopping-category';
        const purchasedCount = items.filter(item => item.purchased).length;
        const totalCount = items.length;
        categoryDiv.innerHTML = `
            <h3>
                ${this.getCategoryDisplayName(category)}
                <span class="category-count">(${purchasedCount}/${totalCount})</span>
            </h3>
            <div class="shopping-items"></div>
        `;
        const itemsContainer = categoryDiv.querySelector('.shopping-items');
        items.forEach(item => {
            const itemElement = this.createShoppingItemElement(item);
            itemsContainer.appendChild(itemElement);
        });
        return categoryDiv;
    }
    createShoppingItemElement(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `shopping-item ${item.purchased ? 'purchased' : ''}`;
        itemDiv.dataset.itemId = item.id;
        itemDiv.innerHTML = `
            <input type="checkbox" ${item.purchased ? 'checked' : ''} 
                   class="item-checkbox" title="Отметить как купленный">
            <div class="shopping-item-details">
                <span class="shopping-item-name">${Utils.sanitizeHTML(item.name)}</span>
                <span class="shopping-item-quantity">${Utils.sanitizeHTML(item.quantity)}</span>
            </div>
            ${item.manual ? `
                <button class="shopping-item-remove" title="Удалить товар">
                    ✕
                </button>
            ` : ''}
        `;
        const checkbox = itemDiv.querySelector('.item-checkbox');
        checkbox.addEventListener('change', () => {
            this.toggleItemPurchased(item.id);
        });
        const removeBtn = itemDiv.querySelector('.shopping-item-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeShoppingItem(item.id);
            });
        }
        return itemDiv;
    }
    getCategoryDisplayName(category) {
        const displayNames = {
            'овощи': '🥕 Овощи',
            'фрукты': '🍎 Фрукты',
            'молочные': '🥛 Молочные продукты',
            'мясо': '🥩 Мясо и рыба',
            'бакалея': '🌾 Бакалея',
            'специи': '🧂 Специи и приправы',
            'напитки': '🥤 Напитки',
            'прочее': '📦 Прочее'
        };
        return displayNames[category] || category;
    }
    addManualItem() {
        const nameInput = document.getElementById('manual-item-name');
        const quantityInput = document.getElementById('manual-item-quantity');
        const categorySelect = document.getElementById('manual-item-category');
        const name = nameInput.value.trim();
        const quantity = quantityInput.value.trim();
        const category = categorySelect.value;
        if (!name) {
            Utils.showToast('Введите название товара', 'warning');
            nameInput.focus();
            return;
        }
        const item = this.storage.addShoppingItem(name, quantity, category);
        if (item) {
            nameInput.value = '';
            quantityInput.value = '';
            nameInput.focus();
            this.renderShoppingList();
            setTimeout(() => {
                const newItemElement = document.querySelector(`[data-item-id="${item.id}"]`);
                if (newItemElement) {
                    Utils.animateElement(newItemElement, 'animate-bounce');
                }
            }, 100);
        }
    }
    toggleItemPurchased(itemId) {
        const success = this.storage.toggleShoppingItemPurchased(itemId);
        if (success) {
            const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
            if (itemElement) {
                const checkbox = itemElement.querySelector('.item-checkbox');
                const isPurchased = checkbox.checked;
                itemElement.classList.toggle('purchased', isPurchased);
                Utils.animateElement(itemElement, 'animate-pulse');
                this.updateCategoryCount(itemElement);
                Utils.showToast(
                    isPurchased ? 'Товар отмечен как купленный' : 'Товар возвращен в список',
                    'success'
                );
            }
        }
    }
    updateCategoryCount(itemElement) {
        const category = itemElement.closest('.shopping-category');
        if (category) {
            const items = category.querySelectorAll('.shopping-item');
            const purchasedItems = category.querySelectorAll('.shopping-item.purchased');
            const countElement = category.querySelector('.category-count');
            if (countElement) {
                countElement.textContent = `(${purchasedItems.length}/${items.length})`;
            }
        }
    }
    removeShoppingItem(itemId) {
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!itemElement) return;
        Utils.animateElement(itemElement, 'animate-fade-out').then(() => {
            const success = this.storage.removeShoppingItem(itemId);
            if (success) {
                itemElement.remove();
                const category = itemElement.closest('.shopping-category');
                if (category) {
                    const remainingItems = category.querySelectorAll('.shopping-item');
                    if (remainingItems.length <= 1) { 
                        Utils.animateElement(category, 'animate-fade-out').then(() => {
                            category.remove();
                            this.checkEmptyState();
                        });
                    } else {
                        this.updateCategoryCount(category);
                    }
                }
                Utils.showToast('Товар удален из списка', 'success');
            }
        });
    }
    checkEmptyState() {
        const categoriesContainer = document.getElementById('shopping-categories');
        const emptyState = document.getElementById('shopping-empty');
        const categories = categoriesContainer.querySelectorAll('.shopping-category');
        if (categories.length === 0) {
            categoriesContainer.style.display = 'none';
            emptyState.style.display = 'block';
        }
    }
    clearShoppingList() {
        const confirmClear = confirm('Вы уверены, что хотите очистить весь список покупок?');
        if (confirmClear) {
            Utils.showLoading();
            setTimeout(() => {
                const success = this.storage.clearShoppingList();
                if (success) {
                    this.renderShoppingList();
                }
                Utils.hideLoading();
            }, 300);
        }
    }
    exportShoppingList() {
        Utils.showLoading();
        setTimeout(() => {
            const success = this.storage.exportShoppingListAsText();
            Utils.hideLoading();
            if (!success) {
                Utils.showToast('Ошибка экспорта списка покупок', 'error');
            }
        }, 500);
    }
    generateFromMealPlan() {
        const success = this.storage.generateShoppingListFromMealPlan();
        if (success) {
            this.renderShoppingList();
            Utils.showToast('Список покупок обновлен из плана питания!', 'success');
        }
    }
    getShoppingStats() {
        const shoppingList = this.storage.getShoppingList();
        if (!shoppingList || !shoppingList.items.length) {
            return {
                total: 0,
                purchased: 0,
                remaining: 0,
                categories: 0
            };
        }
        const groupedItems = this.storage.groupShoppingItemsByCategory();
        const categoriesWithItems = Object.values(groupedItems).filter(items => items.length > 0);
        return {
            total: shoppingList.items.length,
            purchased: shoppingList.items.filter(item => item.purchased).length,
            remaining: shoppingList.items.filter(item => !item.purchased).length,
            categories: categoriesWithItems.length
        };
    }
    markAllCategoryPurchased(category) {
        const shoppingList = this.storage.getShoppingList();
        let updated = false;
        shoppingList.items.forEach(item => {
            if (item.category === category && !item.purchased) {
                item.purchased = true;
                updated = true;
            }
        });
        if (updated) {
            shoppingList.lastUpdated = new Date().toISOString();
            this.storage.saveShoppingList(shoppingList);
            this.renderShoppingList();
            Utils.showToast(`Все товары в категории "${this.getCategoryDisplayName(category)}" отмечены как купленные`, 'success');
        }
    }
    clearPurchasedItems() {
        const shoppingList = this.storage.getShoppingList();
        const purchasedCount = shoppingList.items.filter(item => item.purchased).length;
        if (purchasedCount === 0) {
            Utils.showToast('Нет купленных товаров для удаления', 'info');
            return;
        }
        const confirmClear = confirm(`Удалить ${purchasedCount} купленных товаров из списка?`);
        if (confirmClear) {
            shoppingList.items = shoppingList.items.filter(item => !item.purchased);
            shoppingList.lastUpdated = new Date().toISOString();
            this.storage.saveShoppingList(shoppingList);
            this.renderShoppingList();
            Utils.showToast(`${purchasedCount} купленных товаров удалено`, 'success');
        }
    }
    refresh() {
        this.renderShoppingList();
    }
}
window.ShoppingList = ShoppingList;
