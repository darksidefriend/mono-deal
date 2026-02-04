const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const Game = require('./game/Game');
const { CARD_DATA } = require('./utils/constants');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('../client/public'));

const games = new Map();
const players = new Map(); // socket.id -> {gameId, playerId}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('createGame', (playerName) => {
    try {
      console.log('Creating game for:', playerName);
      const gameId = generateGameId();
      const game = new Game(gameId);
      games.set(gameId, game);
      
      const player = game.addPlayer(socket.id, playerName);
      players.set(socket.id, { gameId, playerId: player.id });
      
      socket.join(gameId);
      socket.emit('gameCreated', { gameId, playerId: player.id });
      
      console.log(`Game ${gameId} created by ${playerName}`);
      console.log(`Players in game: ${game.players.length}`);
      
      // Отправляем состояние игры всем в комнате (пока только создателю)
      updateGameState(gameId);
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('error', error.message);
    }
  });

  socket.on('joinGame', ({ gameId, playerName }) => {
    try {
      console.log(`Player ${playerName} trying to join game ${gameId}`);
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', 'Игра не найдена');
        return;
      }
      
      if (game.players.length >= 5) {
        socket.emit('error', 'Игра заполнена (максимум 5 игроков)');
        return;
      }
      
      const player = game.addPlayer(socket.id, playerName);
      players.set(socket.id, { gameId, playerId: player.id });
      
      socket.join(gameId);
      socket.emit('gameJoined', { gameId, playerId: player.id });
      
      console.log(`Player ${playerName} joined game ${gameId}`);
      console.log(`Now ${game.players.length} players in game`);
      
      // Отправляем обновленное состояние ВСЕМ игрокам в комнате
      updateGameState(gameId);
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', error.message);
    }
  });

  socket.on('startGame', () => {
  try {
    const playerData = players.get(socket.id);
    if (!playerData) {
      socket.emit('error', 'Игрок не найден');
      return;
    }
    
    const game = games.get(playerData.gameId);
    if (!game) {
      socket.emit('error', 'Игра не найдена');
      return;
    }
    
    if (game.players.length < 2) {
      socket.emit('error', 'Нужно минимум 2 игрока для начала игры');
      return;
    }
    
    // Проверяем, что игра еще не начата
    if (game.started) {
      socket.emit('error', 'Игра уже начата');
      return;
    }
    
    const started = game.startGame();
    if (started) {
      console.log(`Game ${game.id} started`);
      
      // Отправляем обновленное состояние всем игрокам
      updateGameState(game.id);
    }
  } catch (error) {
    console.error('Error starting game:', error);
    socket.emit('error', error.message);
  }
});

  socket.on('playCard', ({ cardId, targetPlayerId, propertySetId, selectedColor, isDouble }) => {
    const playerData = players.get(socket.id);
    if (!playerData) return;

    const game = games.get(playerData.gameId);
    if (!game || game.currentPlayer !== playerData.playerId) return;

    try {
        game.playCard(playerData.playerId, cardId, {
            targetPlayerId,
            propertySetId,
            selectedColor,
            isDouble
        });
        // После игры карты обновляем состояние
        updateGameState(game.id);
    } catch (error) {
        console.error('Error playing card:', error);
        socket.emit('error', error.message);
    }
});

socket.on('respondToRent', (response) => {
    const playerData = players.get(socket.id);
    if (!playerData) return;

    const game = games.get(playerData.gameId);
    if (!game) return;

    try {
        game.handleRentResponse(playerData.playerId, response);
        // После ответа на ренту обновляем состояние
        updateGameState(game.id);
    } catch (error) {
        console.error('Error responding to rent:', error);
        socket.emit('error', error.message);
    }
});

    socket.on('endTurn', () => {
      const playerData = players.get(socket.id);
      if (!playerData) return;

      const game = games.get(playerData.gameId);
      if (!game || game.currentPlayer !== playerData.playerId) return;

      try {
          game.endTurn();
          // После завершения хода обновляем состояние
          updateGameState(game.id);
      } catch (error) {
          console.error('Error ending turn:', error);
          socket.emit('error', error.message);
      }
  });

socket.on('sayNo', () => {
    const playerData = players.get(socket.id);
    if (!playerData) return;

    const game = games.get(playerData.gameId);
    if (!game) return;

    try {
        game.playSayNo(playerData.playerId);
        // После использования "Нет" обновляем состояние
        updateGameState(game.id);
    } catch (error) {
        console.error('Error saying no:', error);
        socket.emit('error', error.message);
    }
});

  socket.on('payRent', (cards) => {
    try {
      const playerData = players.get(socket.id);
      if (!playerData) return;
      
      const game = games.get(playerData.gameId);
      if (!game) return;
      
      game.payRent(playerData.playerId, cards);
      updateGameState(game.id);
    } catch (error) {
      console.error('Error paying rent:', error);
      socket.emit('error', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    const playerData = players.get(socket.id);
    if (playerData) {
      const game = games.get(playerData.gameId);
      if (game) {
        game.removePlayer(playerData.playerId);
        if (game.players.length === 0) {
          games.delete(game.id);
          console.log(`Game ${game.id} deleted (no players left)`);
        } else {
          updateGameState(game.id);
        }
      }
      players.delete(socket.id);
    }
  });

  function updateGameState(gameId) {
    const game = games.get(gameId);
    if (!game) {
      console.log(`Game ${gameId} not found for update`);
      return;
    }
    
    const gameState = game.getState();
    console.log(`Updating game ${gameId}, players: ${game.players.length}, currentPlayer: ${game.currentPlayer}, turnPhase: ${game.turnPhase}`);
    
    // Логируем информацию о картах каждого игрока
    game.players.forEach(player => {
      console.log(`Player ${player.name}: ${player.hand.length} cards in hand`);
    });
    
    io.to(gameId).emit('gameUpdate', gameState);
    
    const winner = game.checkWinner();
    if (winner) {
      console.log(`Game ${gameId} over, winner: ${winner.name}`);
      io.to(gameId).emit('gameOver', { winner: winner.getState() });
    }
  }
});

function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});