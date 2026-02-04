const { v4: uuidv4 } = require('uuid');
const Game = require('../models/Game');
const CardManager = require('./CardManager');

class GameManager {
  constructor() {
    this.games = new Map();
  }

  createGame(lobby) {
    const gameId = uuidv4();
    const game = new Game(gameId, lobby);
    
    // Инициализируем колоду карт
    const cardManager = new CardManager();
    game.deck = cardManager.deck;
    game.discardPile = cardManager.discardPile;
    
    // Раздаем начальные карты
    this.dealInitialCards(game);
    
    this.games.set(gameId, game);
    return game;
  }

  dealInitialCards(game) {
    game.players.forEach(player => {
      // Каждый игрок получает 5 карт
      player.hand = [];
      for (let i = 0; i < 5; i++) {
        if (game.deck.length > 0) {
          player.hand.push(game.deck.pop());
        }
      }
    });
  }

  getGame(gameId) {
    return this.games.get(gameId);
  }

  endGame(gameId) {
    this.games.delete(gameId);
  }

  getGameState(gameId, playerId) {
    const game = this.getGame(gameId);
    if (!game) return null;

    // Создаем безопасное представление игры для конкретного игрока
    const player = game.players.find(p => p.id === playerId);
    
    return {
      gameId: game.id,
      status: game.status,
      currentTurn: game.currentTurn,
      turnPhase: game.turnPhase,
      currentPlayerId: game.players[game.currentTurn]?.id,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        properties: p.properties,
        bank: p.bank,
        handSize: p.hand.length,
        isCurrentPlayer: p.id === player?.id ? p.id === game.players[game.currentTurn]?.id : false
      })),
      ownHand: player ? player.hand : [],
      deckSize: game.deck.length,
      discardPileTop: game.discardPile[game.discardPile.length - 1] || null
    };
  }
}

module.exports = GameManager;