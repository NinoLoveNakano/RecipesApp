class MealPlanner {
    constructor(storage) {
        this.storage = storage;
        this.draggedRecipe = null;
        this.currentWeek = this.getCurrentWeekStart();
        this.initializeMealPlanner();
        this.bindEvents();
    }
    initializeMealPlanner() {
        this.renderMealPlan();
        this.renderRecipePicker();
        this.setupDragAndDrop();
    }
    bindEvents() {
        document.getElementById('auto-fill-btn').addEventListener('click', () => {
            this.autoFillWeek();
        });
        document.getElementById('picker-search').addEventListener('input', (e) => {
            this.filterRecipePicker(e.target.value);
        });
    }
    getCurrentWeekStart() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
        return new Date(today.setDate(diff));
    }
    renderMealPlan() {
        const mealPlan = this.storage.getMealPlan();
        const recipes = this.storage.getRecipes();
        if (!mealPlan) return;
        document.querySelectorAll('.meal-slot').forEach(slot => {
            slot.innerHTML = '';
            slot.classList.remove('has-recipe');
        });
        Object.entries(mealPlan).forEach(([day, meals]) => {
            Object.entries(meals).forEach(([mealType, recipeId]) => {
                if (recipeId) {
                    const recipe = recipes.find(r => r.id === recipeId);
                    if (recipe) {
                        this.addRecipeToSlot(day, mealType, recipe);
                    }
                }
            });
        });
    }
    addRecipeToSlot(day, mealType, recipe) {
        const slot = document.querySelector(`[data-day="${day}"][data-meal="${mealType}"]`);
        if (!slot) return;
        slot.classList.add('has-recipe');
        slot.innerHTML = `
            <div class="meal-recipe" data-recipe-id="${recipe.id}">
                <span class="meal-recipe-name">${Utils.sanitizeHTML(recipe.name)}</span>
                <button class="meal-recipe-remove" title="Удалить">
                    ✕
                </button>
            </div>
        `;
        slot.querySelector('.meal-recipe-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeRecipeFromSlot(day, mealType);
        });
        slot.querySelector('.meal-recipe-name').addEventListener('click', () => {
            if (window.app && window.app.recipeManager) {
                window.app.recipeManager.showRecipeDetail(recipe);
            }
        });
    }
    removeRecipeFromSlot(day, mealType) {
        const slot = document.querySelector(`[data-day="${day}"][data-meal="${mealType}"]`);
        if (!slot) return;
        const recipeElement = slot.querySelector('.meal-recipe');
        if (recipeElement) {
            Utils.animateElement(recipeElement, 'animate-fade-out').then(() => {
                slot.innerHTML = '';
                slot.classList.remove('has-recipe');
                this.storage.clearMealPlanSlot(day, mealType);
                if (window.app) {
                    window.app.onMealPlanUpdated();
                }
            });
        }
    }
    renderRecipePicker() {
        const recipes = this.storage.getRecipes();
        const pickerGrid = document.getElementById('recipe-picker-grid');
        pickerGrid.innerHTML = '';
        if (recipes.length === 0) {
            pickerGrid.innerHTML = '<p class="text-center">Нет рецептов для добавления в план</p>';
            return;
        }
        recipes.forEach(recipe => {
            const card = this.createRecipePickerCard(recipe);
            pickerGrid.appendChild(card);
        });
    }
    createRecipePickerCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-picker-card';
        card.draggable = true;
        card.dataset.recipeId = recipe.id;
        const categoryColor = Utils.getCategoryColor(recipe.category);
        card.innerHTML = `
            <h4>${Utils.sanitizeHTML(recipe.name)}</h4>
            <div class="recipe-meta">
                <span class="recipe-time">⏱️ ${Utils.formatCookingTime(recipe.cookingTime)}</span>
                <span class="recipe-difficulty">${Utils.sanitizeHTML(recipe.difficulty)}</span>
            </div>
            <div class="recipe-category" style="background-color: ${categoryColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-top: 8px;">
                ${Utils.sanitizeHTML(recipe.category)}
            </div>
        `;
        card.addEventListener('dragstart', (e) => {
            this.draggedRecipe = recipe;
            e.dataTransfer.setData('text/plain', recipe.id);
            e.dataTransfer.effectAllowed = 'copy';
            card.classList.add('dragging');
            this.createDragPreview(recipe, e);
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            this.draggedRecipe = null;
            this.removeDragPreview();
        });
        card.addEventListener('click', () => {
            if (window.app && window.app.recipeManager) {
                window.app.recipeManager.showRecipeDetail(recipe);
            }
        });
        return card;
    }
    createDragPreview(recipe, event) {
        const preview = document.createElement('div');
        preview.id = 'drag-preview';
        preview.className = 'drag-preview';
        preview.textContent = recipe.name;
        document.body.appendChild(preview);
        const updatePreviewPosition = (e) => {
            preview.style.left = (e.clientX + 10) + 'px';
            preview.style.top = (e.clientY + 10) + 'px';
        };
        updatePreviewPosition(event);
        const handleMouseMove = (e) => updatePreviewPosition(e);
        document.addEventListener('mousemove', handleMouseMove);
        this.cleanupDragPreview = () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }
    removeDragPreview() {
        const preview = document.getElementById('drag-preview');
        if (preview) {
            preview.remove();
        }
        if (this.cleanupDragPreview) {
            this.cleanupDragPreview();
            this.cleanupDragPreview = null;
        }
    }
    setupDragAndDrop() {
        const mealSlots = document.querySelectorAll('.meal-slot');
        mealSlots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                slot.classList.add('drag-over');
                const day = slot.dataset.day;
                const daySlots = document.querySelectorAll(`[data-day="${day}"]`);
                daySlots.forEach(daySlot => daySlot.classList.add('day-highlight'));
            });
            slot.addEventListener('dragleave', (e) => {
                if (!slot.contains(e.relatedTarget)) {
                    slot.classList.remove('drag-over');
                    const day = slot.dataset.day;
                    const daySlots = document.querySelectorAll(`[data-day="${day}"]`);
                    const anyHovered = Array.from(daySlots).some(s => s.classList.contains('drag-over'));
                    if (!anyHovered) {
                        daySlots.forEach(daySlot => daySlot.classList.remove('day-highlight'));
                    }
                }
            });
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                document.querySelectorAll('.meal-slot').forEach(s => s.classList.remove('day-highlight'));
                const recipeId = e.dataTransfer.getData('text/plain');
                const recipe = this.storage.getRecipeById(recipeId);
                if (recipe) {
                    const day = slot.dataset.day;
                    const mealType = slot.dataset.meal;
                    this.assignRecipeToSlot(day, mealType, recipe);
                }
            });
            this.setupMealSlotDragging(slot);
        });
    }
    setupMealSlotDragging(slot) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const mealRecipe = slot.querySelector('.meal-recipe');
                    if (mealRecipe) {
                        this.makeMealRecipeDraggable(mealRecipe, slot);
                    }
                }
            });
        });
        observer.observe(slot, { childList: true });
        const existingRecipe = slot.querySelector('.meal-recipe');
        if (existingRecipe) {
            this.makeMealRecipeDraggable(existingRecipe, slot);
        }
    }
    makeMealRecipeDraggable(mealRecipeElement, slot) {
        mealRecipeElement.draggable = true;
        mealRecipeElement.style.cursor = 'grab';
        mealRecipeElement.addEventListener('dragstart', (e) => {
            const recipeId = mealRecipeElement.dataset.recipeId;
            const recipe = this.storage.getRecipeById(recipeId);
            if (recipe) {
                this.draggedRecipe = recipe;
                e.dataTransfer.setData('text/plain', recipeId);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/source-day', slot.dataset.day);
                e.dataTransfer.setData('text/source-meal', slot.dataset.meal);
                mealRecipeElement.style.opacity = '0.5';
                slot.classList.add('dragging-from');
                this.createDragPreview(recipe, e);
            }
        });
        mealRecipeElement.addEventListener('dragend', () => {
            mealRecipeElement.style.opacity = '1';
            mealRecipeElement.style.cursor = 'grab';
            slot.classList.remove('dragging-from');
            this.draggedRecipe = null;
            this.removeDragPreview();
        });
        mealRecipeElement.addEventListener('mousedown', () => {
            mealRecipeElement.style.cursor = 'grabbing';
        });
        mealRecipeElement.addEventListener('mouseup', () => {
            mealRecipeElement.style.cursor = 'grab';
        });
    }
    assignRecipeToSlot(day, mealType, recipe) {
        const success = this.storage.setMealPlanSlot(day, mealType, recipe.id);
        if (success) {
            this.addRecipeToSlot(day, mealType, recipe);
            const slot = document.querySelector(`[data-day="${day}"][data-meal="${mealType}"]`);
            Utils.animateElement(slot, 'drop-success');
            if (window.app) {
                window.app.onMealPlanUpdated();
            }
            Utils.showToast(`${recipe.name} добавлен в план!`, 'success');
        } else {
            Utils.showToast('Ошибка добавления рецепта в план', 'error');
        }
    }
    filterRecipePicker(searchTerm) {
        const cards = document.querySelectorAll('.recipe-picker-card');
        cards.forEach(card => {
            const recipeName = card.querySelector('h4').textContent.toLowerCase();
            const matches = recipeName.includes(searchTerm.toLowerCase());
            card.style.display = matches ? 'block' : 'none';
            if (matches && searchTerm) {
                const nameElement = card.querySelector('h4');
                nameElement.innerHTML = Utils.highlightText(nameElement.textContent, searchTerm);
            }
        });
    }

    autoFillWeek() {
        const recipes = this.storage.getRecipes();
        if (recipes.length === 0) {
            Utils.showToast('Нет рецептов для автозаполнения', 'warning');
            return;
        }
        const confirmAutoFill = confirm('Автоматически заполнить план питания? Это заменит текущие назначения.');
        if (confirmAutoFill) {
            Utils.showLoading();
            setTimeout(() => {
                const success = this.storage.autoFillMealPlan();
                if (success) {
                    this.renderMealPlan();
                    document.querySelectorAll('.meal-slot').forEach((slot, index) => {
                        setTimeout(() => {
                            if (slot.classList.contains('has-recipe')) {
                                Utils.animateElement(slot, 'animate-bounce');
                            }
                        }, index * 100);
                    });
                    if (window.app) {
                        window.app.onMealPlanUpdated();
                    }
                }
                Utils.hideLoading();
            }, 500);
        }
    }
    refreshRecipePicker() {
        this.renderRecipePicker();
    }
    refresh() {
        this.renderMealPlan();
        this.renderRecipePicker();
    }
    getPlannedRecipes() {
        const mealPlan = this.storage.getMealPlan();
        const recipes = this.storage.getRecipes();
        const plannedRecipeIds = new Set();
        Object.values(mealPlan).forEach(dayMeals => {
            Object.values(dayMeals).forEach(recipeId => {
                if (recipeId) {
                    plannedRecipeIds.add(recipeId);
                }
            });
        });
        return Array.from(plannedRecipeIds).map(id => 
            recipes.find(recipe => recipe.id === id)
        ).filter(Boolean);
    }
}
window.MealPlanner = MealPlanner;
