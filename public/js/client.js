class MonopolyDealClient {
    constructor() {
        this.socket = io();
        this.playerId = null;
        this.roomId = null;
        this.gameState = null;
        this.selectedCards = new Set();
        this.pendingAction = null;
        
        this.initializeEventListeners();
        this.bindSocketEvents();
    }

    initializeEventListeners() {
        // Лобби
        document.getElementById('createGameBtn').addEventListener('click', () => this.createGame());
        document.getElementById('joinGameBtn').addEventListener('click', () => this.joinGame());
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        
        // Игра
        document.getElementById('endTurnBtn').addEventListener('click', () => this.endTurn());
        document.getElementById('discardBtn').addEventListener('click', () => this.showDiscardModal());
        
        // Модальные окна
        document.getElementById('payBtn').addEventListener('click', () => this.processPayment());
        document.getElementById('sayNoBtn').addEventListener('click', () => this.sayNo());
        document.getElementById('cancelPaymentBtn').addEventListener('click', () => this.hidePaymentModal());
        document.getElementById('confirmColorBtn').addEventListener('click', () => this.confirmColor());
        document.getElementById('cancelColorBtn').addEventListener('click', () => this.hideColorModal());
        document.getElementById('confirmTargetBtn').addEventListener('click', () => this.confirmTarget());
        document.getElementById('cancelTargetBtn').addEventListener('click', () => this.hideTargetModal());
    }

    bindSocketEvents() {
        this.socket.on('gameCreated', (data) => {
            this.playerId = data.playerId;
            this.roomId = data.roomId;
            this.showWaitingRoom(data);
        });

        this.socket.on('playerJoined', (data) => {
            this.updateWaitingRoom(data);
        });

        this.socket.on('gameUpdate', (state) => {
            this.gameState = state;
            this.renderGame(state);
        });

        this.socket.on('requestPayment', (data) => {
            this.showPaymentModal(data);
        });

        this.socket.on('requestCounterNo', (data) => {
            this.showCounterNoModal(data);
        });

        this.socket.on('yourTurn', () => {
            this.showNotification('Ваш ход!');
            document.getElementById('endTurnBtn').disabled = false;
        });

        this.socket.on('error', (message) => {
            this.showNotification(message, 'error');
        });

        this.socket.on('gameJoined', (data) => {
            this.playerId = data.playerId;
            this.roomId = data.roomId;
            this.showWaitingRoom(data);
        });

        this.socket.on('playerJoined', (data) => {
            // Обновляем список игроков для всех в комнате
            if (this.roomId) {
                this.updateWaitingRoom(data);
            }
        });

        this.socket.on('gameStarted', (state) => {
            this.gameState = state;
            document.getElementById('waitingRoom').classList.add('hidden');
            document.getElementById('gameScreen').classList.remove('hidden');
            this.renderGame(state);
        });
    }

    createGame() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            this.showNotification('Введите имя', 'error');
            return;
        }
        this.socket.emit('createGame', playerName);
    }

    joinGame() {
        const playerName = document.getElementById('playerName').value.trim();
        const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
        
        if (!playerName || !roomCode) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }
        
        this.socket.emit('joinGame', { roomId: roomCode, playerName });
    }

    showWaitingRoom(data) {
        document.getElementById('lobby').classList.add('hidden');
        document.getElementById('waitingRoom').classList.remove('hidden');
        
        document.getElementById('roomIdDisplay').textContent = data.roomId;
        
        // Обновляем список игроков
        if (data.players) {
            this.updatePlayerList(data.players);
        } else if (data.game && data.game.players) {
            this.updatePlayerList(data.game.players);
        }
        
        // Показываем кнопку "Начать игру" только создателю
        const startBtn = document.getElementById('startGameBtn');
        const isCreator = data.players && data.players[0] && data.players[0].id === this.playerId;
        startBtn.style.display = isCreator ? 'block' : 'none';
        
        document.getElementById('playerCount').textContent = `${data.game.players.length}/5`;
    }

    updateWaitingRoom(data) {
        this.updatePlayerList(data.game.players);
        
        if (data.game.players.length >= 2) {
            document.getElementById('startGameBtn').disabled = false;
        }
        
        document.getElementById('playerCount').textContent = `${data.game.players.length}/5`;
    }

    updatePlayerList(players) {
        const playerList = document.getElementById('playerList');
        if (!playerList) return;
        
        playerList.innerHTML = players.map(player => 
            `<div class="player-item ${player.id === this.playerId ? 'current' : ''}">
                ${player.name} ${player.id === this.playerId ? '(Вы)' : ''}
            </div>`
        ).join('');
    }

    startGame() {
        this.socket.emit('startGame', this.roomId);
        document.getElementById('waitingRoom').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
    }

    renderGame(state) {
        // Обновляем информацию о комнате
        document.getElementById('gameRoomId').textContent = state.roomId;
        
        // Обновляем информацию о ходе
        const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
        document.getElementById('currentPlayerName').textContent = currentPlayer?.name || '';
        document.getElementById('actionsCounter').textContent = state.actionsRemaining;
        
        // Рендерим противников
        this.renderOpponents(state);
        
        // Рендерим текущего игрока
        const myPlayer = state.players.find(p => p.id === this.playerId);
        if (myPlayer) {
            this.renderMyPlayer(myPlayer, state);
        }
        
        // Обновляем состояние кнопок
        const isMyTurn = state.currentPlayerId === this.playerId;
        document.getElementById('endTurnBtn').disabled = !isMyTurn || state.turnPhase === 'discard';
        document.getElementById('discardBtn').classList.toggle('hidden', state.turnPhase !== 'discard');
    }

    renderOpponents(state) {
        const opponentsContainer = document.getElementById('opponents');
        const opponents = state.players.filter(p => p.id !== this.playerId);
        
        opponentsContainer.innerHTML = opponents.map(opponent => `
            <div class="opponent ${state.currentPlayerId === opponent.id ? 'current' : ''}">
                <div class="opponent-header">
                    <h4>${opponent.name}</h4>
                    <span class="money">${opponent.totalMoney}М</span>
                </div>
                <div class="opponent-properties">
                    <div class="property-sets">
                        ${Object.entries(opponent.properties).map(([color, cards]) => 
                            cards.length > 0 ? `
                                <div class="property-set ${color}">
                                    <span class="property-count">${cards.length}</span>
                                    <span class="property-color">${this.getColorName(color)}</span>
                                </div>
                            ` : ''
                        ).join('')}
                    </div>
                </div>
                <div class="opponent-info">
                    <div>Карт в руке: ${opponent.handCount}</div>
                    <div>Комплектов: ${opponent.completeSets.length}</div>
                </div>
            </div>
        `).join('');
    }

    renderMyPlayer(player, state) {
        document.getElementById('myPlayerName').textContent = player.name;
        document.getElementById('myMoney').textContent = `${player.totalMoney}М`;
        document.getElementById('mySets').textContent = player.completeSets.length;
        document.getElementById('handCount').textContent = player.handCount;
        
        // Рендерим собственность
        this.renderProperties(player.properties);
        
        // Рендерим здания
        this.renderBuildings(player.buildings);
        
        // Рендерим банк
        this.renderBank(player.bank);
        
        // Рендерим руку (если это текущий игрок)
        if (state.currentPlayerId === this.playerId) {
            this.renderHand(player.handCount);
        }
    }

    renderProperties(properties) {
        const container = document.getElementById('myProperties');
        container.innerHTML = '';
        
        for (const [color, cards] of Object.entries(properties)) {
            if (cards.length > 0) {
                const propertySet = document.createElement('div');
                propertySet.className = `property-set ${color}`;
                propertySet.innerHTML = `
                    <div class="property-header">
                        <span class="property-color">${this.getColorName(color)}</span>
                        <span class="property-count">${cards.length}</span>
                    </div>
                    <div class="property-cards">
                        ${cards.map(card => `
                            <div class="card property" data-card-id="${card.id}">
                                <div class="card-name">${card.name}</div>
                                <div class="card-value">${card.value}М</div>
                            </div>
                        `).join('')}
                    </div>
                `;
                container.appendChild(propertySet);
            }
        }
    }

    renderHand(handCount) {
        // В реальной реализации здесь будет отображение карт в руке
        // Для безопасности карты в руке не отправляются другим игрокам
        // Их нужно запрашивать отдельно или хранить локально
        document.getElementById('handCount').textContent = handCount;
    }

    playCard(cardId, options = {}) {
        this.socket.emit('playCard', { cardId, ...options });
    }

    endTurn() {
        this.socket.emit('endTurn');
    }

    showPaymentModal(data) {
        const modal = document.getElementById('paymentModal');
        const message = document.getElementById('paymentMessage');
        const options = document.getElementById('paymentOptions');
        const sayNoBtn = document.getElementById('sayNoBtn');
        
        message.textContent = `Вы должны заплатить ${data.amount}М игроку`;
        
        // Показываем опции оплаты (в реальной реализации нужно показать доступные карты)
        options.innerHTML = '<p>Выберите карты для оплаты из банка или собственности</p>';
        
        // Показываем кнопку "Нет", если есть карта
        sayNoBtn.classList.toggle('hidden', !data.canSayNo);
        
        modal.classList.remove('hidden');
        this.pendingAction = data;
    }

    hidePaymentModal() {
        document.getElementById('paymentModal').classList.add('hidden');
        this.pendingAction = null;
    }

    processPayment() {
        // В реальной реализации здесь должен быть выбор карт для оплаты
        const selectedCards = Array.from(this.selectedCards);
        this.socket.emit('payWithCards', {
            paymentCards: selectedCards,
            sayNoCardId: null
        });
        this.hidePaymentModal();
    }

    sayNo() {
        // В реальной реализации нужно выбрать карту "Нет" из руки
        this.socket.emit('payWithCards', {
            paymentCards: [],
            sayNoCardId: 'selected-say-no-card-id' // Нужно получить из выбора игрока
        });
        this.hidePaymentModal();
    }

    showColorModal(card, colors) {
        const modal = document.getElementById('chooseColorModal');
        const colorGrid = document.getElementById('colorOptions');
        
        colorGrid.innerHTML = colors.map(color => `
            <div class="color-option ${color}" 
                 data-color="${color}"
                 onclick="client.selectColor('${color}')">
                ${this.getColorName(color)}
            </div>
        `).join('');
        
        modal.classList.remove('hidden');
        this.pendingAction = { card, type: 'chooseColor' };
    }

    selectColor(color) {
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        
        const selected = document.querySelector(`[data-color="${color}"]`);
        selected.classList.add('selected');
        
        this.selectedColor = color;
    }

    confirmColor() {
        if (this.pendingAction && this.selectedColor) {
            this.socket.emit('changeWildCardColor', {
                cardId: this.pendingAction.card.id,
                newColor: this.selectedColor
            });
            this.hideColorModal();
        }
    }

    hideColorModal() {
        document.getElementById('chooseColorModal').classList.add('hidden');
        this.pendingAction = null;
        this.selectedColor = null;
    }

    showTargetModal(players, cardType) {
        const modal = document.getElementById('chooseTargetModal');
        const options = document.getElementById('targetOptions');
        
        options.innerHTML = players.map(player => `
            <div class="target-option" 
                 data-player-id="${player.id}"
                 onclick="client.selectTarget('${player.id}')">
                ${player.name} (${player.totalMoney}М)
            </div>
        `).join('');
        
        modal.classList.remove('hidden');
        this.pendingAction = { type: 'chooseTarget', cardType };
    }

    selectTarget(playerId) {
        const targetOptions = document.querySelectorAll('.target-option');
        targetOptions.forEach(opt => opt.classList.remove('selected'));
        
        const selected = document.querySelector(`[data-player-id="${playerId}"]`);
        selected.classList.add('selected');
        
        this.selectedTarget = playerId;
    }

    confirmTarget() {
        if (this.pendingAction && this.selectedTarget) {
            // Здесь нужно вызвать playCard с выбранной целью
            this.hideTargetModal();
        }
    }

    hideTargetModal() {
        document.getElementById('chooseTargetModal').classList.add('hidden');
        this.pendingAction = null;
        this.selectedTarget = null;
    }

    showDiscardModal() {
        // Показываем модальное окно для сброса карт
        // Игрок должен выбрать карты для сброса
        const excessCards = this.gameState.players.find(p => p.id === this.playerId).handCount - 7;
        this.showNotification(`Выберите ${excessCards} карт для сброса`);
    }

    getColorName(color) {
        const names = {
            brown: 'Коричневый',
            black: 'Черный (ЖД)',
            red: 'Красный',
            green: 'Зеленый',
            orange: 'Оранжевый',
            blue: 'Синий',
            purple: 'Фиолетовый',
            sand: 'Песочный (Комм.)',
            yellow: 'Желтый',
            lightblue: 'Голубой'
        };
        return names[color] || color;
    }

    showNotification(message, type = 'info') {
        // Простая реализация уведомлений
        alert(message);
    }
}

// Инициализация клиента при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    window.client = new MonopolyDealClient();
});