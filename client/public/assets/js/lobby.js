class LobbyManager {
  constructor() {
    this.socket = io();
    this.playerId = null;
    this.playerName = '';
    this.currentLobby = null;
    
    this.initSocketListeners();
    this.initEventListeners();
  }

  initSocketListeners() {
    // Регистрация игрока
    this.socket.on('player_registered', (data) => {
      this.playerId = data.playerId;
      this.playerName = data.name;
      
      // Переключаемся на экран лобби
      document.getElementById('login-screen').classList.remove('active');
      document.getElementById('lobby-screen').classList.add('active');
      
      // Обновляем имя игрока
      document.getElementById('currentPlayerName').textContent = `Игрок: ${this.playerName}`;
      
      // Обновляем списки
      this.updateGamesList(data.lobbies);
      this.updatePlayersList(data.onlinePlayers);
    });

    // Обновление списка лобби
    this.socket.on('lobbies_updated', (lobbies) => {
      this.updateGamesList(lobbies);
    });

    // Обновление списка игроков
    this.socket.on('player_joined', (player) => {
      this.addPlayerToList(player);
    });

    this.socket.on('player_left', (data) => {
      this.removePlayerFromList(data.playerId);
    });

    // Успешное создание лобби
    this.socket.on('lobby_created', (data) => {
      if (data.success) {
        this.currentLobby = data.lobby;
        this.showLobbyView(data.lobby);
      }
    });

    // Обновление информации о лобби
    this.socket.on('lobby_updated', (lobby) => {
      this.updateLobbyView(lobby);
    });

    // Все игроки готовы
    this.socket.on('all_players_ready', (isReady) => {
      const startBtn = document.getElementById('startGameBtn');
      if (startBtn) {
        startBtn.disabled = !isReady;
        startBtn.title = isReady ? 'Начать игру' : 'Не все игроки готовы';
      }
    });

    // Начало игры
    this.socket.on('game_starting', (data) => {
      // Перенаправляем на игровую страницу
      window.location.href = data.redirectUrl;
    });

    // Ошибки
    this.socket.on('error', (data) => {
      alert(`Ошибка: ${data.message}`);
    });
  }

  initEventListeners() {
    // Кнопка входа в лобби
    document.getElementById('enterLobby').addEventListener('click', () => {
      const playerName = document.getElementById('playerName').value.trim();
      if (playerName) {
        this.socket.emit('register_player', { name: playerName });
      } else {
        alert('Введите ваше имя');
      }
    });

    // Кнопка создания игры
    document.getElementById('createGame').addEventListener('click', () => {
      this.showCreateGameModal();
    });

    // Модальное окно создания игры
    document.getElementById('confirmCreate').addEventListener('click', () => {
      const gameName = document.getElementById('gameName').value.trim();
      const maxPlayers = document.getElementById('maxPlayers').value;
      
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

    document.getElementById('cancelCreate').addEventListener('click', () => {
      this.hideCreateGameModal();
    });
  }

  updateGamesList(lobbies) {
    const container = document.getElementById('gamesContainer');
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
        this.joinLobby(lobbyId);
      });
    });
  }

  updatePlayersList(players) {
    const container = document.getElementById('playersContainer');
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

  removePlayerFromList(playerId) {
    // В реальном приложении здесь была бы логика удаления игрока по ID
    // Для простоты просто обновим весь список при следующем обновлении
  }

  joinLobby(lobbyId) {
    this.socket.emit('join_lobby', {
      lobbyId: lobbyId,
      playerName: this.playerName
    });
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
    const lobbyScreen = document.getElementById('lobby-screen');
    lobbyScreen.innerHTML = `
      <div class="lobby-room">
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
      </div>
    `;

    this.initLobbyEventListeners();
    this.updateLobbyView(lobby);
  }

  updateLobbyView(lobby) {
    if (!document.getElementById('lobbyPlayersList')) return;
    
    document.getElementById('lobbyPlayersList').innerHTML = this.generatePlayersListHTML(lobby.players);
    
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
    document.getElementById('leaveLobby').addEventListener('click', () => {
      this.socket.emit('leave_lobby');
      window.location.reload();
    });

    // Чекбокс готовности
    document.getElementById('readyCheckbox').addEventListener('change', (e) => {
      this.socket.emit('player_ready', e.target.checked);
    });

    // Кнопка начала игры
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.socket.emit('start_game');
      });
    }

    // Чат
    document.getElementById('sendMessage').addEventListener('click', () => {
      const input = document.getElementById('chatInput');
      const message = input.value.trim();
      if (message) {
        // В будущем добавим отправку сообщений через сокет
        this.addChatMessage(this.playerName, message, true);
        input.value = '';
      }
    });

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('sendMessage').click();
      }
    });
  }

  addChatMessage(sender, message, isOwn = false) {
    const chat = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${isOwn ? 'own' : ''}`;
    messageElement.innerHTML = `
      <span class="message-sender">${sender}:</span>
      <span class="message-text">${message}</span>
    `;
    chat.appendChild(messageElement);
    chat.scrollTop = chat.scrollHeight;
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  window.lobbyManager = new LobbyManager();
});