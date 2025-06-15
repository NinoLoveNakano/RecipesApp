class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            RECIPES: 'recipe_app_recipes',
            MEAL_PLAN: 'recipe_app_meal_plan',
            SHOPPING_LIST: 'recipe_app_shopping_list',
            SETTINGS: 'recipe_app_settings'
        };
        this.initialized = false;
        this.initPromise = this.initializeStorage();
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initPromise;
            this.initialized = true;
        }
    }
    async initializeStorage() {
        try {
            if (!this.getRecipes().length) {
                await this.loadSampleRecipes();
            }
            await this.loadIngredientSynonyms();
            if (!this.getMealPlan()) {
                this.initializeMealPlan();
            }
            if (!this.getShoppingList()) {
                this.initializeShoppingList();
            }
            if (!this.getSettings()) {
                this.initializeSettings();
            }
        } catch (error) {
            Utils.handleError(error, 'Ошибка инициализации хранилища данных');
        }
    }
    async loadSampleRecipes() {
        try {
            const response = await fetch('./data/default-recipes.json');
            if (response.ok) {
                const defaultRecipes = await response.json();
                this.saveDefaultRecipes(defaultRecipes);
            } else {
                this.saveDefaultRecipes([]);
            }
        } catch (error) {
            console.warn('Could not load default recipes, starting with empty list');
            this.saveDefaultRecipes([]);
        }
    }
    
    async loadIngredientSynonyms() {
        try {
            const response = await fetch('./data/ingredient-synonyms.json');
            if (response.ok) {
                const synonyms = await response.json();
                Utils.setLocalStorage('ingredientSynonyms', synonyms);
                return synonyms;
            }
        } catch (error) {
            console.warn('Could not load ingredient synonyms');
        }
        return {};
    }
    
    saveDefaultRecipes(defaultRecipes) {
        Utils.setLocalStorage('defaultRecipes', defaultRecipes);
        const existingRecipes = this.getRecipes();
        if (existingRecipes.length === 0) {
            this.saveRecipes([...defaultRecipes]);
        }
    }
    initializeMealPlan() {
        const mealPlan = {
            monday: { breakfast: null, lunch: null, dinner: null, snack: null },
            tuesday: { breakfast: null, lunch: null, dinner: null, snack: null },
            wednesday: { breakfast: null, lunch: null, dinner: null, snack: null },
            thursday: { breakfast: null, lunch: null, dinner: null, snack: null },
            friday: { breakfast: null, lunch: null, dinner: null, snack: null },
            saturday: { breakfast: null, lunch: null, dinner: null, snack: null },
            sunday: { breakfast: null, lunch: null, dinner: null, snack: null }
        };
        this.saveMealPlan(mealPlan);
    }
    initializeShoppingList() {
        const shoppingList = {
            items: [],
            lastUpdated: new Date().toISOString()
        };
        this.saveShoppingList(shoppingList);
    }
    initializeSettings() {
        const settings = {
            theme: 'light',
            language: 'ru',
            autoGenerateShoppingList: true,
            defaultServings: 4,
            defaultCookingTime: 30,
            lastBackup: null
        };
        this.saveSettings(settings);
    }
    getRecipes() {
        return Utils.getLocalStorage(this.STORAGE_KEYS.RECIPES, []);
    }
    saveRecipes(recipes) {
        return Utils.setLocalStorage(this.STORAGE_KEYS.RECIPES, recipes);
    }
    addRecipe(recipe) {
        try {
            const recipes = this.getRecipes();
            const newRecipe = {
                id: Utils.generateId(),
                ...recipe,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            recipes.push(newRecipe);
            this.saveRecipes(recipes);
            Utils.showToast('Рецепт успешно добавлен!', 'success');
            return newRecipe;
        } catch (error) {
            Utils.handleError(error, 'Ошибка добавления рецепта');
            return null;
        }
    }
    updateRecipe(recipeId, updatedData) {
        try {
            const recipes = this.getRecipes();
            const index = recipes.findIndex(recipe => recipe.id === recipeId);
            if (index === -1) {
                throw new Error('Рецепт не найден');
            }
            recipes[index] = {
                ...recipes[index],
                ...updatedData,
                updatedAt: new Date().toISOString()
            };
            this.saveRecipes(recipes);
            Utils.showToast('Рецепт успешно обновлен!', 'success');
            return recipes[index];
        } catch (error) {
            Utils.handleError(error, 'Ошибка обновления рецепта');
            return null;
        }
    }
    deleteRecipe(recipeId) {
        try {
            const recipes = this.getRecipes();
            const filteredRecipes = recipes.filter(recipe => recipe.id !== recipeId);
            if (recipes.length === filteredRecipes.length) {
                throw new Error('Рецепт не найден');
            }
            this.saveRecipes(filteredRecipes);
            this.removeRecipeFromMealPlan(recipeId);
            Utils.showToast('Рецепт успешно удален!', 'success');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка удаления рецепта');
            return false;
        }
    }
    getRecipeById(recipeId) {
        const recipes = this.getRecipes();
        return recipes.find(recipe => recipe.id === recipeId) || null;
    }
    searchRecipes(query, filters = {}) {
        try {
            const recipes = this.getRecipes();
            let filteredRecipes = [...recipes];
            if (query) {
                const searchTerm = query.toLowerCase();
                const synonyms = Utils.getLocalStorage('ingredientSynonyms', {});
                
                filteredRecipes = filteredRecipes.filter(recipe => {
                    const nameMatch = recipe.name.toLowerCase().includes(searchTerm);
                    const descriptionMatch = recipe.description?.toLowerCase().includes(searchTerm);
                    
                    const ingredientMatch = recipe.ingredients.some(ingredient => {
                        const ingredientName = ingredient.name.toLowerCase();
                        
                        // Direct match
                        if (ingredientName.includes(searchTerm)) return true;
                        
                        // Synonym match
                        if (synonyms[searchTerm]) {
                            return synonyms[searchTerm].some(synonym => 
                                ingredientName.includes(synonym.toLowerCase())
                            );
                        }
                        
                        // Reverse synonym match
                        for (const [key, synonymList] of Object.entries(synonyms)) {
                            if (synonymList.includes(searchTerm) && ingredientName.includes(key.toLowerCase())) {
                                return true;
                            }
                        }
                        
                        return false;
                    });
                    
                    return nameMatch || descriptionMatch || ingredientMatch;
                });
            }
            if (filters.category) {
                filteredRecipes = filteredRecipes.filter(recipe => 
                    recipe.category === filters.category
                );
            }
            if (filters.difficulty) {
                filteredRecipes = filteredRecipes.filter(recipe => 
                    recipe.difficulty === filters.difficulty
                );
            }
            if (filters.maxTime) {
                filteredRecipes = filteredRecipes.filter(recipe => 
                    recipe.cookingTime <= filters.maxTime
                );
            }
            if (filters.novelty) {
                if (filters.novelty === 'newest') {
                    filteredRecipes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else if (filters.novelty === 'oldest') {
                    filteredRecipes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                }
            }
            return filteredRecipes;
        } catch (error) {
            Utils.handleError(error, 'Ошибка поиска рецептов');
            return [];
        }
    }
    getMealPlan() {
        return Utils.getLocalStorage(this.STORAGE_KEYS.MEAL_PLAN, null);
    }
    saveMealPlan(mealPlan) {
        return Utils.setLocalStorage(this.STORAGE_KEYS.MEAL_PLAN, mealPlan);
    }
    setMealPlanSlot(day, mealType, recipeId) {
        try {
            const mealPlan = this.getMealPlan();
            if (!mealPlan[day]) {
                mealPlan[day] = { breakfast: null, lunch: null, dinner: null, snack: null };
            }
            mealPlan[day][mealType] = recipeId;
            this.saveMealPlan(mealPlan);
            if (this.getSettings().autoGenerateShoppingList) {
                this.generateShoppingListFromMealPlan();
            }
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка обновления плана питания');
            return false;
        }
    }
    clearMealPlanSlot(day, mealType) {
        try {
            const mealPlan = this.getMealPlan();
            if (mealPlan[day]) {
                mealPlan[day][mealType] = null;
                this.saveMealPlan(mealPlan);
                if (this.getSettings().autoGenerateShoppingList) {
                    this.generateShoppingListFromMealPlan();
                }
            }
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка очистки плана питания');
            return false;
        }
    }
    clearWeekMealPlan() {
        try {
            this.initializeMealPlan();
            if (this.getSettings().autoGenerateShoppingList) {
                this.generateShoppingListFromMealPlan();
            }
            Utils.showToast('План питания очищен!', 'success');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка очистки плана питания');
            return false;
        }
    }
    removeRecipeFromMealPlan(recipeId) {
        try {
            const mealPlan = this.getMealPlan();
            let updated = false;
            Object.keys(mealPlan).forEach(day => {
                Object.keys(mealPlan[day]).forEach(mealType => {
                    if (mealPlan[day][mealType] === recipeId) {
                        mealPlan[day][mealType] = null;
                        updated = true;
                    }
                });
            });
            if (updated) {
                this.saveMealPlan(mealPlan);
                if (this.getSettings().autoGenerateShoppingList) {
                    this.generateShoppingListFromMealPlan();
                }
            }
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка удаления рецепта из плана питания');
            return false;
        }
    }
    autoFillMealPlan() {
        try {
            const recipes = this.getRecipes();
            if (recipes.length === 0) {
                Utils.showToast('Нет рецептов для автозаполнения', 'warning');
                return false;
            }
            const mealPlan = this.getMealPlan();
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
            const breakfastRecipes = recipes.filter(r => r.category === 'завтрак');
            const lunchRecipes = recipes.filter(r => ['обед', 'закуски'].includes(r.category));
            const dinnerRecipes = recipes.filter(r => ['ужин', 'обед'].includes(r.category));
            const snackRecipes = recipes.filter(r => ['закуски', 'десерт'].includes(r.category));
            days.forEach(day => {
                if (breakfastRecipes.length > 0) {
                    const randomRecipe = breakfastRecipes[Math.floor(Math.random() * breakfastRecipes.length)];
                    mealPlan[day].breakfast = randomRecipe.id;
                }
                if (lunchRecipes.length > 0) {
                    const randomRecipe = lunchRecipes[Math.floor(Math.random() * lunchRecipes.length)];
                    mealPlan[day].lunch = randomRecipe.id;
                }
                if (dinnerRecipes.length > 0) {
                    const randomRecipe = dinnerRecipes[Math.floor(Math.random() * dinnerRecipes.length)];
                    mealPlan[day].dinner = randomRecipe.id;
                }
                if (snackRecipes.length > 0 && Math.random() > 0.5) {
                    const randomRecipe = snackRecipes[Math.floor(Math.random() * snackRecipes.length)];
                    mealPlan[day].snack = randomRecipe.id;
                }
            });
            this.saveMealPlan(mealPlan);
            if (this.getSettings().autoGenerateShoppingList) {
                this.generateShoppingListFromMealPlan();
            }
            Utils.showToast('План питания автоматически заполнен!', 'success');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка автозаполнения плана питания');
            return false;
        }
    }
    getShoppingList() {
        return Utils.getLocalStorage(this.STORAGE_KEYS.SHOPPING_LIST, null);
    }
    saveShoppingList(shoppingList) {
        return Utils.setLocalStorage(this.STORAGE_KEYS.SHOPPING_LIST, shoppingList);
    }
    addShoppingItem(name, quantity, category) {
        try {
            const shoppingList = this.getShoppingList();
            const newItem = {
                id: Utils.generateId(),
                name: name.trim(),
                quantity: quantity.trim(),
                category: category,
                purchased: false,
                manual: true,
                createdAt: new Date().toISOString()
            };
            shoppingList.items.push(newItem);
            shoppingList.lastUpdated = new Date().toISOString();
            this.saveShoppingList(shoppingList);
            Utils.showToast('Товар добавлен в список покупок!', 'success');
            return newItem;
        } catch (error) {
            Utils.handleError(error, 'Ошибка добавления товара в список покупок');
            return null;
        }
    }
    toggleShoppingItemPurchased(itemId) {
        try {
            const shoppingList = this.getShoppingList();
            const item = shoppingList.items.find(item => item.id === itemId);
            if (item) {
                item.purchased = !item.purchased;
                shoppingList.lastUpdated = new Date().toISOString();
                this.saveShoppingList(shoppingList);
                return true;
            }
            return false;
        } catch (error) {
            Utils.handleError(error, 'Ошибка обновления статуса товара');
            return false;
        }
    }
    removeShoppingItem(itemId) {
        try {
            const shoppingList = this.getShoppingList();
            shoppingList.items = shoppingList.items.filter(item => item.id !== itemId);
            shoppingList.lastUpdated = new Date().toISOString();
            this.saveShoppingList(shoppingList);
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка удаления товара из списка покупок');
            return false;
        }
    }
    clearShoppingList() {
        try {
            this.initializeShoppingList();
            Utils.showToast('Список покупок очищен!', 'success');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка очистки списка покупок');
            return false;
        }
    }
    generateShoppingListFromMealPlan() {
        try {
            const mealPlan = this.getMealPlan();
            const recipes = this.getRecipes();
            const shoppingList = this.getShoppingList();
            shoppingList.items = shoppingList.items.filter(item => item.manual);
            const ingredientMap = new Map();
            Object.values(mealPlan).forEach(dayMeals => {
                Object.values(dayMeals).forEach(recipeId => {
                    if (recipeId) {
                        const recipe = recipes.find(r => r.id === recipeId);
                        if (recipe && recipe.ingredients) {
                            recipe.ingredients.forEach(ingredient => {
                                const key = ingredient.name.toLowerCase();
                                if (ingredientMap.has(key)) {
                                    const existing = ingredientMap.get(key);
                                    if (existing.unit === ingredient.unit && 
                                        !isNaN(parseFloat(existing.quantity)) && 
                                        !isNaN(parseFloat(ingredient.quantity))) {
                                        existing.quantity = (parseFloat(existing.quantity) + parseFloat(ingredient.quantity)).toString();
                                    }
                                } else {
                                    ingredientMap.set(key, {
                                        name: ingredient.name,
                                        quantity: ingredient.quantity,
                                        unit: ingredient.unit,
                                        category: this.categorizeIngredient(ingredient.name)
                                    });
                                }
                            });
                        }
                    }
                });
            });
            ingredientMap.forEach(ingredient => {
                shoppingList.items.push({
                    id: Utils.generateId(),
                    name: ingredient.name,
                    quantity: `${ingredient.quantity} ${ingredient.unit}`,
                    category: ingredient.category,
                    purchased: false,
                    manual: false,
                    createdAt: new Date().toISOString()
                });
            });
            shoppingList.lastUpdated = new Date().toISOString();
            this.saveShoppingList(shoppingList);
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка генерации списка покупок');
            return false;
        }
    }
    categorizeIngredient(ingredientName) {
        const name = ingredientName.toLowerCase();
        const categories = {
            'овощи': ['лук', 'морковь', 'картофель', 'помидор', 'огурец', 'капуста', 'перец', 'чеснок', 'зелень', 'салат', 'баклажан', 'кабачок', 'редис', 'свекла'],
            'фрукты': ['яблоко', 'банан', 'апельсин', 'лимон', 'груша', 'виноград', 'ягоды', 'клубника', 'малина', 'черника', 'вишня', 'персик', 'абрикос'],
            'молочные': ['молоко', 'сыр', 'творог', 'йогурт', 'кефир', 'сметана', 'масло', 'сливки', 'ряженка', 'брынза', 'моцарелла'],
            'мясо': ['мясо', 'курица', 'говядина', 'свинина', 'рыба', 'фарш', 'колбаса', 'сосиски', 'бекон', 'ветчина', 'печень', 'индейка'],
            'бакалея': ['крупа', 'рис', 'гречка', 'макароны', 'мука', 'сахар', 'соль', 'масло', 'уксус', 'хлеб', 'печенье', 'консервы'],
            'специи': ['перец', 'соль', 'сахар', 'ваниль', 'корица', 'куркума', 'базилик', 'орегано', 'тимьян', 'лавровый лист', 'паприка'],
            'напитки': ['вода', 'сок', 'чай', 'кофе', 'газировка', 'вино', 'пиво', 'молоко', 'минералка']
        };
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => name.includes(keyword))) {
                return category;
            }
        }
        return 'прочее';
    }
    exportShoppingListAsText() {
        try {
            const shoppingList = this.getShoppingList();
            const categories = this.groupShoppingItemsByCategory();
            let text = 'СПИСОК ПОКУПОК\n';
            text += `Создан: ${Utils.formatDate(new Date())}\n\n`;
            Object.entries(categories).forEach(([category, items]) => {
                if (items.length > 0) {
                    text += `${category.toUpperCase()}:\n`;
                    items.forEach(item => {
                        const status = item.purchased ? '✓' : '☐';
                        text += `${status} ${item.name}`;
                        if (item.quantity) {
                            text += ` - ${item.quantity}`;
                        }
                        text += '\n';
                    });
                    text += '\n';
                }
            });
            text += `\nВсего товаров: ${shoppingList.items.length}\n`;
            text += `Куплено: ${shoppingList.items.filter(item => item.purchased).length}\n`;
            text += `Осталось: ${shoppingList.items.filter(item => !item.purchased).length}\n`;
            const filename = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
            Utils.downloadFile(text, filename, 'text/plain; charset=utf-8');
            Utils.showToast('Список покупок скачан!', 'success');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка экспорта списка покупок');
            return false;
        }
    }
    groupShoppingItemsByCategory() {
        const shoppingList = this.getShoppingList();
        const grouped = {
            'овощи': [],
            'фрукты': [],
            'молочные': [],
            'мясо': [],
            'бакалея': [],
            'специи': [],
            'напитки': [],
            'прочее': []
        };
        shoppingList.items.forEach(item => {
            if (grouped[item.category]) {
                grouped[item.category].push(item);
            } else {
                grouped['прочее'].push(item);
            }
        });
        return grouped;
    }
    getSettings() {
        return Utils.getLocalStorage(this.STORAGE_KEYS.SETTINGS, null);
    }
    saveSettings(settings) {
        return Utils.setLocalStorage(this.STORAGE_KEYS.SETTINGS, settings);
    }
    updateSetting(key, value) {
        try {
            const settings = this.getSettings();
            settings[key] = value;
            this.saveSettings(settings);
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка сохранения настроек');
            return false;
        }
    }
    exportUserRecipes() {
        try {
            const allRecipes = this.getRecipes();
            const defaultRecipes = Utils.getLocalStorage('defaultRecipes', []);
            const defaultIds = new Set(defaultRecipes.map(r => r.id));
            const userRecipes = allRecipes.filter(recipe => !defaultIds.has(recipe.id));
            
            const data = {
                userRecipes: userRecipes,
                exportDate: new Date().toISOString(),
                version: '1.0',
                type: 'user-recipes'
            };
            const jsonData = JSON.stringify(data, null, 2);
            const filename = `my-recipes-${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadFile(jsonData, filename, 'application/json');
            Utils.showToast(`Экспортировано ${userRecipes.length} рецептов!`, 'success');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка экспорта пользовательских рецептов');
            return false;
        }
    }
    
    exportAllData() {
        try {
            const data = {
                recipes: this.getRecipes(),
                mealPlan: this.getMealPlan(),
                shoppingList: this.getShoppingList(),
                settings: this.getSettings(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            const jsonData = JSON.stringify(data, null, 2);
            const filename = `recipe-app-backup-${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadFile(jsonData, filename, 'application/json');
            this.updateSetting('lastBackup', new Date().toISOString());
            Utils.showToast('Резервная копия создана!', 'success');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка создания резервной копии');
            return false;
        }
    }
    importUserRecipes(jsonData) {
        try {
            let data;
            if (typeof jsonData === 'string') {
                data = JSON.parse(jsonData);
            } else {
                data = jsonData;
            }
            
            if (data.type === 'user-recipes' && data.userRecipes) {
                const currentRecipes = this.getRecipes();
                const existingIds = new Set(currentRecipes.map(r => r.id));
                const newRecipes = data.userRecipes.filter(recipe => !existingIds.has(recipe.id));
                
                if (newRecipes.length > 0) {
                    const updatedRecipes = [...currentRecipes, ...newRecipes];
                    this.saveRecipes(updatedRecipes);
                    Utils.showToast(`Импортировано ${newRecipes.length} новых рецептов!`, 'success');
                } else {
                    Utils.showToast('Все рецепты уже существуют в системе', 'info');
                }
                
                return {
                    success: true,
                    importedRecipes: newRecipes.length,
                    exportDate: data.exportDate || 'Неизвестно'
                };
            } else {
                return this.importData(jsonData);
            }
        } catch (error) {
            Utils.handleError(error, 'Ошибка импорта рецептов');
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    importData(jsonData) {
        try {
            let data;
            if (typeof jsonData === 'string') {
                data = JSON.parse(jsonData);
            } else {
                data = jsonData;
            }
            if (!data.recipes || !Array.isArray(data.recipes)) {
                throw new Error('Неверный формат файла: отсутствуют рецепты');
            }
            if (data.recipes && data.recipes.length > 0) {
                this.saveRecipes(data.recipes);
            }
            if (data.mealPlan) {
                this.saveMealPlan(data.mealPlan);
            }
            if (data.shoppingList) {
                this.saveShoppingList(data.shoppingList);
            }
            if (data.settings) {
                const currentTheme = this.getSettings().theme;
                this.saveSettings({
                    ...data.settings,
                    theme: currentTheme 
                });
            }
            Utils.showToast(`Данные восстановлены! Импортировано ${data.recipes.length} рецептов`, 'success');
            return {
                success: true,
                importedRecipes: data.recipes.length,
                exportDate: data.exportDate || 'Неизвестно',
                version: data.version || '1.0'
            };
        } catch (error) {
            Utils.handleError(error, 'Ошибка восстановления данных');
            return {
                success: false,
                error: error.message
            };
        }
    }
    clearAllData() {
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            this.initializeStorage();
            Utils.showToast('Все данные очищены!', 'success');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ошибка очистки данных');
            return false;
        }
    }
}
window.StorageManager = StorageManager;
