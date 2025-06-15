class Utils {
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    static formatDate(date) {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        return new Date(date).toLocaleDateString('ru-RU', options);
    }
    static formatCookingTime(minutes) {
        if (minutes < 60) {
            return `${minutes} мин`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            if (remainingMinutes === 0) {
                return `${hours} ${this.pluralize(hours, 'час', 'часа', 'часов')}`;
            } else {
                return `${hours} ${this.pluralize(hours, 'час', 'часа', 'часов')} ${remainingMinutes} мин`;
            }
        }
    }
    static pluralize(count, one, few, many) {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod100 >= 11 && mod100 <= 19) {
            return many;
        }
        if (mod10 === 1) {
            return one;
        }
        if (mod10 >= 2 && mod10 <= 4) {
            return few;
        }
        return many;
    }
    static sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    static escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    static highlightText(text, searchTerm) {
        if (!searchTerm) return text;
        const escapedTerm = this.escapeRegex(searchTerm);
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            Object.keys(obj).forEach(key => {
                clonedObj[key] = this.deepClone(obj[key]);
            });
            return clonedObj;
        }
    }
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    static showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'flex';
        }
    }
    static hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static validateRequired(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    }
    static validateNumberRange(value, min, max) {
        const num = Number(value);
        return !isNaN(num) && num >= min && num <= max;
    }
    static slugify(text) {
        const cyrillicMap = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return text
            .toLowerCase()
            .split('')
            .map(char => cyrillicMap[char] || char)
            .join('')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    static parseIngredients(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const ingredients = [];
        lines.forEach(line => {
            const match = line.trim().match(/^(\d+(?:[.,]\d+)?)\s*([а-яё]+\.?)\s+(.+)$/i);
            if (match) {
                ingredients.push({
                    name: match[3].trim(),
                    quantity: match[1].replace(',', '.'),
                    unit: match[2]
                });
            } else {
                const altMatch = line.trim().match(/^(.+?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*([а-яё]+\.?)$/i);
                if (altMatch) {
                    ingredients.push({
                        name: altMatch[1].trim(),
                        quantity: altMatch[2].replace(',', '.'),
                        unit: altMatch[3]
                    });
                } else {
                    ingredients.push({
                        name: line.trim(),
                        quantity: '',
                        unit: 'по вкусу'
                    });
                }
            }
        });
        return ingredients;
    }
    static formatIngredient(ingredient) {
        if (ingredient.quantity && ingredient.unit) {
            return `${ingredient.name} - ${ingredient.quantity} ${ingredient.unit}`;
        } else if (ingredient.quantity) {
            return `${ingredient.name} - ${ingredient.quantity}`;
        } else {
            return ingredient.name;
        }
    }
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    static isMobile() {
        return window.innerWidth <= 768;
    }
    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    static getContrastColor(hexColor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    static animateElement(element, animationClass, duration = 500) {
        return new Promise(resolve => {
            element.classList.add(animationClass);
            const handleAnimationEnd = () => {
                element.classList.remove(animationClass);
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            };
            element.addEventListener('animationend', handleAnimationEnd);
            setTimeout(() => {
                if (element.classList.contains(animationClass)) {
                    element.classList.remove(animationClass);
                    resolve();
                }
            }, duration);
        });
    }
    static scrollToElement(element, offset = 0) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    static getCategoryColor(category) {
        const colors = {
            'завтрак': '#ff9800',
            'обед': '#4caf50',
            'ужин': '#3f51b5',
            'десерт': '#e91e63',
            'выпечка': '#795548',
            'закуски': '#607d8b'
        };
        return colors[category] || '#9e9e9e';
    }
    static getDifficultyColor(difficulty) {
        const colors = {
            'легко': '#4caf50',
            'средне': '#ff9800',
            'сложно': '#f44336'
        };
        return colors[difficulty] || '#9e9e9e';
    }
    static handleError(error, userMessage = 'Произошла ошибка') {
        console.error('Application Error:', error);
        this.showToast(userMessage, 'error');
    }
    static setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            this.handleError(error, 'Ошибка сохранения данных');
            return false;
        }
    }
    static getLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            this.handleError(error, 'Ошибка загрузки данных');
            return defaultValue;
        }
    }
    static removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            this.handleError(error, 'Ошибка удаления данных');
            return false;
        }
    }
}
window.Utils = Utils;
