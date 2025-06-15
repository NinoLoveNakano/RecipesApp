class RecipeManager {
    constructor(storage) {
        this.storage = storage;
        this.currentEditingRecipe = null;
        this.currentFilters = {};
        this.searchDebounce = Utils.debounce(this.performSearch.bind(this), 300);
        this.initializeRecipeManager();
        this.bindEvents();
    }
    initializeRecipeManager() {
        this.renderRecipes();
        this.setupModal();
    }
    bindEvents() {
        const addBtn = document.getElementById('add-recipe-btn');
        
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.openRecipeForm();
            });
        }

        document.getElementById('recipe-search').addEventListener('input', (e) => {
            this.searchDebounce(e.target.value);
        });
        document.getElementById('search-btn').addEventListener('click', () => {
            const query = document.getElementById('recipe-search').value;
            this.performSearch(query);
        });
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value;
            this.applyFilters();
        });
        document.getElementById('difficulty-filter').addEventListener('change', (e) => {
            this.currentFilters.difficulty = e.target.value;
            this.applyFilters();
        });
        document.getElementById('time-filter').addEventListener('change', (e) => {
            this.currentFilters.maxTime = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });
        document.getElementById('novelty-filter').addEventListener('change', (e) => {
            this.currentFilters.novelty = e.target.value;
            this.applyFilters();
        });
        document.getElementById('recipe-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRecipe();
        });
        document.getElementById('cancel-recipe-btn').addEventListener('click', () => {
            this.closeRecipeForm();
        });
        document.getElementById('add-ingredient-btn').addEventListener('click', () => {
            this.addIngredient();
        });
        document.getElementById('add-instruction-btn').addEventListener('click', () => {
            this.addInstruction();
        });
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
        document.getElementById('edit-recipe-btn').addEventListener('click', () => {
            if (this.currentEditingRecipe) {
                this.openRecipeForm(this.currentEditingRecipe);
                this.closeModal(document.getElementById('recipe-detail-modal'));
            }
        });
        document.getElementById('delete-recipe-btn').addEventListener('click', () => {
            if (this.currentEditingRecipe) {
                this.confirmDeleteRecipe(this.currentEditingRecipe);
                this.closeModal(document.getElementById('recipe-detail-modal'));
            }
        });
        document.getElementById('confirm-cancel').addEventListener('click', () => {
            this.closeModal(document.getElementById('confirm-modal'));
        });
        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.executeDelete();
        });
        ['ingredient-name', 'ingredient-quantity'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addIngredient();
                }
            });
        });
        document.getElementById('instruction-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.addInstruction();
            }
        });
    }
    renderRecipes(recipes = null) {
        const recipesGrid = document.getElementById('recipes-grid');
        const emptyState = document.getElementById('recipes-empty');
        if (!recipes) {
            recipes = this.storage.getRecipes();
        }
        recipesGrid.innerHTML = '';
        if (recipes.length === 0) {
            recipesGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        recipesGrid.style.display = 'grid';
        emptyState.style.display = 'none';
        recipes.forEach((recipe, index) => {
            const recipeCard = this.createRecipeCard(recipe);
            recipeCard.style.animationDelay = `${index * 0.1}s`;
            recipeCard.classList.add('animate-fade-in');
            recipesGrid.appendChild(recipeCard);
        });
    }
    createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card hover-lift';
        card.setAttribute('data-recipe-id', recipe.id);
        card.draggable = true;
        const categoryColor = Utils.getCategoryColor(recipe.category);
        const difficultyColor = Utils.getDifficultyColor(recipe.difficulty);
        card.innerHTML = `
            <div class="recipe-card-header">
                <h3>${Utils.sanitizeHTML(recipe.name)}</h3>
                <div class="recipe-card-actions">
                    <button class="btn-icon edit-recipe" title="Редактировать">
                        ✏️
                    </button>
                    <button class="btn-icon delete-recipe" title="Удалить">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="recipe-meta">
                <span class="recipe-time">⏱️ ${Utils.formatCookingTime(recipe.cookingTime)}</span>
                <span class="recipe-difficulty" style="color: ${difficultyColor}">
                    📊 ${Utils.sanitizeHTML(recipe.difficulty)}
                </span>
            </div>
            <div class="recipe-category" style="background-color: ${categoryColor}">
                ${Utils.sanitizeHTML(recipe.category)}
            </div>
            ${recipe.description ? `
                <div class="recipe-description">
                    ${Utils.sanitizeHTML(recipe.description)}
                </div>
            ` : ''}
            <div class="recipe-ingredients-preview">
                <strong>Ингредиенты:</strong> ${recipe.ingredients.slice(0, 3).map(ing => ing.name).join(', ')}${recipe.ingredients.length > 3 ? '...' : ''}
            </div>
        `;
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.recipe-card-actions')) {
                this.showRecipeDetail(recipe);
            }
        });
        card.querySelector('.edit-recipe').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openRecipeForm(recipe);
        });
        card.querySelector('.delete-recipe').addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeleteRecipe(recipe);
        });
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', recipe.id);
            e.dataTransfer.effectAllowed = 'copy';
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
        return card;
    }
    showRecipeDetail(recipe) {
        this.currentEditingRecipe = recipe;
        const modal = document.getElementById('recipe-detail-modal');
        document.getElementById('detail-recipe-name').textContent = recipe.name;
        document.getElementById('detail-time').textContent = Utils.formatCookingTime(recipe.cookingTime);
        document.getElementById('detail-difficulty').textContent = recipe.difficulty;
        document.getElementById('detail-category').textContent = recipe.category;
        if (recipe.description) {
            document.getElementById('detail-description').textContent = recipe.description;
            document.querySelector('.recipe-description').style.display = 'block';
        } else {
            document.querySelector('.recipe-description').style.display = 'none';
        }
        const ingredientsList = document.getElementById('detail-ingredients');
        ingredientsList.innerHTML = '';
        recipe.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="ingredient-name">${Utils.sanitizeHTML(ingredient.name)}</span>
                <span class="ingredient-amount">${Utils.sanitizeHTML(ingredient.quantity)} ${Utils.sanitizeHTML(ingredient.unit)}</span>
            `;
            ingredientsList.appendChild(li);
        });
        const instructionsElement = document.getElementById('detail-instructions');
        if (Array.isArray(recipe.instructions)) {
            instructionsElement.innerHTML = recipe.instructions.map((instruction, index) => 
                `<div class="instruction-step">${index + 1}. ${Utils.sanitizeHTML(instruction)}</div>`
            ).join('');
        } else {
            instructionsElement.textContent = recipe.instructions;
        }
        this.openModal(modal);
    }
    performSearch(query) {
        const filters = {
            ...this.currentFilters
        };
        const recipes = this.storage.searchRecipes(query, filters);
        this.renderRecipes(recipes);
        if (query) {
            this.highlightSearchTerms(query);
        }
    }
    applyFilters() {
        const query = document.getElementById('recipe-search').value;
        this.performSearch(query);
    }
    highlightSearchTerms(searchTerm) {
        const recipeCards = document.querySelectorAll('.recipe-card');
        recipeCards.forEach(card => {
            const textElements = card.querySelectorAll('h3, .recipe-description, .recipe-ingredients-preview');
            textElements.forEach(element => {
                if (element.textContent) {
                    element.innerHTML = Utils.highlightText(element.innerHTML, searchTerm);
                }
            });
        });
    }
    openRecipeForm(recipe = null) {
        this.currentEditingRecipe = recipe;
        const modal = document.getElementById('recipe-modal');
        const form = document.getElementById('recipe-form');
        const title = document.getElementById('modal-title');
        form.reset();
        this.clearIngredientsList();
        this.clearInstructionsList();
        if (recipe) {
            title.textContent = 'Редактировать рецепт';
            this.populateRecipeForm(recipe);
        } else {
            title.textContent = 'Добавить рецепт';
        }
        this.openModal(modal);
        document.getElementById('recipe-name').focus();
    }
    populateRecipeForm(recipe) {
        document.getElementById('recipe-name').value = recipe.name;
        document.getElementById('recipe-description').value = recipe.description || '';
        document.getElementById('recipe-time').value = recipe.cookingTime;
        document.getElementById('recipe-difficulty').value = recipe.difficulty;
        document.getElementById('recipe-category').value = recipe.category;
        recipe.ingredients.forEach(ingredient => {
            this.addIngredientToList(ingredient);
        });
        if (recipe.instructions) {
            if (Array.isArray(recipe.instructions)) {
                recipe.instructions.forEach(instruction => {
                    this.addInstructionToList(instruction);
                });
            } else {
                const instructionSteps = recipe.instructions.split('\n').filter(step => step.trim());
                instructionSteps.forEach(step => {
                    const cleanStep = step.replace(/^\d+\.\s*/, '').trim();
                    if (cleanStep) {
                        this.addInstructionToList(cleanStep);
                    }
                });
            }
        }
    }
    setupModal() {
        this.clearIngredientsList();
        this.clearInstructionsList();
    }
    addIngredient() {
        const nameInput = document.getElementById('ingredient-name');
        const quantityInput = document.getElementById('ingredient-quantity');
        const unitSelect = document.getElementById('ingredient-unit');
        const name = nameInput.value.trim();
        const quantity = quantityInput.value.trim();
        const unit = unitSelect.value;
        if (!name) {
            Utils.showToast('Введите название ингредиента', 'warning');
            nameInput.focus();
            return;
        }
        const ingredient = {
            name,
            quantity: quantity || '',
            unit
        };
        this.addIngredientToList(ingredient);
        nameInput.value = '';
        quantityInput.value = '';
        unitSelect.value = 'г';
        nameInput.focus();
    }
    addIngredientToList(ingredient) {
        const ingredientsList = document.getElementById('ingredients-list');
        const ingredientItem = document.createElement('div');
        ingredientItem.className = 'ingredient-item animate-slide-in-left';
        ingredientItem.innerHTML = `
            <div class="ingredient-details">
                <strong>${Utils.sanitizeHTML(ingredient.name)}</strong>
                ${ingredient.quantity ? ` - ${Utils.sanitizeHTML(ingredient.quantity)} ${Utils.sanitizeHTML(ingredient.unit)}` : ''}
            </div>
            <button type="button" class="btn-icon remove-ingredient" title="Удалить">
                ❌
            </button>
        `;
        ingredientItem.dataset.ingredient = JSON.stringify(ingredient);
        ingredientItem.querySelector('.remove-ingredient').addEventListener('click', () => {
            Utils.animateElement(ingredientItem, 'animate-fade-out').then(() => {
                ingredientItem.remove();
            });
        });
        ingredientsList.appendChild(ingredientItem);
    }
    clearIngredientsList() {
        document.getElementById('ingredients-list').innerHTML = '';
    }
    addInstruction() {
        const textInput = document.getElementById('instruction-text');
        const text = textInput.value.trim();
        if (!text) {
            Utils.showToast('Введите текст инструкции', 'warning');
            textInput.focus();
            return;
        }
        this.addInstructionToList(text);
        textInput.value = '';
        textInput.focus();
    }
    addInstructionToList(instructionText) {
        const instructionsList = document.getElementById('instructions-list');
        const instructionItems = instructionsList.querySelectorAll('.instruction-item');
        const stepNumber = instructionItems.length + 1;
        const instructionItem = document.createElement('div');
        instructionItem.className = 'instruction-item animate-slide-in-left';
        instructionItem.innerHTML = `
            <div class="instruction-number">${stepNumber}</div>
            <div class="instruction-details">
                <div class="instruction-text">${Utils.sanitizeHTML(instructionText)}</div>
            </div>
            <button type="button" class="btn-icon remove-instruction" title="Удалить">
                ❌
            </button>
        `;
        instructionItem.dataset.instruction = JSON.stringify({ text: instructionText, step: stepNumber });
        instructionItem.querySelector('.remove-instruction').addEventListener('click', () => {
            Utils.animateElement(instructionItem, 'animate-fade-out').then(() => {
                instructionItem.remove();
                this.updateInstructionNumbers();
            });
        });
        instructionsList.appendChild(instructionItem);
    }
    updateInstructionNumbers() {
        const instructionItems = document.querySelectorAll('.instruction-item');
        instructionItems.forEach((item, index) => {
            const numberElement = item.querySelector('.instruction-number');
            if (numberElement) {
                numberElement.textContent = index + 1;
                const data = JSON.parse(item.dataset.instruction);
                data.step = index + 1;
                item.dataset.instruction = JSON.stringify(data);
            }
        });
    }
    clearInstructionsList() {
        document.getElementById('instructions-list').innerHTML = '';
    }
    collectIngredients() {
        const ingredientItems = document.querySelectorAll('.ingredient-item');
        const ingredients = [];
        ingredientItems.forEach(item => {
            try {
                const ingredient = JSON.parse(item.dataset.ingredient);
                ingredients.push(ingredient);
            } catch (error) {
                console.error('Error parsing ingredient data:', error);
            }
        });
        return ingredients;
    }
    collectInstructions() {
        const instructionItems = document.querySelectorAll('.instruction-item');
        const instructions = [];
        instructionItems.forEach(item => {
            try {
                const instructionData = JSON.parse(item.dataset.instruction);
                instructions.push(instructionData.text);
            } catch (error) {
                console.error('Error parsing instruction data:', error);
            }
        });
        return instructions;
    }
    validateRecipeForm() {
        const name = document.getElementById('recipe-name').value.trim();
        const time = document.getElementById('recipe-time').value;
        const difficulty = document.getElementById('recipe-difficulty').value;
        const category = document.getElementById('recipe-category').value;
        const ingredients = this.collectIngredients();
        const instructions = this.collectInstructions();
        const errors = [];
        if (!name) {
            errors.push('Название рецепта обязательно');
        }
        if (!time || time < 1) {
            errors.push('Время приготовления должно быть больше 0');
        }
        if (!difficulty) {
            errors.push('Выберите сложность рецепта');
        }
        if (!category) {
            errors.push('Выберите категорию рецепта');
        }
        if (instructions.length === 0) {
            errors.push('Добавьте хотя бы одну инструкцию по приготовлению');
        }
        if (ingredients.length === 0) {
            errors.push('Добавьте хотя бы один ингредиент');
        }
        if (errors.length > 0) {
            Utils.showToast(errors.join('\n'), 'error');
            return false;
        }
        const formattedInstructions = instructions.map((instruction, index) => 
            `${index + 1}. ${instruction}`
        ).join('\n\n');
        return {
            name,
            description: document.getElementById('recipe-description').value.trim(),
            cookingTime: parseInt(time),
            difficulty,
            category,
            instructions: formattedInstructions,
            ingredients
        };
    }
    saveRecipe() {
        const recipeData = this.validateRecipeForm();
        if (!recipeData) return;
        Utils.showLoading();
        setTimeout(() => {
            try {
                if (this.currentEditingRecipe) {
                    const updatedRecipe = this.storage.updateRecipe(this.currentEditingRecipe.id, recipeData);
                    if (updatedRecipe) {
                        this.renderRecipes();
                        this.closeRecipeForm();
                    }
                } else {
                    const newRecipe = this.storage.addRecipe(recipeData);
                    if (newRecipe) {
                        this.renderRecipes();
                        this.closeRecipeForm();
                    }
                }
            } catch (error) {
                Utils.handleError(error, 'Ошибка сохранения рецепта');
            } finally {
                Utils.hideLoading();
            }
        }, 500);
    }
    confirmDeleteRecipe(recipe) {
        this.currentEditingRecipe = recipe;
        const modal = document.getElementById('confirm-modal');
        const message = document.getElementById('confirm-message');
        message.textContent = `Вы уверены, что хотите удалить рецепт "${recipe.name}"? Это действие нельзя отменить.`;
        this.openModal(modal);
    }
    executeDelete() {
        if (!this.currentEditingRecipe) return;
        Utils.showLoading();
        setTimeout(() => {
            try {
                const success = this.storage.deleteRecipe(this.currentEditingRecipe.id);
                if (success) {
                    this.renderRecipes();
                    this.closeModal(document.getElementById('confirm-modal'));
                    this.closeModal(document.getElementById('recipe-detail-modal'));
                    this.currentEditingRecipe = null;
                }
            } catch (error) {
                Utils.handleError(error, 'Ошибка удаления рецепта');
            } finally {
                Utils.hideLoading();
            }
        }, 300);
    }
    closeRecipeForm() {
        this.closeModal(document.getElementById('recipe-modal'));
        this.currentEditingRecipe = null;
    }
    openModal(modal) {
        modal.classList.add('active');
        modal.classList.add('animate-scale-in');
        document.body.style.overflow = 'hidden';
    }
    closeModal(modal) {
        modal.classList.remove('active');
        modal.classList.remove('animate-scale-in');
        document.body.style.overflow = '';
    }
    getRecipesForPlanner() {
        return this.storage.getRecipes();
    }

    
    refresh() {
        this.renderRecipes();
    }
}
window.RecipeManager = RecipeManager;
