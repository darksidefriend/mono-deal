// // Deck.js - полный исправленный класс
// const { CARD_DATA } = require('./utils/constants');

// class Deck {
//     constructor() {
//         this.cards = []; // Основная колода
//         this.discardPile = []; // Сброс
//         this.initDeck();
//     }

//     initDeck() {
//         this.cards = [];
        
//         // Создаем карты на основе CARD_DATA
//         CARD_DATA.forEach(cardTemplate => {
//             for (let i = 0; i < cardTemplate.count; i++) {
//                 const card = { ...cardTemplate };
//                 card.id = `${card.name}_${i}_${Date.now()}_${Math.random()}`;
//                 // Удаляем свойство count, так как оно не нужно в самих картах
//                 delete card.count;
//                 this.cards.push(card);
//             }
//         });
        
//         this.shuffle();
//     }

//     shuffle() {
//         for (let i = this.cards.length - 1; i > 0; i--) {
//             const j = Math.floor(Math.random() * (i + 1));
//             [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
//         }
//     }

//     draw() {
//         if (this.cards.length === 0) {
//             // Перемешиваем сброс в колоду
//             this.cards = [...this.discardPile];
//             this.discardPile = [];
//             this.shuffle();
//         }
        
//         return this.cards.length > 0 ? this.cards.pop() : null;
//     }

//     discard(card) {
//         this.discardPile.push(card);
//     }

//     getCount() {
//         return this.cards ? this.cards.length : 0;
//     }

//     returnCard(card) {
//         this.cards.push(card);
//     }
// }

// module.exports = Deck;

// server/game/Deck.js - временная версия без constants.js
class Deck {
    constructor() {
        this.cards = [];
        this.discardPile = [];
        this.initDeck();
    }

    initDeck() {
        this.cards = [];
        
        // Временные минимальные данные для тестирования
        const testCards = [
            // Деньги
            { id: '1m_1', name: '1M', type: 'money', value: 1 },
            { id: '1m_2', name: '1M', type: 'money', value: 1 },
            { id: '2m_1', name: '2M', type: 'money', value: 2 },
            // Собственность
            { id: 'prop_brown_1', name: 'Житная ул.', type: 'property', value: 1, color: 'brown' },
            // Карты действий
            { id: 'pass_go_1', name: 'Пройди клетку Вперед', type: 'action', value: 1, action: 'pass_go' },
            { id: 'say_no_1', name: 'Просто скажи Нет', type: 'action', value: 4, action: 'say_no' }
        ];
        
        this.cards = [...testCards];
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) {
            // Перемешиваем сброс в колоду
            this.cards = [...this.discardPile];
            this.discardPile = [];
            this.shuffle();
        }
        
        return this.cards.length > 0 ? this.cards.pop() : null;
    }

    discard(card) {
        this.discardPile.push(card);
    }

    getCount() {
        return this.cards ? this.cards.length : 0;
    }

    returnCard(card) {
        this.cards.push(card);
    }
}

module.exports = Deck;