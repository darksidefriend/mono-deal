class GameManager {
  constructor() {
    console.log('🚀 Инициализация GameManager...');
    
    // Получаем параметры из URL
    const urlParams = new URLSearchParams(window.location.search);
    this.gameId = urlParams.get('gameId');
    this.playerId = urlParams.get('playerId');
    
    console.log('🎮 Параметры игры:', { gameId: this.gameId, playerId: this.playerId });
    
    if (!this.gameId || !this.playerId) {
      this.showError('Неверная ссылка на игру. Пожалуйста, вернитесь в лобби.');
      return;
    }
    
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    
    this.gameState = null;
    this.playerName = '';
    this.players = [];
    
    this.initSocketListeners();
    this.initEventListeners();
    this.connectToGame();
  }
  
  connectToGame() {
    console.log('🔗 Подключение к игре...');
    this.updateLoadingMessage('Подключение к серверу...');
    
    this.socket.on('connect', () => {
      console.log('✅ Подключено к серверу игры');
      this.updateLoadingMessage('Присоединение к игре...');
      
      // Отправляем запрос на присоединение к игре
      setTimeout(() => {
        this.socket.emit('join_game', {
          gameId: this.gameId,
          playerId: this.playerId
        });
      }, 500);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения к серверу:', error);
      this.showError(`Не удалось подключиться к серверу: ${error.message}`);
    });
  }
  
  initSocketListeners() {
    // Успешное присоединение к игре
    this.socket.on('game_state', (gameState) => {
      console.log('🎮 Получено состояние игры:', gameState);
      this.gameState = gameState;
      this.updateGameUI();
      this.switchToGameScreen();
    });
    
    // Обновление состояния игры
    this.socket.on('game_update', (update) => {
      console.log('🔄 Обновление игры:', update);
      
      if (update.type === 'state_update' && update.state) {
        this.gameState = update.state;
        this.updateGameUI();
      } else if (update.type === 'log_message') {
        this.addGameLog(update.message);
      }
    });
    
    // Смена хода
    this.socket.on('turn_changed', (data) => {
      console.log('🔄 Смена хода:', data);
      this.addGameLog(`Ход переходит к игроку ${data.currentPlayerName}`);
      this.updateTurnInfo(data);
    });
    
    // Карта сыграна
    this.socket.on('card_played', (data) => {
      console.log('🃏 Карта сыграна:', data);
      if (data.playerId !== this.playerId) {
        this.addGameLog(`Игрок ${data.playerName} сыграл карту: ${data.cardName}`);
      }
    });
    
    // Игрок подключился
    this.socket.on('player_reconnected', (data) => {
      console.log('👤 Игрок переподключился:', data);
      this.addGameLog(`Игрок ${data.name} переподключился к игре`);
    });
    
    // Игрок отключился
    this.socket.on('player_disconnected', (data) => {
      console.log('👤 Игрок отключился:', data);
      this.addGameLog(`Игрок отключился от игры`);
    });
    
    // Игра завершена
    this.socket.on('game_over', (data) => {
      console.log('🏁 Игра завершена:', data);
      this.showGameOver(data);
    });
    
    // Ошибки
    this.socket.on('error', (data) => {
      console.error('❌ Ошибка игры:', data);
      this.showError(data.message || 'Произошла ошибка в игре');
    });
    
    // Отладка
    this.socket.onAny((eventName, ...args) => {
      console.log(`📨 Игровое событие "${eventName}":`, args);
    });
  }
  
  initEventListeners() {
    // Кнопка завершения хода
    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
      endTurnBtn.addEventListener('click', () => {
        this.endTurn();
      });
    }
    
    // Кнопка покидания игры
    const leaveGameBtn = document.getElementById('leave-game-btn');
    if (leaveGameBtn) {
      leaveGameBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите покинуть игру?')) {
          this.socket.emit('leave_game');
          window.location.href = '/';
        }
      });
    }
    
    // Чат игры
    const chatSendBtn = document.getElementById('game-chat-send');
    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', () => {
        this.sendChatMessage();
      });
    }
    
    const chatInput = document.getElementById('game-chat-input');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendChatMessage();
        }
      });
    }
  }
  
  updateLoadingMessage(message) {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
      loadingMessage.textContent = message;
    }
  }
  
  showError(message) {
    const errorElement = document.getElementById('loading-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
    
    // Добавляем кнопку возврата в лобби
    setTimeout(() => {
      if (errorElement) {
        const backButton = document.createElement('button');
        backButton.textContent = 'Вернуться в лобби';
        backButton.className = 'btn-primary';
        backButton.style.marginTop = '10px';
        backButton.onclick = () => {
          window.location.href = '/';
        };
        errorElement.appendChild(backButton);
      }
    }, 1000);
  }
  
  switchToGameScreen() {
    document.getElementById('loading-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
  }
  
  updateGameUI() {
    if (!this.gameState) return;
    
    console.log('🎨 Обновление UI игры', this.gameState);
    
    // Обновляем информацию о ходе
    this.updateTurnInfo();
    
    // Обновляем информацию о колоде
    document.getElementById('deck-count').textContent = this.gameState.deckSize || 0;
    
    // Обновляем информацию о действиях
    this.updateActionInfo();
    
    // Обновляем информацию о игроке
    const currentPlayer = this.gameState.players?.find(p => p.id === this.playerId);
    if (currentPlayer) {
      console.log('👤 Текущий игрок:', currentPlayer);
      document.getElementById('player-name').textContent = currentPlayer.name;
      document.getElementById('hand-count').textContent = currentPlayer.handSize || 0;
      document.getElementById('bank-total').textContent = `${currentPlayer.bankValue || 0}М`;
      
      // Отображаем руку
      console.log('🃏 Рука игрока:', currentPlayer.hand);
      this.renderHand(currentPlayer.hand);
      
      // Отображаем собственность
      this.renderProperties(currentPlayer.properties);
      
      // Отображаем банк
      this.renderBank(currentPlayer.bank);
    }
    
    // Отображаем противников
    this.renderOpponents(this.gameState.players);
    
    // Отображаем историю действий
    this.renderActionsHistory();
  }
  
  updateTurnInfo() {
    const turnInfo = document.getElementById('turn-info');
    const turnIndicator = document.getElementById('player-turn-indicator');
    const isCurrentTurn = this.gameState?.currentPlayerId === this.playerId;
    
    if (turnInfo) {
      if (isCurrentTurn) {
        turnInfo.textContent = 'Ваш ход!';
        turnInfo.style.color = '#2ecc71';
        if (turnIndicator) {
          turnIndicator.classList.add('active');
        }
      } else {
        const currentPlayer = this.gameState?.players?.find(p => p.id === this.gameState.currentPlayerId);
        if (currentPlayer) {
          turnInfo.textContent = `Ход игрока: ${currentPlayer.name}`;
        } else {
          turnInfo.textContent = 'Ожидание хода...';
        }
        turnInfo.style.color = '#ecf0f1';
        if (turnIndicator) {
          turnIndicator.classList.remove('active');
        }
      }
    }
  }
  
  updateActionInfo() {
    const actionInfo = document.getElementById('phase-info');
    const endTurnBtn = document.getElementById('end-turn-btn');
    
    if (!actionInfo) return;
    
    const currentPlayer = this.gameState?.players?.find(p => p.id === this.playerId);
    const isCurrentTurn = this.gameState?.currentPlayerId === this.playerId;
    
    if (isCurrentTurn) {
      const actionsLeft = (currentPlayer?.actionPoints || 3) - (currentPlayer?.actionsUsed || 0);
      actionInfo.textContent = `Действий осталось: ${actionsLeft}/3`;
      actionInfo.style.color = actionsLeft > 0 ? '#2ecc71' : '#e74c3c';
      
      if (endTurnBtn) {
        endTurnBtn.disabled = false;
        endTurnBtn.textContent = 'Завершить ход';
      }
    } else {
      actionInfo.textContent = 'Ожидание хода...';
      actionInfo.style.color = '#ecf0f1';
      
      if (endTurnBtn) {
        endTurnBtn.disabled = true;
        endTurnBtn.textContent = 'Ожидание хода...';
      }
    }
  }
  
  calculateBankValue(bank) {
    if (!bank || !Array.isArray(bank)) return 0;
    return bank.reduce((total, card) => total + (card.value || 0), 0);
  }
  
  renderHand(hand) {
    const handContainer = document.getElementById('hand-cards');
    if (!handContainer) return;
    
    console.log('🎴 Рендерим руку:', hand);
    handContainer.innerHTML = '';
    
    if (!hand || hand.length === 0) {
      handContainer.innerHTML = '<div class="empty-hand">Нет карт в руке</div>';
      return;
    }
    
    hand.forEach((card, index) => {
      const cardElement = this.createCardElement(card, index, 'hand');
      handContainer.appendChild(cardElement);
    });
  }
  
  renderProperties(properties) {
    const propertiesContainer = document.getElementById('properties-container');
    if (!propertiesContainer) return;
    
    propertiesContainer.innerHTML = '';
    
    if (!properties || properties.length === 0) {
      propertiesContainer.innerHTML = '<div class="empty-properties">Нет собственности</div>';
      return;
    }
    
    // Группируем собственность по цветам
    const groupedProperties = {};
    
    properties.forEach(property => {
      const color = property.color || property.colors?.[0] || 'wild';
      if (!groupedProperties[color]) {
        groupedProperties[color] = [];
      }
      groupedProperties[color].push(property);
    });
    
    // Отображаем сгруппированную собственность
    Object.entries(groupedProperties).forEach(([color, props]) => {
      const propertySet = document.createElement('div');
      propertySet.className = `property-set ${color}`;
      
      const colorNames = {
        brown: 'Коричневая',
        blue: 'Синяя',
        green: 'Зеленая',
        red: 'Красная',
        yellow: 'Желтая',
        purple: 'Фиолетовая',
        orange: 'Оранжевая',
        black: 'Черная (ЖД)',
        sand: 'Песочная (Коммунальные)',
        'light-blue': 'Голубая',
        wild: 'Универсальная'
      };
      
      propertySet.innerHTML = `
        <div class="property-set-header">
          <span class="property-set-title">${colorNames[color] || color}</span>
          <span class="property-set-count">${props.length}</span>
        </div>
        <div class="property-cards">
          ${props.map(prop => `<div class="property-card">${prop.name}</div>`).join('')}
        </div>
      `;
      
      propertiesContainer.appendChild(propertySet);
    });
  }
  
  renderBank(bank) {
    const bankContainer = document.getElementById('bank-cards');
    if (!bankContainer) return;
    
    bankContainer.innerHTML = '';
    
    if (!bank || bank.length === 0) {
      bankContainer.innerHTML = '<div class="empty-bank">Банк пуст</div>';
      return;
    }
    
    bank.forEach((card, index) => {
      const cardElement = this.createCardElement(card, index, 'bank');
      bankContainer.appendChild(cardElement);
    });
  }
  
  renderOpponents(players) {
    const opponentsContainer = document.getElementById('opponents-container');
    if (!opponentsContainer) return;
    
    opponentsContainer.innerHTML = '';
    
    if (!players || players.length === 0) return;
    
    players.forEach(player => {
      // Пропускаем текущего игрока
      if (player.id === this.playerId) return;
      
      const opponentElement = document.createElement('div');
      opponentElement.className = 'opponent-player';
      
      if (player.id === this.gameState?.currentPlayerId) {
        opponentElement.classList.add('current-turn');
      }
      
      opponentElement.innerHTML = `
        <div class="opponent-name">${player.name}</div>
        <div class="opponent-stats">
          <span>Карт: ${player.handSize || 0}</span>
          <span>Банк: ${player.bankValue || 0}М</span>
          <span>Собственность: ${player.properties?.length || 0}</span>
        </div>
        <div class="opponent-actions">
          <span>Действий: ${(player.actionPoints || 0) - (player.actionsUsed || 0)}</span>
        </div>
      `;
      
      opponentsContainer.appendChild(opponentElement);
    });
  }
  
  createCardElement(card, index, type) {
    console.log('🎴 Создание элемента карты:', card);
    
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';
    cardElement.dataset.index = index;
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.cardType = card.type;
    
    // Добавляем класс для типа карты
    if (card.type) {
      cardElement.classList.add(`card-${card.type}`);
    }
    
    // Определяем, можно ли играть карту
    if (type === 'hand' && this.canPlayCard(card)) {
      cardElement.classList.add('playable');
      cardElement.addEventListener('click', () => this.playCard(card, index));
    } else if (type === 'hand') {
      cardElement.style.opacity = '0.8';
      cardElement.style.cursor = 'default';
    }
    
    const cardName = card.name || 'Карта';
    const cardValue = card.value ? `${card.value}М` : '';
    const cardType = this.getCardTypeLabel(card.type);
    
    cardElement.innerHTML = `
      <div class="card-content">
        ${cardValue ? `<div class="card-value">${cardValue}</div>` : ''}
        <div class="card-name">${cardName}</div>
        <div class="card-type">${cardType}</div>
      </div>
    `;
    
    return cardElement;
  }
  
  getCardTypeLabel(type) {
    const labels = {
      money: 'Деньги',
      property: 'Собственность',
      action: 'Действие',
      rent: 'Аренда',
      building: 'Здание',
      wild: 'Универсальная'
    };
    return labels[type] || type;
  }
  
  canPlayCard(card) {
    // Проверяем, можно ли играть карту сейчас
    if (!this.gameState || this.gameState.currentPlayerId !== this.playerId) {
      return false;
    }
    
    // Проверяем, что есть доступные действия
    const currentPlayer = this.gameState.players.find(p => p.id === this.playerId);
    if (!currentPlayer) return false;
    
    const actionsLeft = currentPlayer.actionPoints - currentPlayer.actionsUsed;
    if (actionsLeft <= 0) return false;
    
    // Для денег - всегда можно положить в банк
    if (card.type === 'money') {
      return true;
    }
    
    // Для других типов карт проверки будут добавлены позже
    return false;
  }
  
  playCard(card, index) {
    console.log('🎯 Играем карту:', card, index);
    
    const currentPlayer = this.gameState.players.find(p => p.id === this.playerId);
    if (!currentPlayer) return;
    
    // Проверяем тип карты и вызываем соответствующее действие
    if (card.type === 'money') {
      this.putMoneyInBank(card, index);
    } else {
      alert('Этот тип карты пока не поддерживается');
    }
  }
  
  putMoneyInBank(card, index) {
    if (!confirm(`Положить ${card.name} в банк? Это займет 1 действие.`)) {
      return;
    }
    
    console.log('💰 Отправка денег в банк:', card, index);
    
    this.socket.emit('put_money_in_bank', {
      gameId: this.gameId,
      playerId: this.playerId,
      cardIndex: index
    });
    
    // Временно убираем карту из руки
    const cardElement = document.querySelector(`.card-item[data-index="${index}"]`);
    if (cardElement) {
      cardElement.style.opacity = '0.5';
      cardElement.style.pointerEvents = 'none';
    }
  }
  
  endTurn() {
    if (!confirm('Завершить ход?')) {
      return;
    }
    
    console.log('🔄 Завершение хода');
    
    this.socket.emit('end_turn', {
      gameId: this.gameId,
      playerId: this.playerId
    });
    
    // Блокируем кнопку до подтверждения сервера
    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
      endTurnBtn.disabled = true;
      endTurnBtn.textContent = 'Завершение...';
    }
  }
  
  sendChatMessage() {
    const input = document.getElementById('game-chat-input');
    const message = input.value.trim();
    
    if (message) {
      // Пока просто добавляем сообщение локально
      this.addChatMessage('Вы', message, true);
      input.value = '';
      
      // В будущем будем отправлять на сервер
      // this.socket.emit('game_chat', {
      //   gameId: this.gameId,
      //   playerId: this.playerId,
      //   message: message
      // });
    }
  }
  
  addChatMessage(sender, message, isOwn = false) {
    const chat = document.getElementById('game-chat-messages');
    if (!chat) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${isOwn ? 'own' : ''}`;
    messageElement.innerHTML = `
      <span class="message-sender">${sender}:</span>
      <span class="message-text">${message}</span>
    `;
    chat.appendChild(messageElement);
    chat.scrollTop = chat.scrollHeight;
  }
  
  addGameLog(message) {
    const log = document.getElementById('game-log-messages');
    if (!log) return;
    
    const logElement = document.createElement('div');
    logElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.insertBefore(logElement, log.firstChild);
    
    // Ограничиваем количество сообщений в логе
    if (log.children.length > 50) {
      log.removeChild(log.lastChild);
    }
  }
  
  renderActionsHistory() {
    const gameLog = document.getElementById('game-log-messages');
    if (!gameLog || !this.gameState.actionsHistory) return;
    
    gameLog.innerHTML = '';
    
    // Берем последние 5 действий
    const recentActions = this.gameState.actionsHistory.slice(-5);
    
    recentActions.forEach(action => {
      const logElement = document.createElement('div');
      logElement.className = 'log-entry';
      
      let message = '';
      switch (action.type) {
        case 'money_to_bank':
          message = `${action.playerName} положил(а) ${action.card?.name || 'карту'} в банк`;
          break;
        case 'discard':
          message = `${action.playerName} сбросил(а) карту`;
          break;
        case 'game_start':
          message = action.message || 'Игра началась!';
          break;
        default:
          message = `${action.playerName || 'Кто-то'} совершил(а) действие`;
      }
      
      const time = action.timestamp ? 
        new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      logElement.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-message">${message}</span>
      `;
      
      gameLog.appendChild(logElement);
    });
    
    // Прокручиваем вниз
    gameLog.scrollTop = gameLog.scrollHeight;
  }
  
  showGameOver(data) {
    alert(`Игра завершена! Победитель: ${data.winnerName}\n\nНажмите OK для возврата в лобби.`);
    window.location.href = '/';
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎮 Загрузка игровой страницы...');
  try {
    window.gameManager = new GameManager();
    console.log('✅ GameManager создан');
  } catch (error) {
    console.error('❌ Ошибка при создании GameManager:', error);
    document.getElementById('loading-message').textContent = 'Ошибка загрузки игры';
    document.getElementById('loading-error').textContent = error.message;
    document.getElementById('loading-error').style.display = 'block';
  }
});