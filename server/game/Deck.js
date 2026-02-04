const CardTypes = require('./CardTypes');
const { v4: uuidv4 } = require('uuid');

class Deck {
    constructor() {
        this.cards = [];
        this.discardPile = [];
        this.createDeck();
        this.shuffle();
    }

    createDeck() {
        for (const [key, cardDef] of Object.entries(CardTypes)) {
            for (let i = 0; i < cardDef.count; i++) {
                const card = {
                    id: uuidv4(),
                    type: cardDef.type,
                    name: cardDef.name || key,
                    value: cardDef.value,
                    colors: cardDef.colors || [cardDef.color],
                    rent: cardDef.rent,
                    currentColor: cardDef.colors ? cardDef.colors[0] : cardDef.color
                };
                this.cards.push(card);
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(count = 1) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (this.cards.length === 0) {
                // Перемешиваем сброс обратно в колоду
                this.cards = [...this.discardPile];
                this.discardPile = [];
                this.shuffle();
            }
            if (this.cards.length > 0) {
                drawn.push(this.cards.pop());
            }
        }
        return drawn;
    }

    discard(card) {
        this.discardPile.push(card);
    }

    getCardCount() {
        return this.cards.length;
    }
}

module.exports = Deck;