const { v4: uuidv4 } = require('uuid');

class Player {
    constructor(socketId, name, index) {
        this.id = socketId;
        this.socketId = socketId;
        this.name = name;
        this.index = index;
        this.hand = [];
        this.properties = [];
        this.moneyBank = [];
        this.actionsLeft = 0;
        this.hasWon = false;
    }

    drawCard(card) {
        if (card) {
            this.hand.push(card);
        }
    }

    getCardFromHand(cardId) {
        return this.hand.find(c => c.id === cardId);
    }

    getCardFromAnywhere(cardId) {
        // Check hand
        let card = this.hand.find(c => c.id === cardId);
        if (card) return card;
        
        // Check money bank
        card = this.moneyBank.find(c => c.id === cardId);
        if (card) return card;
        
        // Check properties
        for (const prop of this.properties) {
            card = prop.cards.find(c => c.id === cardId);
            if (card) return card;
        }
        
        return null;
    }

    removeCardFromHand(cardId) {
        const index = this.hand.findIndex(c => c.id === cardId);
        if (index !== -1) {
            return this.hand.splice(index, 1)[0];
        }
        return null;
    }

    removeCardFromBank(cardId) {
        const index = this.moneyBank.findIndex(c => c.id === cardId);
        if (index !== -1) {
            return this.moneyBank.splice(index, 1)[0];
        }
        return null;
    }

    removeCardFromAnywhere(cardId) {
        let card = this.removeCardFromHand(cardId);
        if (card) return card;
        
        card = this.removeCardFromBank(cardId);
        if (card) return card;
        
        // Check properties
        for (const prop of this.properties) {
            const index = prop.cards.findIndex(c => c.id === cardId);
            if (index !== -1) {
                return prop.cards.splice(index, 1)[0];
            }
        }
        
        return null;
    }

    addMoney(card) {
        this.moneyBank.push(card);
    }

    getMoneyCards(amount) {
        let selectedCards = [];
        let totalValue = 0;
        
        // Sort money cards by value (ascending)
        const sortedMoney = [...this.moneyBank].sort((a, b) => a.value - b.value);
        
        for (const card of sortedMoney) {
            if (totalValue >= amount) break;
            
            selectedCards.push(card);
            totalValue += card.value;
        }
        
        if (totalValue >= amount) {
            return selectedCards;
        }
        
        return selectedCards;
    }

    getTotalMoney() {
        return this.moneyBank.reduce((sum, card) => sum + (card.value || 0), 0);
    }

    isComplete() {
        const needed = COMPLETE_SETS[this.color];
        const actual = this.cards.length; // Джокеры уже учитываются как карты
        return actual >= needed;
    }

    getPropertySet(propertySetId) {
        return this.properties.find(p => p.id === propertySetId);
    }

    getPropertySetByColor(color) {
        console.log(`getPropertySetByColor: looking for ${color}`);
        console.log(`Available property sets:`, this.properties.map(p => ({
            color: p.color,
            cards: p.cards.map(c => ({name: c.name, color: c.color, wild: c.wild, selectedColor: c.selectedColor}))
        })));
        
        // Сначала ищем комплект с точным совпадением цвета
        for (const propertySet of this.properties) {
            if (propertySet.color === color) {
                console.log(`Found exact match: ${propertySet.color}`);
                return propertySet;
            }
        }
        
        // Если не нашли, ищем комплект, содержащий карты этого цвета
        for (const propertySet of this.properties) {
            const hasCardOfColor = propertySet.cards.some(card => {
                if (card.type === 'joker') return false;
                
                let cardColor = card.color;
                if (card.wild && card.selectedColor) {
                    cardColor = card.selectedColor;
                }
                
                return cardColor === color;
            });
            
            if (hasCardOfColor) {
                console.log(`Found property set containing cards of color ${color}`);
                return propertySet;
            }
        }
        
        console.log(`No property set found for color ${color}`);
        return null;
    }

    getIncompletePropertySet(color) {
        const prop = this.getPropertySetByColor(color);
        return prop && !prop.isComplete() ? prop : null;
    }

    getCompletePropertySet(color) {
        const prop = this.getPropertySetByColor(color);
        return prop && prop.isComplete() ? prop : null;
    }

    createPropertySet(color) {
        const PropertySet = require('./PropertySet');
        const prop = new PropertySet(color);
        this.properties.push(prop);
        return prop;
    }

    removePropertySet(propertySetId) {
        const index = this.properties.findIndex(p => p.id === propertySetId);
        if (index !== -1) {
            return this.properties.splice(index, 1)[0];
        }
        return null;
    }

    getState() {
        return {
            id: this.id,
            name: this.name,
            hand: this.hand.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                value: c.value,
                color: c.color,
                action: c.action,
                rentType: c.rentType,
                wild: c.wild,
                wildColors: c.wildColors,
                description: c.description
            })),
            properties: this.properties.map(p => ({
                id: p.id,
                color: p.color,
                cards: p.cards.map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    isJoker: c.type === CARD_TYPES.JOKER,
                    isWild: c.wild
                })),
                hasHouse: p.hasHouse,
                hasHotel: p.hasHotel,
                isComplete: p.isComplete(),
                rentValue: p.calculateRent ? p.calculateRent() : 0
            })),
            moneyBank: this.moneyBank.map(c => ({
                id: c.id,
                name: c.name,
                value: c.value
            })),
            totalMoney: this.getTotalMoney(),
            actionsLeft: this.actionsLeft,
            hasWon: this.hasWon
        };
    }

    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }
}

module.exports = Player;