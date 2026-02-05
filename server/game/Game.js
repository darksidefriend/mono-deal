const Deck = require('./Deck');
const Player = require('./Player');
const { v4: uuidv4 } = require('uuid');

class Game {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = [];
        this.deck = new Deck();
        this.currentPlayerIndex = 0;
        this.turnPhase = 'draw'; // draw, play, discard
        this.actionsRemaining = 3;
        this.activeAction = null;
        this.pendingPayments = [];
        this.gameState = 'waiting'; // waiting, playing, finished
        this.winner = null;
    }

    addPlayer(name, socketId) {
        const playerId = uuidv4();
        const player = new Player(playerId, name, socketId);
        
        // Раздаем начальные карты
        player.addToHand(this.deck.draw(5));
        
        this.players.push(player);
        
        if (this.players.length >= 2 && this.gameState === 'waiting') {
            this.startGame();
        }
        
        return playerId;
    }

    startGame() {
        this.gameState = 'playing';
        this.currentPlayerIndex = Math.floor(Math.random() * this.players.length);
        this.startTurn();
    }

    startTurn() {
        const player = this.getCurrentPlayer();
        if (!player) return;
        
        player.actionsPlayed = 0;
        player.hasDrawnCards = false;
        this.actionsRemaining = 3;
        this.turnPhase = 'draw';
        
        // Игрок берет 2 карты в начале хода
        if (player.getHandCount() === 0) {
            player.addToHand(this.deck.draw(5));
        } else {
            player.addToHand(this.deck.draw(2));
        }
        player.hasDrawnCards = true;
        this.turnPhase = 'play';
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    getPlayerSocketId(playerId) {
        const player = this.getPlayer(playerId);
        return player ? player.socketId : null;
    }

    playCard(playerId, cardId, options = {}) {
        if (this.gameState !== 'playing') return { success: false };
        if (this.currentPlayerId !== playerId) return { success: false };
        if (this.actionsRemaining <= 0) return { success: false };
        
        const player = this.getPlayer(playerId);
        const card = player.playCard(cardId);
        
        if (!card) return { success: false };
        
        let result = { success: true };
        
        switch (card.type) {
            case 'money':
                player.addToBank(card);
                break;
                
            case 'property':
            case 'wildProperty':
                if (options.propertyColor && card.colors.includes(options.propertyColor)) {
                    card.currentColor = options.propertyColor;
                }
                player.addProperty(card, card.currentColor);
                break;
                
            case 'rent':
                result = this.playRentCard(player, card, options);
                break;
                
            case 'action':
                result = this.playActionCard(player, card, options);
                break;
        }
        
        if (result.success) {
            this.actionsRemaining--;
            player.actionsPlayed++;
        } else {
            // Возвращаем карту в руку
            player.addToHand([card]);
        }
        
        return result;
    }

    playRentCard(player, card, options) {
        const rentColor = card.colors[0] === 'any' ? 
            (options.propertyColor || player.getCompleteSets()[0]) : 
            card.colors[0];
        
        const targets = [];
        let rentAmount = this.calculateRent(player, rentColor);
        
        if (options.useDoubleRent && player.hasCardInHand('Двойная рента')) {
            rentAmount *= 2;
            // Убираем карту двойной ренты из руки
            const doubleRentCardIndex = player.hand.findIndex(c => c.name === 'Двойная рента');
            if (doubleRentCardIndex !== -1) {
                this.deck.discard(player.hand.splice(doubleRentCardIndex, 1)[0]);
                this.actionsRemaining--; // Дополнительное действие
            }
        }
        
        // Определяем игроков, которые должны платить
        this.players.forEach(targetPlayer => {
            if (targetPlayer.id !== player.id && targetPlayer.isActive) {
                const targetPropertyCount = targetPlayer.getPropertySetCount(rentColor);
                if (targetPropertyCount > 0) {
                    targets.push({
                        playerId: targetPlayer.id,
                        socketId: targetPlayer.socketId,
                        amount: rentAmount * targetPropertyCount
                    });
                }
            }
        });
        
        if (targets.length > 0) {
            this.pendingPayments = targets.map(target => ({
                ...target,
                fromPlayerId: player.id,
                rentColor,
                cardId: card.id
            }));
            
            return {
                success: true,
                requiresPayment: true,
                targets,
                rentColor
            };
        }
        
        this.deck.discard(card);
        return { success: true };
    }

    playActionCard(player, card, options) {
        switch (card.name) {
            case 'Аферист':
                return this.playDealBreaker(player, card, options);
            case 'Просто скажи Нет':
                // Эта карта играется только в ответ
                return { success: false };
            case 'Вынужденная сделка':
                return this.playForcedDeal(player, card, options);
            case 'Хитрая сделка':
                return this.playSlyDeal(player, card, options);
            case 'Сегодня твой день рождения!':
                return this.playBirthday(player, card);
            case 'Пройди клетку Вперед':
                player.addToHand(this.deck.draw(2));
                this.deck.discard(card);
                return { success: true };
            case 'Сборщик долгов':
                return this.playDebtCollector(player, card, options);
            case 'Дом':
            case 'Отель':
                return this.playBuilding(player, card, options);
            case 'Джокер':
                return this.playJoker(player, card, options);
        }
        
        return { success: false };
    }

    playDealBreaker(player, card, options) {
        const targetPlayer = this.getPlayer(options.targetPlayerId);
        if (!targetPlayer) return { success: false };
        
        // Находим полный комплект у целевого игрока
        const completeSets = targetPlayer.getCompleteSets();
        if (completeSets.length === 0) return { success: false };
        
        const targetColor = completeSets[0]; // Берем первый полный комплект
        const properties = targetPlayer.properties[targetColor];
        
        // Передаем все карты собственности и здания
        properties.forEach(prop => {
            player.addProperty(prop, targetColor);
        });
        targetPlayer.properties[targetColor] = [];
        
        // Передаем здания на этом комплекте
        const buildings = targetPlayer.buildings.filter(b => b.color === targetColor);
        buildings.forEach(building => {
            player.buildings.push(building);
        });
        targetPlayer.buildings = targetPlayer.buildings.filter(b => b.color !== targetColor);
        
        this.deck.discard(card);
        return { success: true };
    }

    processPayment(playerId, paymentCards, sayNoCardId) {
        const pendingPayment = this.pendingPayments.find(p => p.playerId === playerId);
        if (!pendingPayment) return { success: false };
        
        const player = this.getPlayer(playerId);
        
        // Проверяем, использует ли игрок "Нет"
        if (sayNoCardId && player.hasCardInHand('Просто скажи Нет')) {
            // Убираем карту "Нет" из руки
            const sayNoCardIndex = player.hand.findIndex(c => c.id === sayNoCardId);
            if (sayNoCardIndex !== -1) {
                this.deck.discard(player.hand.splice(sayNoCardIndex, 1)[0]);
                
                // Проверяем, есть ли у атакующего карта "Нет" для контратаки
                const attacker = this.getPlayer(pendingPayment.fromPlayerId);
                if (attacker.hasCardInHand('Просто скажи Нет')) {
                    return {
                        success: true,
                        requiresCounterNo: true,
                        attackerId: attacker.id,
                        originalCard: pendingPayment.cardId
                    };
                }
                
                // Убираем этот платеж из ожидающих
                this.pendingPayments = this.pendingPayments.filter(p => p.playerId !== playerId);
                return { success: true };
            }
        }
        
        // Обрабатываем платеж
        let totalPaid = 0;
        paymentCards.forEach(cardId => {
            // Ищем карту в банке или собственности
            const bankIndex = player.bank.findIndex(c => c.id === cardId);
            if (bankIndex !== -1) {
                totalPaid += player.bank[bankIndex].value;
                this.deck.discard(player.bank.splice(bankIndex, 1)[0]);
            } else {
                // Ищем в собственности
                for (const color in player.properties) {
                    const propIndex = player.properties[color].findIndex(c => c.id === cardId);
                    if (propIndex !== -1) {
                        totalPaid += player.properties[color][propIndex].value;
                        this.deck.discard(player.properties[color].splice(propIndex, 1)[0]);
                        break;
                    }
                }
            }
        });
        
        if (totalPaid >= pendingPayment.amount) {
            // Передаем деньги атакующему игроку
            const attacker = this.getPlayer(pendingPayment.fromPlayerId);
            paymentCards.forEach(cardId => {
                const card = this.findDiscardedCard(cardId);
                if (card) {
                    attacker.addToBank(card);
                }
            });
            
            // Убираем платеж из ожидающих
            this.pendingPayments = this.pendingPayments.filter(p => p.playerId !== playerId);
            
            // Проверяем победу
            this.checkWinCondition();
            
            return { success: true };
        }
        
        return { success: false };
    }

    endTurn(playerId) {
        if (this.currentPlayerId !== playerId) return false;
        
        const player = this.getPlayer(playerId);
        
        // Проверяем лимит карт в руке
        if (player.getHandCount() > 7) {
            this.turnPhase = 'discard';
            return false;
        }
        
        // Передаем ход следующему игроку
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.startTurn();
        
        return true;
    }

    discardCards(playerId, cardIds) {
        const player = this.getPlayer(playerId);
        
        cardIds.forEach(cardId => {
            const cardIndex = player.hand.findIndex(c => c.id === cardId);
            if (cardIndex !== -1) {
                this.deck.discard(player.hand.splice(cardIndex, 1)[0]);
            }
        });
        
        if (player.getHandCount() <= 7) {
            this.turnPhase = 'play';
            this.endTurn(playerId);
        }
    }

    calculateRent(player, color) {
        const propertyCount = player.getPropertySetCount(color);
        const buildingBonus = player.buildings
            .filter(b => b.color === color)
            .reduce((sum, b) => sum + b.value, 0);
        
        const rentTable = {
            brown: [1, 2],
            black: [1, 2, 3, 4],
            red: [2, 3, 6],
            green: [2, 4, 7],
            orange: [1, 3, 5],
            blue: [3, 8],
            purple: [1, 2, 4],
            sand: [1, 2],
            yellow: [2, 4, 6],
            lightblue: [1, 2, 3]
        };
        
        const rent = rentTable[color] ? 
            (rentTable[color][propertyCount - 1] || rentTable[color][rentTable[color].length - 1]) : 0;
        
        return rent + buildingBonus;
    }

    changeWildCardColor(playerId, cardId, newColor) {
        const player = this.getPlayer(playerId);
        
        // Ищем карту в свойствах
        for (const color in player.properties) {
            const cardIndex = player.properties[color].findIndex(c => c.id === cardId);
            if (cardIndex !== -1 && player.properties[color][cardIndex].type === 'wildProperty') {
                const card = player.properties[color][cardIndex];
                
                // Проверяем, что новый цвет допустим
                if (card.colors.includes(newColor)) {
                    // Удаляем из старого цвета
                    player.properties[color].splice(cardIndex, 1);
                    
                    // Добавляем в новый цвет
                    card.currentColor = newColor;
                    player.addProperty(card, newColor);
                    
                    return true;
                }
            }
        }
        
        return false;
    }

    checkWinCondition() {
        this.players.forEach(player => {
            const completeSets = player.getCompleteSets();
            if (completeSets.length >= 3) {
                this.gameState = 'finished';
                this.winner = player.id;
            }
        });
    }

    getState() {
        return {
            roomId: this.roomId,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                handCount: p.hand.length,
                bank: p.bank,
                properties: p.properties,
                buildings: p.buildings,
                totalMoney: p.getTotalMoney(),
                completeSets: p.getCompleteSets()
            })),
            currentPlayerId: this.getCurrentPlayer()?.id,
            currentPlayerIndex: this.currentPlayerIndex,
            actionsRemaining: this.actionsRemaining,
            turnPhase: this.turnPhase,
            deckCount: this.deck.getCardCount(),
            gameState: this.gameState,
            winner: this.winner,
            pendingPayments: this.pendingPayments
        };
    }
}

module.exports = Game;