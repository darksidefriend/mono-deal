class Player {
    constructor(id, name, socketId) {
        this.id = id;
        this.name = name;
        this.socketId = socketId;
        this.hand = [];
        this.bank = []; // Карты денег на столе
        this.properties = {
            brown: [],
            black: [],
            red: [],
            green: [],
            orange: [],
            blue: [],
            purple: [],
            sand: [],
            yellow: [],
            lightblue: []
        };
        this.buildings = []; // Дома и отели
        this.isActive = true;
        this.actionsPlayed = 0;
        this.hasDrawnCards = false;
    }

    addToHand(cards) {
        this.hand.push(...cards);
    }

    playCard(cardId) {
        const cardIndex = this.hand.findIndex(card => card.id === cardId);
        if (cardIndex === -1) return null;
        
        return this.hand.splice(cardIndex, 1)[0];
    }

    addToBank(card) {
        this.bank.push(card);
    }

    addProperty(card, color = null) {
        const targetColor = color || card.currentColor;
        if (this.properties[targetColor]) {
            this.properties[targetColor].push(card);
            return true;
        }
        return false;
    }

    removeProperty(cardId, color) {
        const propIndex = this.properties[color].findIndex(c => c.id === cardId);
        if (propIndex !== -1) {
            return this.properties[color].splice(propIndex, 1)[0];
        }
        return null;
    }

    getPropertySetCount(color) {
        return this.properties[color]?.length || 0;
    }

    getCompleteSets() {
        const completeSets = [];
        const setRequirements = {
            brown: 2, black: 4, red: 3, green: 3, orange: 3,
            blue: 2, purple: 3, sand: 2, yellow: 3, lightblue: 3
        };

        for (const [color, cards] of Object.entries(this.properties)) {
            if (cards.length >= setRequirements[color]) {
                completeSets.push(color);
            }
        }

        return completeSets;
    }

    getTotalMoney() {
        let total = 0;
        // Деньги в банке
        this.bank.forEach(card => {
            if (card.type === 'money') total += card.value;
        });
        // Собственность тоже считается как деньги при необходимости
        return total;
    }

    canPay(amount) {
        return this.getTotalMoney() >= amount;
    }

    pay(amount) {
        // Реализация выбора карт для оплаты
        // Возвращает массив карт для оплаты
        const paymentCards = [];
        let remaining = amount;
        
        // Сначала используем деньги из банка
        this.bank.sort((a, b) => b.value - a.value);
        
        for (let i = this.bank.length - 1; i >= 0; i--) {
            if (remaining <= 0) break;
            if (this.bank[i].type === 'money') {
                paymentCards.push(this.bank[i]);
                remaining -= this.bank[i].value;
                this.bank.splice(i, 1);
            }
        }
        
        // Если не хватает, используем собственность
        if (remaining > 0) {
            const colors = Object.keys(this.properties);
            for (const color of colors) {
                if (remaining <= 0) break;
                if (this.properties[color].length > 0) {
                    const property = this.properties[color].pop();
                    paymentCards.push(property);
                    remaining -= property.value;
                }
            }
        }
        
        return { paymentCards, remaining };
    }

    hasCardInHand(cardName) {
        return this.hand.some(card => card.name === cardName);
    }

    getHandCount() {
        return this.hand.length;
    }
}

module.exports = Player;