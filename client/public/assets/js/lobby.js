class LobbyManager {
  constructor() {
    console.log('🚀 Инициализация LobbyManager...');
    
    const serverUrl = 'http://localhost:3000';
    console.log(`🔗 Подключение к серверу: ${serverUrl}`);
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    this.playerId = null;
    this.playerName = '';
    this.currentLobby = null;
    
    this.initSocketListeners();
    this.initEventListeners();
    this.updateDebugInfo('Инициализация завершена');
  }

  updateDebugInfo(message) {
    const debugElement = document.getElementById('debugInfo');
    if (debugElement) {
      debugElement.textContent = `Статус: ${message}`;
    }
    console.log(`📝 Debug: ${message}`);
  }

  initSocketListeners() {
    // Событие подключения
    this.socket.on('connect', () => {
      console.log('✅ Подключено к серверу Socket.IO');
      this.updateDebugInfo('Подключено к серверу');
      this.updateConnectionStatus('Подключено к серверу', 'success');
    });

    // Событие отключения
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Отключено от сервера. Причина:', reason);
      this.updateDebugInfo('Отключено от сервера');
      this.updateConnectionStatus('Отключено от сервера', 'error');
    });

    // Событие ошибки подключения
    this.socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения:', error.message);
      this.updateDebugInfo(`Ошибка подключения: ${error.message}`);
      this.updateConnectionStatus('Ошибка подключения', 'error');
    });

    // Регистрация игрока
    this.socket.on('player_registered', (data) => {
      console.log('✅ Игрок зарегистрирован:', data);
      this.updateDebugInfo('Игрок зарегистрирован');
      
      this.playerId = data.playerId;
      this.playerName = data.name;
      
      // Переключаемся на экран лобби
      document.getElementById('login-screen').classList.remove('active');
      document.getElementById('lobby-screen').classList.add('active');
      
      // Обновляем имя игрока
      document.getElementById('currentPlayerName').textContent = `Игрок: ${this.playerName}`;
      
      // Обновляем списки
      if (data.lobbies) {
        this.updateGamesList(data.lobbies);
      }
      if (data.onlinePlayers) {
        this.updatePlayersList(data.onlinePlayers);
      }
    });

    // Обновление списка лобби
    this.socket.on('lobbies_updated', (lobbies) => {
      console.log('📋 Обновление списка лобби:', lobbies.length);
      this.updateGamesList(lobbies);
    });

    // Обновление информации о лобби (когда мы уже в лобби)
    this.socket.on('lobby_updated', (lobby) => {
      console.log('🔄 Обновление лобби:', lobby);
      this.updateDebugInfo('Получено обновление лобби');
      
      // Если мы еще не показываем интерфейс лобби, показываем его
      if (!this.isInLobbyView()) {
        console.log('📱 Переключаемся на вид лобби');
        this.currentLobby = lobby;
        this.showLobbyView(lobby);
      } else {
        // Иначе просто обновляем существующий вид
        this.updateLobbyView(lobby);
      }
    });

    // Успешное создание лобби
    this.socket.on('lobby_created', (data) => {
      console.log('✅ Лобби создано:', data.lobby);
      this.updateDebugInfo('Лобби создано');
      
      if (data.success) {
        this.currentLobby = data.lobby;
        this.showLobbyView(data.lobby);
      }
    });

    // Все игроки готовы
    this.socket.on('all_players_ready', (isReady) => {
      console.log('🎮 Все игроки готовы:', isReady);
      const startBtn = document.getElementById('startGameBtn');
      if (startBtn) {
        startBtn.disabled = !isReady;
        startBtn.title = isReady ? 'Начать игру' : 'Не все игроки готовы';
      }
    });

    // Начало игры
    this.socket.on('game_starting', (data) => {
      console.log('🎲 Начало игры!', data);
      // Перенаправляем на игровую страницу
      window.location.href = data.redirectUrl;
    });

    // Ошибки
    this.socket.on('error', (data) => {
      console.error('❌ Ошибка сервера:', data.message);
      alert(`Ошибка: ${data.message}`);
      this.updateDebugInfo(`Ошибка: ${data.message}`);
    });

    // Отладка: логируем все события
    this.socket.onAny((eventName, ...args) => {
      console.log(`📨 Событие "${eventName}":`, args);
    });
  }

  // Проверяем, находимся ли мы в режиме просмотра лобби
  isInLobbyView() {
    const lobbyScreen = document.getElementById('lobby-screen');
    return lobbyScreen && 
           lobbyScreen.classList.contains('active') && 
           lobbyScreen.querySelector('.lobby-room');
  }

  updateConnectionStatus(message, type = 'info') {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `connection-status ${type}`;
  }

  initEventListeners() {
    console.log('🔄 Инициализация обработчиков событий...');
    
    // Кнопка входа в лобби
    const enterLobbyBtn = document.getElementById('enterLobby');
    if (enterLobbyBtn) {
      enterLobbyBtn.addEventListener('click', () => {
        const playerName = document.getElementById('playerName').value.trim();
        console.log('🎯 Нажата кнопка "Войти в лобби". Имя:', playerName);
        
        if (playerName) {
          console.log('📤 Отправка события register_player...');
          this.socket.emit('register_player', { name: playerName });
          this.updateDebugInfo('Регистрация игрока...');
        } else {
          alert('Введите ваше имя');
        }
      });
      
      // Добавляем обработчик нажатия Enter в поле ввода имени
      document.getElementById('playerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          enterLobbyBtn.click();
        }
      });
    }

    // Кнопка создания игры
    const createGameBtn = document.getElementById('createGame');
    if (createGameBtn) {
      createGameBtn.addEventListener('click', () => {
        console.log('🎯 Нажата кнопка "Создать игру"');
        this.showCreateGameModal();
      });
    }

    // Модальное окно создания игры
    const confirmCreateBtn = document.getElementById('confirmCreate');
    if (confirmCreateBtn) {
      confirmCreateBtn.addEventListener('click', () => {
        const gameName = document.getElementById('gameName').value.trim();
        const maxPlayers = document.getElementById('maxPlayers').value;
        
        console.log('🎯 Создание игры:', { gameName, maxPlayers });
        
        if (gameName) {
          this.socket.emit('create_lobby', {
            name: gameName,
            maxPlayers: parseInt(maxPlayers),
            playerName: this.playerName
          });
          this.hideCreateGameModal();
        } else {
          alert('Введите название игры');
        }
      });
      
      // Добавляем обработчик нажатия Enter в поле названия игры
      document.getElementById('gameName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          confirmCreateBtn.click();
        }
      });
    }

    const cancelCreateBtn = document.getElementById('cancelCreate');
    if (cancelCreateBtn) {
      cancelCreateBtn.addEventListener('click', () => {
        this.hideCreateGameModal();
      });
    }

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('createGameModal');
      if (event.target === modal) {
        this.hideCreateGameModal();
      }
    });
  }

  updateGamesList(lobbies) {
    const container = document.getElementById('gamesContainer');
    if (!container) return;
    
    container.innerHTML = '';

    if (lobbies.length === 0) {
      container.innerHTML = '<div class="empty-message">Нет активных игр</div>';
      return;
    }

    lobbies.forEach(lobby => {
      const gameElement = document.createElement('div');
      gameElement.className = 'game-item';
      gameElement.innerHTML = `
        <div class="game-info">
          <h3>${lobby.name}</h3>
          <p>Игроки: ${lobby.playerCount}/${lobby.maxPlayers}</p>
          <p>Создатель: ${lobby.creatorId === this.playerId ? 'Вы' : 'Другой игрок'}</p>
        </div>
        <button class="btn-primary join-game" data-lobby-id="${lobby.id}">
          Присоединиться
        </button>
      `;
      container.appendChild(gameElement);
    });

    // Добавляем обработчики для кнопок присоединения
    document.querySelectorAll('.join-game').forEach(button => {
      button.addEventListener('click', (e) => {
        const lobbyId = e.target.getAttribute('data-lobby-id');
        console.log('🎯 Присоединение к лобби:', lobbyId);
        this.joinLobby(lobbyId);
      });
    });
  }

  updatePlayersList(players) {
    const container = document.getElementById('playersContainer');
    if (!container) return;
    
    container.innerHTML = '';

    if (players.length === 0) {
      container.innerHTML = '<div class="empty-message">Нет игроков онлайн</div>';
      return;
    }

    players.forEach(player => {
      const playerElement = document.createElement('div');
      playerElement.className = 'player-item';
      playerElement.innerHTML = `
        <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
        <div class="player-info">
          <h4>${player.name}</h4>
          <span class="player-status online">В сети</span>
        </div>
      `;
      container.appendChild(playerElement);
    });
  }

  addPlayerToList(player) {
    const container = document.getElementById('playersContainer');
    if (!container) return;
    
    const playerElement = document.createElement('div');
    playerElement.className = 'player-item';
    playerElement.innerHTML = `
      <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
      <div class="player-info">
        <h4>${player.name}</h4>
        <span class="player-status online">В сети</span>
      </div>
    `;
    container.appendChild(playerElement);
  }

  joinLobby(lobbyId) {
    console.log('📤 Отправка запроса на присоединение к лобби:', lobbyId);
    this.socket.emit('join_lobby', {
      lobbyId: lobbyId,
      playerName: this.playerName
    });
    this.updateDebugInfo('Присоединение к лобби...');
  }

  showCreateGameModal() {
    document.getElementById('createGameModal').style.display = 'flex';
    document.getElementById('gameName').focus();
  }

  hideCreateGameModal() {
    document.getElementById('createGameModal').style.display = 'none';
    document.getElementById('gameName').value = '';
  }

  showLobbyView(lobby) {
    console.log('📱 Показ интерфейса лобби');
    
    // Сохраняем исходное содержимое лобби для возможности возврата
    const lobbyScreen = document.getElementById('lobby-screen');
    const originalContent = lobbyScreen.querySelector('.lobby-container');
    
    if (originalContent) {
      originalContent.style.display = 'none';
      originalContent.dataset.original = 'true';
    }
    
    // Создаем интерфейс комнаты лобби
    const lobbyRoom = document.createElement('div');
    lobbyRoom.className = 'lobby-room';
    lobbyRoom.innerHTML = `
      <div class="lobby-header">
        <h1>🎮 ${lobby.name}</h1>
        <div class="lobby-info">
          <span>Игроков: ${lobby.playerCount}/${lobby.maxPlayers}</span>
          <button id="leaveLobby" class="btn-secondary">Покинуть лобби</button>
          ${lobby.creatorId === this.playerId ? 
            '<button id="startGameBtn" class="btn-success" disabled>Начать игру</button>' : 
            ''}
        </div>
      </div>
      
      <div class="players-in-lobby">
        <h2>Игроки в лобби</h2>
        <div id="lobbyPlayersList" class="players-list">
          ${this.generatePlayersListHTML(lobby.players)}
        </div>
      </div>
      
      <div class="lobby-controls">
        <div class="ready-toggle">
          <label>
            <input type="checkbox" id="readyCheckbox">
            Готов к игре
          </label>
        </div>
      </div>
      
      <div class="chat-section">
        <h3>Чат лобби</h3>
        <div id="chatMessages" class="chat-messages"></div>
        <div class="chat-input">
          <input type="text" id="chatInput" placeholder="Введите сообщение...">
          <button id="sendMessage" class="btn-primary">Отправить</button>
        </div>
      </div>
    `;
    
    // Добавляем интерфейс комнаты
    lobbyScreen.appendChild(lobbyRoom);
    
    // Инициализируем обработчики событий для комнаты
    this.initLobbyEventListeners();
    
    this.updateDebugInfo(`В лобби: ${lobby.name}`);
  }

  updateLobbyView(lobby) {
    const playersList = document.getElementById('lobbyPlayersList');
    if (!playersList) return;
    
    console.log('🔄 Обновление вида лобби');
    playersList.innerHTML = this.generatePlayersListHTML(lobby.players);
    
    // Обновляем заголовок с количеством игроков
    const lobbyHeader = document.querySelector('.lobby-header h1');
    if (lobbyHeader) {
      lobbyHeader.textContent = `🎮 ${lobby.name}`;
    }
    
    const lobbyInfo = document.querySelector('.lobby-info span');
    if (lobbyInfo) {
      lobbyInfo.textContent = `Игроков: ${lobby.playerCount}/${lobby.maxPlayers}`;
    }
    
    // Обновляем кнопку начала игры
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
      const allReady = lobby.players.length >= 2 && 
                      lobby.players.every(player => player.isReady);
      startBtn.disabled = !allReady || lobby.creatorId !== this.playerId;
    }
    
    // Обновляем состояние чекбокса готовности
    const readyCheckbox = document.getElementById('readyCheckbox');
    if (readyCheckbox) {
      const currentPlayer = lobby.players.find(p => p.id === this.playerId);
      if (currentPlayer) {
        readyCheckbox.checked = currentPlayer.isReady;
      }
    }
  }

  generatePlayersListHTML(players) {
    return players.map(player => `
      <div class="lobby-player ${player.isReady ? 'ready' : ''}">
        <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
        <div class="player-details">
          <h4>${player.name}</h4>
          <span class="player-status ${player.isReady ? 'ready' : 'not-ready'}">
            ${player.isReady ? 'Готов' : 'Не готов'}
          </span>
          ${player.id === this.playerId ? '<span class="you-label">(Вы)</span>' : ''}
        </div>
        ${player.id === this.currentLobby?.creatorId ? 
          '<span class="creator-badge">👑 Создатель</span>' : ''}
      </div>
    `).join('');
  }

  initLobbyEventListeners() {
    // Кнопка покинуть лобби
    const leaveBtn = document.getElementById('leaveLobby');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        console.log('🎯 Покидание лобби');
        this.socket.emit('leave_lobby');
        this.returnToMainLobby();
      });
    }

    // Чекбокс готовности
    const readyCheckbox = document.getElementById('readyCheckbox');
    if (readyCheckbox) {
      readyCheckbox.addEventListener('change', (e) => {
        console.log('✅ Изменение статуса готовности:', e.target.checked);
        this.socket.emit('player_ready', e.target.checked);
      });
    }

    // Кнопка начала игры
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        console.log('🎯 Начало игры');
        this.socket.emit('start_game');
      });
    }

    // Чат
    const sendBtn = document.getElementById('sendMessage');
    const chatInput = document.getElementById('chatInput');
    
    if (sendBtn && chatInput) {
      sendBtn.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
          this.addChatMessage(this.playerName, message, true);
          chatInput.value = '';
        }
      });

      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendBtn.click();
        }
      });
    }
  }

  returnToMainLobby() {
    console.log('🔙 Возврат в основное лобби');
    
    // Удаляем интерфейс комнаты лобби
    const lobbyRoom = document.querySelector('.lobby-room');
    if (lobbyRoom) {
      lobbyRoom.remove();
    }
    
    // Показываем исходный интерфейс лобби
    const originalContent = document.querySelector('.lobby-container[data-original="true"]');
    if (originalContent) {
      originalContent.style.display = 'block';
    }
    
    // Обновляем список лобби
    this.socket.emit('get_lobbies');
    
    this.currentLobby = null;
    this.updateDebugInfo('В основном лобби');
  }

  addChatMessage(sender, message, isOwn = false) {
    const chat = document.getElementById('chatMessages');
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

  checkConnection() {
    console.log('🔍 Проверка соединения:');
    console.log('- Socket connected:', this.socket.connected);
    console.log('- Socket ID:', this.socket.id);
    console.log('- Player ID:', this.playerId);
    console.log('- Player Name:', this.playerName);
    console.log('- Current Lobby:', this.currentLobby);
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 Документ загружен');
  try {
    window.lobbyManager = new LobbyManager();
    console.log('✅ LobbyManager создан');
    
    // Экспортируем для отладки в консоли
    window.debugLobby = () => {
      if (window.lobbyManager) {
        window.lobbyManager.checkConnection();
      }
    };
    
  } catch (error) {
    console.error('❌ Ошибка при создании LobbyManager:', error);
  }
});