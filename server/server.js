const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const Game = require('./game/Game');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

const games = new Map(); // roomId -> Game
const players = new Map(); // socketId -> {roomId, playerId}

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('createGame', (playerName) => {
        const roomId = generateRoomId();
        const game = new Game(roomId);
        const playerId = game.addPlayer(playerName, socket.id);
        
        games.set(roomId, game);
        players.set(socket.id, { roomId, playerId });
        
        socket.join(roomId);
        socket.emit('gameCreated', { roomId, playerId, game: game.getState() });
    });

    socket.on('joinGame', ({ roomId, playerName }) => {
        const game = games.get(roomId);
        if (!game) {
            socket.emit('error', 'Game not found');
            return;
        }
        
        if (game.players.length >= 5) {
            socket.emit('error', 'Game is full');
            return;
        }
        
        const playerId = game.addPlayer(playerName, socket.id);
        players.set(socket.id, { roomId, playerId });
        
        socket.join(roomId);
        io.to(roomId).emit('playerJoined', { playerId, game: game.getState() });
    });

    socket.on('playCard', ({ cardId, targetPlayerId, propertyColor, useDoubleRent }) => {
        const playerData = players.get(socket.id);
        if (!playerData) return;
        
        const { roomId, playerId } = playerData;
        const game = games.get(roomId);
        
        if (!game || game.currentPlayerId !== playerId) return;
        
        const result = game.playCard(playerId, cardId, { 
            targetPlayerId, 
            propertyColor, 
            useDoubleRent 
        });
        
        if (result.success) {
            io.to(roomId).emit('gameUpdate', game.getState());
            
            // Если требуется оплата
            if (result.requiresPayment) {
                result.targets.forEach(target => {
                    io.to(target.socketId).emit('requestPayment', {
                        fromPlayerId: playerId,
                        amount: target.amount,
                        rentColor: result.rentColor,
                        canSayNo: true
                    });
                });
            }
        }
    });

    socket.on('payWithCards', ({ paymentCards, sayNoCardId }) => {
        const playerData = players.get(socket.id);
        if (!playerData) return;
        
        const { roomId, playerId } = playerData;
        const game = games.get(roomId);
        
        if (!game) return;
        
        const result = game.processPayment(playerId, paymentCards, sayNoCardId);
        
        if (result.success) {
            if (result.requiresCounterNo) {
                // Запрос на контратаку "Нет"
                const attackerSocketId = game.getPlayerSocketId(result.attackerId);
                io.to(attackerSocketId).emit('requestCounterNo', {
                    targetPlayerId: playerId,
                    originalCard: result.originalCard
                });
            } else {
                io.to(roomId).emit('gameUpdate', game.getState());
            }
        }
    });

    socket.on('endTurn', () => {
        const playerData = players.get(socket.id);
        if (!playerData) return;
        
        const { roomId, playerId } = playerData;
        const game = games.get(roomId);
        
        if (!game || game.currentPlayerId !== playerId) return;
        
        game.endTurn(playerId);
        io.to(roomId).emit('gameUpdate', game.getState());
        
        // Даем следующему игроку карты
        const nextPlayer = game.getCurrentPlayer();
        io.to(nextPlayer.socketId).emit('yourTurn');
    });

    socket.on('discardCards', (cardIds) => {
        const playerData = players.get(socket.id);
        if (!playerData) return;
        
        const { roomId, playerId } = playerData;
        const game = games.get(roomId);
        
        if (!game) return;
        
        game.discardCards(playerId, cardIds);
        io.to(roomId).emit('gameUpdate', game.getState());
    });

    socket.on('changeWildCardColor', ({ cardId, newColor }) => {
        const playerData = players.get(socket.id);
        if (!playerData) return;
        
        const { roomId, playerId } = playerData;
        const game = games.get(roomId);
        
        if (!game) return;
        
        game.changeWildCardColor(playerId, cardId, newColor);
        io.to(roomId).emit('gameUpdate', game.getState());
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        const playerData = players.get(socket.id);
        if (playerData) {
            const { roomId, playerId } = playerData;
            const game = games.get(roomId);
            
            if (game) {
                game.removePlayer(playerId);
                io.to(roomId).emit('playerLeft', { playerId });
                
                if (game.players.length === 0) {
                    games.delete(roomId);
                }
            }
            
            players.delete(socket.id);
        }
    });
});

function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});