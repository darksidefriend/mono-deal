const { COMPLETE_SETS } = require('../utils/constants');
const { v4: uuidv4 } = require('uuid');

class PropertySet {
    constructor(color) {
        this.id = uuidv4();
        this.color = color;
        this.cards = [];
        this.hasHouse = false;
        this.hasHotel = false;
    }
    
    addCard(card) {
        this.cards.push(card);
        
        // Если карта wild и имеет selectedColor, используем его
        if (card.wild && card.selectedColor) {
            // Wild карта уже имеет цвет, ничего не делаем
        }
    }
    
    removeCard(cardId) {
        const index = this.cards.findIndex(c => c.id === cardId);
        if (index !== -1) {
            return this.cards.splice(index, 1)[0];
        }
        return null;
    }
    
    isComplete() {
        const needed = COMPLETE_SETS[this.color];
        if (!needed) return false;
        
        // Count cards that match this set's color (including wild cards set to this color)
        const matchingCards = this.cards.filter(card => {
            if (card.type === 'joker') return false; // Джокеры не считаются
            
            // Для wild карт проверяем selectedColor
            if (card.wild) {
                return card.selectedColor === this.color;
            }
            
            return card.color === this.color;
        });
        
        return matchingCards.length >= needed;
    }
    
    calculateRent() {
        // Если нет карт, рента 0
        if (this.cards.length === 0) {
            return 0;
        }
        
        // Считаем только карты, которые соответствуют цвету комплекта
        const matchingCards = this.cards.filter(card => {
            if (card.type === 'joker') return false; // Джокеры не учитываются в ренте
            
            // Для wild карт проверяем selectedColor
            if (card.wild) {
                // Если wild карта не имеет selectedColor, она не учитывается
                return card.selectedColor === this.color;
            }
            
            return card.color === this.color;
        });
        
        if (matchingCards.length === 0) {
            return 0;
        }
        
        const baseRent = this.getBaseRent(matchingCards.length);
        const buildingBonus = this.getBuildingBonus();
        
        return baseRent + buildingBonus;
    }
    
    getBaseRent(cardCount) {
        console.log(`Calculating rent for ${this.color} with ${cardCount} matching cards`);
        
        switch (this.color) {
            case 'brown':
                return cardCount === 1 ? 1 : 2; // 1 карта - 1М, 2 карты - 2М
                
            case 'black': // Железные дороги
                // Рента: 1 карта - 1М, 2 карты - 2М, 3 карты - 3М, 4 карты - 4М
                return Math.min(cardCount, 4);
                
            case 'red':
                if (cardCount === 1) return 2; // Тверская ул. - 2М
                if (cardCount === 2) return 3; // + Площадь Маяковского - 3М
                return 6; // + Пушкинская ул. - 6М
                
            case 'green':
                if (cardCount === 1) return 2; // Кутузовский проспект - 2М
                if (cardCount === 2) return 4; // + Гоголевский бульвар - 4М
                return 7; // + ул. Щусева - 7М
                
            case 'orange':
                if (cardCount === 1) return 1; // Рублевское шоссе - 1М
                if (cardCount === 2) return 3; // + ул. Вавилова - 3М
                return 5; // + Рязанский проспект - 5М
                
            case 'blue':
                return cardCount === 1 ? 3 : 8; // 1 карта - 3М, 2 карты - 8М
                
            case 'purple':
                if (cardCount === 1) return 1; // ул. Сретенка - 1М
                if (cardCount === 2) return 2; // + Ростовская наб. - 2М
                return 4; // + ул. Полянка - 4М
                
            case 'sand': // Коммунальные службы
                return cardCount === 1 ? 1 : 2; // 1 карта - 1М, 2 карты - 2М
                
            case 'yellow':
                if (cardCount === 1) return 2; // ул. Грузинский Вал - 2М
                if (cardCount === 2) return 4; // + ул. Чайковского - 4М
                return 6; // + Смоленская площадь - 6М
                
            case 'lightblue':
                if (cardCount === 1) return 1; // Первая Парковая ул. - 1М
                if (cardCount === 2) return 2; // + Варшавское шоссе - 2М
                return 3; // + ул. Огарева - 3М
                
            default:
                return 0;
        }
    }
    
    getBuildingBonus() {
        let bonus = 0;
        if (this.hasHouse) bonus += 3;
        if (this.hasHotel) bonus += 4;
        return bonus;
    }
    
    getValue() {
        return this.cards.reduce((sum, card) => sum + (card.value || 0), 0);
    }
    
    getMatchingCardsCount() {
        // Возвращаем количество карт, соответствующих цвету комплекта
        return this.cards.filter(card => {
            if (card.type === 'joker') return false;
            
            if (card.wild) {
                return card.selectedColor === this.color;
            }
            
            return card.color === this.color;
        }).length;
    }
    
    getState() {
        const matchingCardsCount = this.getMatchingCardsCount();
        const rent = this.calculateRent();
        
        console.log(`PropertySet ${this.color}: ${matchingCardsCount} matching cards, rent = ${rent}M`);
        
        return {
            id: this.id,
            color: this.color,
            cards: this.cards.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                value: c.value,
                color: c.color,
                selectedColor: c.selectedColor,
                wild: c.wild,
                wildColors: c.wildColors
            })),
            isComplete: this.isComplete(),
            hasHouse: this.hasHouse,
            hasHotel: this.hasHotel,
            rent: rent,
            matchingCards: matchingCardsCount,
            totalCards: this.cards.length
        };
    }
}

module.exports = PropertySet;