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
    
    this.socket.once('connect', () => {
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
    
    this.socket.once('connect_error', (error) => {
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
      this.updateGameState(update);
      this.updateGameUI();
    });
    
    // Смена хода
    this.socket.on('turn_changed', (data) => {
      console.log('🔄 Смена хода:', data);
      this.addGameLog(`Ход переходит к игроку ${data.playerName}`);
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
    document.getElementById('end-turn-btn').addEventListener('click', () => {
      this.socket.emit('end_turn');
    });
    
    // Кнопка покидания игры
    document.getElementById('leave-game-btn').addEventListener('click', () => {
      if (confirm('Вы уверены, что хотите покинуть игру?')) {
        this.socket.emit('leave_game');
        window.location.href = '/';
      }
    });
    
    // Чат игры
    document.getElementById('game-chat-send').addEventListener('click', () => {
      this.sendChatMessage();
    });
    
    document.getElementById('game-chat-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendChatMessage();
      }
    });
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
    
    // Обновляем информацию о ходе
    this.updateTurnInfo(this.gameState);
    
    // Обновляем информацию о колоде
    document.getElementById('deck-count').textContent = this.gameState.deckSize || 0;
    
    // Обновляем информацию о игроке
    const currentPlayer = this.gameState.players?.find(p => p.id === this.playerId);
    if (currentPlayer) {
      document.getElementById('player-name').textContent = currentPlayer.name;
      document.getElementById('hand-count').textContent = currentPlayer.handSize || 0;
      
      // Расчет банка (сумма денежных карт)
      const bankTotal = this.calculateBankTotal(currentPlayer.bank);
      document.getElementById('bank-total').textContent = `${bankTotal}М`;
      
      // Отображаем руку
      this.renderHand(currentPlayer.hand);
      
      // Отображаем собственность
      this.renderProperties(currentPlayer.properties);
      
      // Отображаем банк
      this.renderBank(currentPlayer.bank);
    }
    
    // Отображаем противников
    this.renderOpponents(this.gameState.players);
  }
  
  updateTurnInfo(data) {
    const turnInfo = document.getElementById('turn-info');
    const endTurnBtn = document.getElementById('end-turn-btn');
    
    if (data.currentPlayerId === this.playerId) {
      turnInfo.textContent = 'Ваш ход!';
      turnInfo.style.color = '#2ecc71';
      endTurnBtn.disabled = false;
    } else {
      const currentPlayer = this.gameState?.players?.find(p => p.id === data.currentPlayerId);
      if (currentPlayer) {
        turnInfo.textContent = `Ход игрока: ${currentPlayer.name}`;
      } else {
        turnInfo.textContent = 'Ожидание хода...';
      }
      turnInfo.style.color = '#ecf0f1';
      endTurnBtn.disabled = true;
    }
    
    // Обновляем информацию о фазе
    const phaseInfo = document.getElementById('phase-info');
    if (this.gameState?.turnPhase) {
      const phases = {
        draw: 'Фаза: Розыгрыш',
        action: 'Фаза: Действия',
        end: 'Фаза: Завершение'
      };
      phaseInfo.textContent = phases[this.gameState.turnPhase] || 'Фаза: Неизвестно';
    }
  }
  
  calculateBankTotal(bank) {
    if (!bank || !Array.isArray(bank)) return 0;
    return bank.reduce((total, card) => total + (card.value || 0), 0);
  }
  
  renderHand(hand) {
    const handContainer = document.getElementById('hand-cards');
    if (!handContainer) return;
    
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
      
      // Расчет банка противника
      const bankTotal = this.calculateBankTotal(player.bank);
      
      opponentElement.innerHTML = `
        <div class="opponent-name">${player.name}</div>
        <div class="opponent-stats">
          <span>Карт: ${player.handSize || 0}</span>
          <span>Банк: ${bankTotal}М</span>
          <span>Собственность: ${player.properties?.length || 0}</span>
        </div>
        <div class="opponent-properties">
          ${this.renderOpponentProperties(player.properties)}
        </div>
      `;
      
      opponentsContainer.appendChild(opponentElement);
    });
  }
  
  renderOpponentProperties(properties) {
    if (!properties || properties.length === 0) return '';
    
    // Группируем по цветам для отображения
    const colorCounts = {};
    properties.forEach(prop => {
      const color = prop.color || prop.colors?.[0] || 'wild';
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
    
    let html = '';
    Object.entries(colorCounts).forEach(([color, count]) => {
      for (let i = 0; i < Math.min(count, 10); i++) {
        html += `<div class="opponent-property" style="background-color: var(--color-${color})"></div>`;
      }
    });
    
    return html;
  }
  
  createCardElement(card, index, type) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';
    cardElement.dataset.index = index;
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.cardType = card.type;
    
    // Определяем цвет карты для собственности
    let cardColor = '';
    if (card.type === 'property') {
      cardColor = card.color || card.colors?.[0] || 'wild';
    }
    
    // Определяем, можно ли играть карту
    if (type === 'hand' && this.canPlayCard(card)) {
      cardElement.classList.add('playable');
      cardElement.addEventListener('click', () => this.playCard(card, index));
    }
    
    const cardName = card.name || 'Карта';
    const cardValue = card.value ? `${card.value}М` : '';
    
    cardElement.innerHTML = `
      <div class="card-content">
        <div class="card-value">${cardValue}</div>
        <div class="card-name">${cardName}</div>
      </div>
    `;
    
    // Добавляем цвет для карт собственности
    if (cardColor) {
      cardElement.style.borderColor = this.getColorValue(cardColor);
    }
    
    return cardElement;
  }
  
  getColorValue(color) {
    const colors = {
      brown: '#8B4513',
      blue: '#3498db',
      green: '#2ecc71',
      red: '#e74c3c',
      yellow: '#f1c40f',
      purple: '#9b59b6',
      orange: '#e67e22',
      black: '#2c3e50',
      sand: '#d35400',
      'light-blue': '#85c1e9',
      wild: '#95a5a6'
    };
    return colors[color] || '#ccc';
  }
  
  canPlayCard(card) {
    // Базовая проверка: можно ли играть карту сейчас
    if (!this.gameState || this.gameState.currentPlayerId !== this.playerId) {
      return false;
    }
    
    // Здесь можно добавить дополнительные проверки в зависимости от типа карты
    // и текущей фазы игры
    
    return true;
  }
  
  playCard(card, index) {
    console.log('🎯 Играем карту:', card, index);
    
    // Отправляем серверу информацию о сыгранной карте
    this.socket.emit('play_card', {
      cardId: card.id,
      cardIndex: index,
      gameId: this.gameId,
      playerId: this.playerId
    });
    
    // Временно убираем карту из руки (сервер подтвердит обновление)
    const cardElement = document.querySelector(`.card-item[data-index="${index}"]`);
    if (cardElement) {
      cardElement.style.opacity = '0.5';
      cardElement.style.pointerEvents = 'none';
    }
  }
  
  sendChatMessage() {
    const input = document.getElementById('game-chat-input');
    const message = input.value.trim();
    
    if (message) {
      this.socket.emit('game_chat', {
        gameId: this.gameId,
        playerId: this.playerId,
        message: message
      });
      
      this.addChatMessage('Вы', message, true);
      input.value = '';
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
  
  updateGameState(update) {
    // Обновляем состояние игры на основе полученных данных
    if (update.gameState) {
      this.gameState = { ...this.gameState, ...update.gameState };
    }
    
    // Добавляем сообщение в лог
    if (update.message) {
      this.addGameLog(update.message);
    }
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
  } catch (error) {
    console.error('❌ Ошибка при создании GameManager:', error);
    document.getElementById('loading-message').textContent = 'Ошибка загрузки игры';
    document.getElementById('loading-error').textContent = error.message;
    document.getElementById('loading-error').style.display = 'block';
  }
});