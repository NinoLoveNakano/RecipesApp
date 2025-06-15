class RecipeApp {
    constructor() {
        this.storage = null;
        this.recipeManager = null;
        this.mealPlanner = null;
        this.shoppingList = null;
        this.currentView = 'recipes';
        this.init();
    }
    async init() {
        try {
            Utils.showLoading();
            this.storage = new StorageManager();
            await this.storage.ensureInitialized();
            this.recipeManager = new RecipeManager(this.storage);
            this.mealPlanner = new MealPlanner(this.storage);
            this.shoppingList = new ShoppingList(this.storage);
            this.setupNavigation();
            this.setupThemeToggle();
            this.loadTheme();
            this.showView('recipes');
            this.setupKeyboardShortcuts();
            this.setupModalCloseEvents();
            Utils.hideLoading();
            Utils.showToast('Приложение загружено!', 'success');
        } catch (error) {
            Utils.hideLoading();
            Utils.handleError(error, 'Ошибка инициализации приложения');
        }
    }
    async waitForStorageReady() {
        return new Promise(resolve => setTimeout(resolve, 100));
    }
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                this.showView(view);
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }
    showView(viewName) {
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.classList.remove('active');
        });
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            this.refreshCurrentView();
            history.replaceState({view: viewName}, null, window.location.pathname);
        }
    }
    refreshCurrentView() {
        switch (this.currentView) {
            case 'recipes':
                if (this.recipeManager) {
                    this.recipeManager.refresh();
                }
                break;
            case 'planner':
                if (this.mealPlanner) {
                    this.mealPlanner.refresh();
                }
                break;
            case 'shopping':
                if (this.shoppingList) {
                    this.shoppingList.refresh();
                }
                break;
        }
    }
    setupThemeToggle() {
        const themeBtn = document.getElementById('theme-btn');
        themeBtn.addEventListener('click', () => {
            this.toggleTheme();
        });
    }
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        const themeBtn = document.getElementById('theme-btn');
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        this.storage.updateSetting('theme', newTheme);
        Utils.showToast(
            newTheme === 'dark' ? 'Темная тема включена' : 'Светлая тема включена',
            'info'
        );
    }
    loadTheme() {
        const savedTheme = this.storage.getSettings().theme || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeBtn = document.getElementById('theme-btn');
        themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        if (this.currentView === 'recipes') {
                            document.getElementById('add-recipe-btn').click();
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        this.exportData();
                        break;
                    case '1':
                        e.preventDefault();
                        this.showView('recipes');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showView('planner');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showView('shopping');
                        break;
                    case 't':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                }
            }
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
    closeAllModals() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
    setupModalCloseEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || e.target.textContent === '×') {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal);
                }
            }
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    this.closeModal(activeModal);
                }
            }
        });
    }
    exportData() {
        try {
            this.storage.exportAllData();
        } catch (error) {
            Utils.handleError(error, 'Ошибка экспорта данных');
        }
    }
    handlePopState(event) {
        if (event.state && event.state.view) {
            this.showView(event.state.view);
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.classList.toggle('active', link.dataset.view === event.state.view);
            });
        }
    }
    handleGlobalError(error) {
        console.error('Global error:', error);
        Utils.showToast('Произошла неожиданная ошибка', 'error');
    }
    onMealPlanUpdated() {
        if (this.shoppingList) {
            this.shoppingList.refresh();
        }
    }
    onRecipesUpdated() {
        if (this.mealPlanner) {
            this.mealPlanner.refreshRecipePicker();
        }
    }






    closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});
window.addEventListener('popstate', () => {
    if (window.app) {
        window.app.handlePopState();
    }
});
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new RecipeApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        Utils.showToast('Ошибка запуска приложения', 'error');
    }
});
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(
            (registration) => {
                console.log('SW registered: ', registration);
            },
            (registrationError) => {
                console.log('SW registration failed: ', registrationError);
            }
        );
    });
}
window.RecipeApp = RecipeApp;
