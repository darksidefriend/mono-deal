class SocketManager {
    constructor() {
        this.socket = io();
        this.gameState = null;
        this.playerId = null;
        this.gameId = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
        
        this.socket.on('gameCreated', (data) => {
            console.log('Game created:', data);
            this.playerId = data.playerId;
            this.gameId = data.gameId;
            
            // Сохраняем playerId в localStorage для восстановления
            localStorage.setItem('monopolyPlayerId', data.playerId);
            localStorage.setItem('monopolyGameId', data.gameId);
            
            updateLobby(data);
        });
        
        this.socket.on('gameJoined', (data) => {
            console.log('Game joined:', data);
            this.playerId = data.playerId;
            this.gameId = data.gameId;
            
            // Сохраняем playerId в localStorage для восстановления
            localStorage.setItem('monopolyPlayerId', data.playerId);
            localStorage.setItem('monopolyGameId', data.gameId);
            
            updateLobby(data);
        });
        
        this.socket.on('gameUpdate', (state) => {
            console.log('Game update received:', state);
            this.gameState = state;
            
            // Находим себя в списке игроков
            const myPlayer = state.players.find(p => p.id === this.playerId);
            if (myPlayer) {
                console.log('My hand cards:', myPlayer.hand);
            }
            
            // Если игра началась, переключаем на игровой экран
            if (state.turnPhase !== 'waiting') {
                switchToGameScreen();
                updateGameUI(state);
            } else {
                // Иначе обновляем лобби
                updateLobbyState(state);
            }
        });
        
        this.socket.on('gameStarted', (state) => {
            console.log('Game started:', state);
            this.gameState = state;
            
            // Находим себя в списке игроков
            const myPlayer = state.players.find(p => p.id === this.playerId);
            if (myPlayer) {
                console.log('My hand after start:', myPlayer.hand);
            }
            
            switchToGameScreen();
            updateGameUI(state);
        });

        this.socket.on('error', (message) => {
            console.error('Socket error:', message);
            if (window.showError) {
                window.showError(message);
            } else {
                alert(message);
            }
        });
        
        this.socket.on('gameOver', (data) => {
            console.log('Game over:', data);
            showGameOver(data.winner);
        });
        
        this.socket.on('error', (message) => {
            console.error('Socket error:', message);
            alert(message);
        });
    }
    
    createGame(playerName) {
        console.log('Creating game for:', playerName);
        this.socket.emit('createGame', playerName);
    }
    
    joinGame(gameId, playerName) {
        console.log('Joining game:', gameId, playerName);
        this.socket.emit('joinGame', { gameId: gameId.toUpperCase(), playerName });
    }
    
    startGame() {
        console.log('Starting game');
        this.socket.emit('startGame');
    }
    
    playCard(cardId, options = {}) {
        console.log('Playing card:', cardId, options);
        this.socket.emit('playCard', { cardId, ...options });
    }
    
    endTurn() {
        console.log('Ending turn');
        this.socket.emit('endTurn');
    }
    
    sayNo() {
        console.log('Saying NO');
        this.socket.emit('sayNo');
    }
    
    payRent(cards) {
        console.log('Paying rent:', cards);
        this.socket.emit('payRent', cards);
    }
    
    // Восстановление соединения при перезагрузке страницы
    reconnect() {
        const savedPlayerId = localStorage.getItem('monopolyPlayerId');
        const savedGameId = localStorage.getItem('monopolyGameId');
        
        if (savedPlayerId && savedGameId) {
            this.playerId = savedPlayerId;
            this.gameId = savedGameId;
            console.log('Reconnecting to game:', savedGameId);
        }
    }
}

const socketManager = new SocketManager();
socketManager.reconnect(); // Попробуем восстановить соединение