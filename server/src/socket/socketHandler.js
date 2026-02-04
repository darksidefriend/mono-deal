const { v4: uuidv4 } = require('uuid');
const LobbyManager = require('../game/LobbyManager');
const GameManager = require('../game/GameManager');
const Player = require('../models/Player');

let lobbyManager = new LobbyManager();
let gameManager = new GameManager();


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
      console.log('📥 Присоединение к лобби:', data);
      
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
      
      console.log(`✅ Игрок ${player.name} присоединился к лобби ${lobby.name}`);
      
      // Уведомляем всех в лобби о новом игроке
      io.to(`lobby_${data.lobbyId}`).emit('lobby_updated', lobby.toJSON());
      
      // Обновляем список лобби для всех
      io.to('lobby').emit('lobbies_updated', lobbyManager.getPublicLobbies());
      
    } catch (error) {
      console.error('❌ Ошибка при присоединении к лобби:', error.message);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('leave_game', () => {
    try {
      if (socket.gameId && socket.playerId) {
        const game = gameManager.getGame(socket.gameId);
        if (game) {
          socket.leave(`game_${socket.gameId}`);
          console.log(`Игрок ${socket.playerId} покинул игру ${socket.gameId}`);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка при покидании игры:', error.message);
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
  // В обработчике start_game обновим логику
  socket.on('start_game', () => {
    try {
      if (!socket.lobbyId || !socket.playerId) {
        throw new Error('Not in lobby');
      }

      const lobby = lobbyManager.getLobby(socket.lobbyId);
      if (!lobby) {
        throw new Error('Lobby not found');
      }

      if (lobby.creatorId !== socket.playerId) {
        throw new Error('Only creator can start the game');
      }

      if (lobby.players.length < 2) {
        throw new Error('Need at least 2 players to start');
      }

      const allReady = lobby.players.every(player => player.isReady);
      if (!allReady) {
        throw new Error('Not all players are ready');
      }

      // Создаем игру
      const game = gameManager.createGame(lobby);
      lobby.gameStarted = true;
      
      console.log(`🎲 Создание игры для лобби ${lobby.id}, ID игры: ${game.id}`);
      
      // Уведомляем всех игроков о начале игры
      lobby.players.forEach(player => {
        console.log(`Отправка game_starting игроку ${player.name} (${player.socketId})`);
        
        // Отправляем каждому игроку индивидуальное сообщение с его ID
        io.to(player.socketId).emit('game_starting', {
          gameId: game.id,
          playerId: player.id,
          redirectUrl: `/game.html?gameId=${game.id}&playerId=${player.id}`
        });
      });
      
      // Обновляем список лобби для остальных
      io.to('lobby').emit('lobbies_updated', lobbyManager.getPublicLobbies());
      
      console.log(`🎮 Игра ${game.id} запущена в лобби ${lobby.name}`);
    } catch (error) {
      console.error('❌ Ошибка при начале игры:', error.message);
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

   socket.on('join_game', (data) => {
    try {
      console.log('🎮 Присоединение к игре:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        // Создаем временную игру для тестирования
        console.log('⚠️ Игра не найдена, создаем тестовую игру');
        const testGame = {
          id: data.gameId,
          players: [
            { id: data.playerId, name: 'Игрок 1', hand: [], bank: [], properties: [], handSize: 5 },
            { id: 'player2', name: 'Игрок 2', hand: [], bank: [], properties: [], handSize: 5 }
          ],
          currentPlayerId: data.playerId,
          turnPhase: 'draw',
          deckSize: 30
        };
        
        // Отправляем тестовое состояние
        socket.emit('game_state', testGame);
        return;
      }
      
      const player = game.players.find(p => p.id === data.playerId);
      if (!player) {
        throw new Error('Player not in this game');
      }
      
      // Обновляем socketId игрока
      player.socketId = socket.id;
      
      socket.join(`game_${data.gameId}`);
      socket.gameId = data.gameId;
      socket.playerId = data.playerId;
      
      // Отправляем состояние игры игроку
      const gameState = gameManager.getGameState(data.gameId, data.playerId);
      socket.emit('game_state', gameState);
      
      // Уведомляем других игроков о подключении
      socket.to(`game_${data.gameId}`).emit('player_reconnected', {
        playerId: data.playerId,
        name: player.name
      });
      
      console.log(`✅ Игрок ${player.name} присоединился к игре ${data.gameId}`);
    } catch (error) {
      console.error('❌ Ошибка при присоединении к игре:', error.message);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('play_card', (data) => {
    try {
      console.log('🃏 Игрок играет карту:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      // Здесь будет логика обработки карты
      // Пока просто уведомляем всех игроков
      
      const player = game.players.find(p => p.id === data.playerId);
      if (player) {
        // Уведомляем всех игроков о сыгранной карте
        io.to(`game_${data.gameId}`).emit('card_played', {
          playerId: data.playerId,
          playerName: player.name,
          cardId: data.cardId
        });
        
        // Добавляем сообщение в лог
        io.to(`game_${data.gameId}`).emit('game_update', {
          message: `${player.name} сыграл карту`
        });
      }
    } catch (error) {
      console.error('❌ Ошибка при игре карты:', error.message);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('put_money_in_bank', (data) => {
    try {
      console.log('💰 Игрок хочет положить деньги в банк:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      const result = gameManager.putMoneyInBank(game, data.playerId, data.cardIndex);
      
      // Отправляем обновление всем игрокам
      const updateData = {
        type: 'money_to_bank',
        playerId: data.playerId,
        playerName: game.players.find(p => p.id === data.playerId)?.name,
        card: result.card,
        actionsLeft: result.actionsLeft,
        bankValue: result.bankValue
      };
      
      // Отправляем полное обновление состояния игры
      game.players.forEach(player => {
        const gameState = gameManager.getGameState(data.gameId, player.id);
        io.to(player.socketId).emit('game_update', {
          type: 'state_update',
          state: gameState
        });
      });
      
      // Отправляем сообщение в лог
      io.to(`game_${data.gameId}`).emit('game_update', {
        type: 'log_message',
        message: `${updateData.playerName} положил(а) ${result.card.name} в банк`
      });
      
    } catch (error) {
      console.error('❌ Ошибка при попытке положить деньги в банк:', error.message);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('end_turn', (data) => {
    try {
      console.log('🔄 Игрок завершает ход:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        throw new Error('Игра не найдена');
      }
      
      // Проверяем, что игрок существует в игре
      const player = game.players.find(p => p.id === data.playerId);
      if (!player) {
        throw new Error('Игрок не найден в игре');
      }
      
      // Проверяем, что это ход текущего игрока
      if (game.currentPlayerId !== data.playerId) {
        console.warn(`⚠️ Игрок ${player.name} пытается завершить не свой ход. Текущий игрок: ${game.currentPlayerId}`);
        // Не кидаем ошибку, просто игнорируем
        return;
      }
      
      // Завершаем ход
      const nextPlayerId = gameManager.endTurn(game);
      const nextPlayer = game.players.find(p => p.id === nextPlayerId);
      
      if (!nextPlayer) {
        throw new Error('Не удалось определить следующего игрока');
      }
      
      console.log(`✅ Ход завершен. Текущий игрок: ${player.name}, следующий: ${nextPlayer.name}`);
      
      // Отправляем сообщение о смене хода всем игрокам
      io.to(`game_${data.gameId}`).emit('turn_changed', {
        previousPlayerId: data.playerId,
        previousPlayerName: player.name,
        currentPlayerId: nextPlayer.id,
        currentPlayerName: nextPlayer.name
      });
      
      // Отправляем обновление состояния игры всем игрокам
      game.players.forEach(p => {
        const gameState = gameManager.getGameState(data.gameId, p.id);
        io.to(p.socketId).emit('game_update', {
          type: 'state_update',
          state: gameState
        });
      });
      
      // Отправляем сообщение в лог
      io.to(`game_${data.gameId}`).emit('game_update', {
        type: 'log_message',
        message: `${player.name} завершает ход. Ход переходит к ${nextPlayer.name}`
      });
      
    } catch (error) {
      console.error('❌ Ошибка при завершении хода:', error.message);
      // Не отправляем ошибку клиенту, чтобы не показывать alert
      // socket.emit('error', { message: error.message });
    }
  });

  socket.on('play_property_card', (data) => {
    try {
      console.log('🏠 Игрок играет карту собственности:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        throw new Error('Игра не найдена');
      }
      
      // TODO: Добавить логику для собственности
      const player = game.players.find(p => p.id === data.playerId);
      
      // Временная заглушка
      io.to(`game_${data.gameId}`).emit('game_update', {
        type: 'log_message',
        message: `${player.name} играет карту собственности`
      });
      
    } catch (error) {
      console.error('❌ Ошибка при игре карты собственности:', error.message);
    }
  });

  socket.on('play_action_card', (data) => {
    try {
      console.log('🎭 Игрок играет карту действия:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        throw new Error('Игра не найдена');
      }
      
      // TODO: Добавить логику для действий
      const player = game.players.find(p => p.id === data.playerId);
      
      // Временная заглушка
      io.to(`game_${data.gameId}`).emit('game_update', {
        type: 'log_message',
        message: `${player.name} играет карту действия: ${data.cardName}`
      });
      
    } catch (error) {
      console.error('❌ Ошибка при игре карты действия:', error.message);
    }
  });

  socket.on('play_rent_card', (data) => {
    try {
      console.log('💰 Игрок играет карту аренды:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        throw new Error('Игра не найдена');
      }
      
      // TODO: Добавить логику для аренды
      const player = game.players.find(p => p.id === data.playerId);
      
      // Временная заглушка
      io.to(`game_${data.gameId}`).emit('game_update', {
        type: 'log_message',
        message: `${player.name} играет карту аренды`
      });
      
    } catch (error) {
      console.error('❌ Ошибка при игре карты аренды:', error.message);
    }
  });

  socket.on('play_building_card', (data) => {
    try {
      console.log('🏢 Игрок играет карту здания:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        throw new Error('Игра не найдена');
      }
      
      // TODO: Добавить логику для зданий
      const player = game.players.find(p => p.id === data.playerId);
      
      // Временная заглушка
      io.to(`game_${data.gameId}`).emit('game_update', {
        type: 'log_message',
        message: `${player.name} играет карту здания`
      });
      
    } catch (error) {
      console.error('❌ Ошибка при игре карты здания:', error.message);
    }
  });

  socket.on('play_wild_card', (data) => {
    try {
      console.log('🎴 Игрок играет универсальную карту:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        throw new Error('Игра не найдена');
      }
      
      // TODO: Добавить логику для универсальных карт
      const player = game.players.find(p => p.id === data.playerId);
      
      // Временная заглушка
      io.to(`game_${data.gameId}`).emit('game_update', {
        type: 'log_message',
        message: `${player.name} играет универсальную карту`
      });
      
    } catch (error) {
      console.error('❌ Ошибка при игре универсальной карты:', error.message);
    }
  });

  socket.on('discard_card', (data) => {
    try {
      console.log('🗑️ Игрок хочет сбросить карту:', data);
      
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      const result = gameManager.discardCard(game, data.playerId, data.cardIndex);
      
      // Отправляем обновление состояния игры
      const player = game.players.find(p => p.id === data.playerId);
      if (player) {
        const gameState = gameManager.getGameState(data.gameId, player.id);
        io.to(player.socketId).emit('game_update', {
          type: 'state_update',
          state: gameState
        });
        
        // Отправляем сообщение в лог
        io.to(`game_${data.gameId}`).emit('game_update', {
          type: 'log_message',
          message: `${player.name} сбросил(а) карту`
        });
      }
      
    } catch (error) {
      console.error('❌ Ошибка при сбросе карты:', error.message);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    
    // Обработка отключения из лобби
    if (socket.lobbyId && socket.playerId) {
      const lobby = lobbyManager.getLobby(socket.lobbyId);
      if (lobby) {
        const player = lobby.players.find(p => p.id === socket.playerId);
        if (player) {
          player.isConnected = false;
          io.to(`lobby_${socket.lobbyId}`).emit('lobby_updated', lobby.toJSON());
        }
      }
    }
    
    // Обработка отключения из игры
    if (socket.gameId && socket.playerId) {
      const game = gameManager.getGame(socket.gameId);
      if (game) {
        const player = game.players.find(p => p.id === socket.playerId);
        if (player) {
          player.isConnected = false;
          io.to(`game_${socket.gameId}`).emit('player_disconnected', {
            playerId: socket.playerId
          });
        }
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