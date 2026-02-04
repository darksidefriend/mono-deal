const { v4: uuidv4 } = require('uuid');
const LobbyManager = require('../game/LobbyManager');
const Player = require('../models/Player');

let lobbyManager = new LobbyManager();

module.exports = (io, socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Инициализация игрока
  socket.on('register_player', (playerData) => {
    try {
      const playerId = uuidv4();
      const player = new Player(playerId, playerData.name, socket.id);
      
      socket.playerId = playerId;
      socket.join('lobby'); // Присоединяем к общей комнате лобби
      
      // Отправляем информацию о текущих лобби и игроках
      socket.emit('player_registered', {
        playerId,
        name: player.name,
        lobbies: lobbyManager.getPublicLobbies(),
        onlinePlayers: lobbyManager.getOnlinePlayers()
      });
      
      // Уведомляем других о новом игроке
      socket.to('lobby').emit('player_joined', {
        playerId,
        name: player.name
      });
      
      console.log(`Player registered: ${player.name} (${playerId})`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Создание нового лобби
  socket.on('create_lobby', (lobbyData) => {
    try {
      if (!socket.playerId) {
        throw new Error('Player not registered');
      }

      const lobbyId = uuidv4();
      const player = new Player(socket.playerId, lobbyData.playerName, socket.id);
      
      const lobby = lobbyManager.createLobby(
        lobbyId,
        lobbyData.name,
        socket.playerId,
        lobbyData.maxPlayers
      );
      
      lobby.addPlayer(player);
      socket.join(`lobby_${lobbyId}`);
      socket.lobbyId = lobbyId;
      
      // Отправляем создателю информацию о лобби
      socket.emit('lobby_created', {
        lobby: lobby.toJSON(),
        success: true
      });
      
      // Уведомляем всех в лобби о новом игроке
      io.to(`lobby_${lobbyId}`).emit('lobby_updated', lobby.toJSON());
      
      // Обновляем список лобби для всех
      io.to('lobby').emit('lobbies_updated', lobbyManager.getPublicLobbies());
      
      console.log(`Lobby created: ${lobby.name} (${lobbyId}) by ${player.name}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Присоединение к лобби
  socket.on('join_lobby', (data) => {
    try {
      if (!socket.playerId) {
        throw new Error('Player not registered');
      }

      const lobby = lobbyManager.getLobby(data.lobbyId);
      if (!lobby) {
        throw new Error('Lobby not found');
      }

      if (lobby.gameStarted) {
        throw new Error('Game already started');
      }

      const player = new Player(socket.playerId, data.playerName, socket.id);
      lobby.addPlayer(player);
      
      socket.join(`lobby_${data.lobbyId}`);
      socket.lobbyId = data.lobbyId;
      
      // Уведомляем всех в лобби о новом игроке
      io.to(`lobby_${data.lobbyId}`).emit('lobby_updated', lobby.toJSON());
      
      // Обновляем список лобби для всех
      io.to('lobby').emit('lobbies_updated', lobbyManager.getPublicLobbies());
      
      console.log(`Player ${player.name} joined lobby ${lobby.name}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Выход из лобби
  socket.on('leave_lobby', () => {
    try {
      if (!socket.lobbyId || !socket.playerId) {
        return;
      }

      const lobby = lobbyManager.getLobby(socket.lobbyId);
      if (lobby) {
        lobby.removePlayer(socket.playerId);
        socket.leave(`lobby_${socket.lobbyId}`);
        
        // Если лобби пустое - удаляем его
        if (lobby.players.length === 0) {
          lobbyManager.removeLobby(socket.lobbyId);
          io.to('lobby').emit('lobbies_updated', lobbyManager.getPublicLobbies());
        } else {
          // Иначе обновляем информацию о лобби
          io.to(`lobby_${socket.lobbyId}`).emit('lobby_updated', lobby.toJSON());
          io.to('lobby').emit('lobbies_updated', lobbyManager.getPublicLobbies());
        }
        
        socket.lobbyId = null;
        console.log(`Player left lobby ${lobby.name}`);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Готовность игрока
  socket.on('player_ready', (isReady) => {
    try {
      if (!socket.lobbyId || !socket.playerId) {
        return;
      }

      const lobby = lobbyManager.getLobby(socket.lobbyId);
      if (lobby) {
        const player = lobby.players.find(p => p.id === socket.playerId);
        if (player) {
          player.isReady = isReady;
          
          io.to(`lobby_${socket.lobbyId}`).emit('lobby_updated', lobby.toJSON());
          
          // Проверяем, все ли готовы для старта игры
          checkAllPlayersReady(io, lobby);
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Начало игры
  socket.on('start_game', () => {
    try {
      if (!socket.lobbyId || !socket.playerId) {
        throw new Error('Not in lobby');
      }

      const lobby = lobbyManager.getLobby(socket.lobbyId);
      if (!lobby) {
        throw new Error('Lobby not found');
      }

      // Проверяем, что игрок - создатель лобби
      if (lobby.creatorId !== socket.playerId) {
        throw new Error('Only creator can start the game');
      }

      // Проверяем, что минимум 2 игрока
      if (lobby.players.length < 2) {
        throw new Error('Need at least 2 players to start');
      }

      // Проверяем, что все готовы
      const allReady = lobby.players.every(player => player.isReady);
      if (!allReady) {
        throw new Error('Not all players are ready');
      }

      lobby.gameStarted = true;
      
      // Уведомляем всех игроков о начале игры
      io.to(`lobby_${socket.lobbyId}`).emit('game_starting', {
        lobbyId: socket.lobbyId,
        players: lobby.players.map(p => ({
          id: p.id,
          name: p.name
        })),
        redirectUrl: `/game/${socket.lobbyId}`
      });
      
      // Обновляем список лобби для остальных
      io.to('lobby').emit('lobbies_updated', lobbyManager.getPublicLobbies());
      
      console.log(`Game starting in lobby ${lobby.name}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Запрос списка лобби
  socket.on('get_lobbies', () => {
    socket.emit('lobbies_updated', lobbyManager.getPublicLobbies());
  });

  // Отключение игрока
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    
    // Если игрок был в лобби - удаляем его
    if (socket.lobbyId && socket.playerId) {
      const lobby = lobbyManager.getLobby(socket.lobbyId);
      if (lobby) {
        lobby.removePlayer(socket.playerId);
        
        if (lobby.players.length === 0) {
          lobbyManager.removeLobby(socket.lobbyId);
        } else {
          io.to(`lobby_${socket.lobbyId}`).emit('lobby_updated', lobby.toJSON());
        }
        
        io.to('lobby').emit('lobbies_updated', lobbyManager.getPublicLobbies());
      }
    }
    
    // Уведомляем всех об отключении игрока
    socket.to('lobby').emit('player_left', { playerId: socket.playerId });
  });
};

// Вспомогательная функция для проверки готовности всех игроков
function checkAllPlayersReady(io, lobby) {
  const allReady = lobby.players.length >= 2 && 
                   lobby.players.every(player => player.isReady);
  
  if (allReady) {
    io.to(`lobby_${lobby.id}`).emit('all_players_ready', true);
  }
}