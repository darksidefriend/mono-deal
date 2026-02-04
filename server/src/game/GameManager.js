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
    
    // Выдаем первые 2 карты первому игроку
    this.drawCardsForPlayer(game, 2);
    
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

  drawCardsForPlayer(game, count = 2) {
    const player = game.getCurrentPlayer();
    
    for (let i = 0; i < count; i++) {
      if (game.deck.length === 0) {
        // Перемешиваем сброс в колоду
        this.reshuffleDiscardPile(game);
      }
      
      if (game.deck.length > 0) {
        const card = game.deck.pop();
        player.hand.push(card);
      }
    }
    
    game.turnPhase = 'main';
    return player.hand.slice(-count);
  }

  reshuffleDiscardPile(game) {
    if (game.discardPile.length === 0) return;
    
    // Берем все карты из сброса, кроме верхней
    const newDeck = [...game.discardPile];
    game.discardPile = [];
    game.deck = newDeck;
    
    // Перемешиваем
    for (let i = game.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [game.deck[i], game.deck[j]] = [game.deck[j], game.deck[i]];
    }
  }

  getGame(gameId) {
    return this.games.get(gameId);
  }

  endGame(gameId) {
    this.games.delete(gameId);
  }

  endTurn(game) {
  // Находим текущего игрока
  const currentIndex = game.players.findIndex(p => p.id === game.currentPlayerId);
  if (currentIndex === -1) {
    throw new Error('Текущий игрок не найден');
  }
  
  // Сбрасываем использованные действия текущего игрока
  const currentPlayer = game.players[currentIndex];
  currentPlayer.actionsUsed = 0;
  
  // Определяем следующего игрока
  const nextIndex = (currentIndex + 1) % game.players.length;
  const nextPlayer = game.players[nextIndex];
  
  // Устанавливаем следующего игрока текущим
  game.currentPlayerId = nextPlayer.id;
  
  // Сбрасываем actionPoints для следующего игрока
  nextPlayer.actionPoints = 3;
  nextPlayer.actionsUsed = 0;
  
  // Переходим в фазу розыгрыша
  game.turnPhase = 'draw';
  
  // Выдаем 2 карты следующему игроку
  this.drawCardsForPlayer(game, 2);
  
  // Добавляем в историю
  game.addToHistory({
    type: 'end_turn',
    playerId: currentPlayer.id,
    playerName: currentPlayer.name,
    nextPlayerId: nextPlayer.id,
    nextPlayerName: nextPlayer.name
  });
  
  return nextPlayer.id;
}

  // Основные игровые действия

  // 1. Положить деньги в банк
  putMoneyInBank(game, playerId, cardIndex) {
    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Игрок не найден');
    
    // Проверяем, что это ход игрока
    if (player.id !== game.getCurrentPlayer().id) {
      throw new Error('Не ваш ход');
    }
    
    // Проверяем, что есть доступные действия
    if (player.actionsUsed >= player.actionPoints) {
      throw new Error('Нет доступных действий');
    }
    
    // Проверяем, что карта существует
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      throw new Error('Неверный индекс карты');
    }
    
    const card = player.hand[cardIndex];
    
    // Проверяем, что это карта денег
    if (card.type !== 'money') {
      throw new Error('Можно положить в банк только деньги');
    }
    
    // Перемещаем карту из руки в банк
    player.hand.splice(cardIndex, 1);
    player.bank.push(card);
    player.actionsUsed += 1;
    
    // Добавляем в историю
    game.addToHistory({
      type: 'money_to_bank',
      playerId: playerId,
      playerName: player.name,
      card: card,
      actionsLeft: player.actionPoints - player.actionsUsed
    });
    
    return {
      success: true,
      card,
      actionsLeft: player.actionPoints - player.actionsUsed,
      handSize: player.hand.length,
      bankValue: this.calculateBankValue(player.bank)
    };
  }
  
  // 2. Завершить ход
  endTurn(game) {
    const currentPlayer = game.getCurrentPlayer();
    
    // Проверяем, что в руке не больше 7 карт
    if (currentPlayer.hand.length > 7) {
      throw new Error('У вас слишком много карт в руке. Сбросьте лишние карты.');
    }
    
    const nextPlayer = game.nextTurn();
    
    // Выдаем 2 карты следующему игроку
    const drawnCards = this.drawCardsForPlayer(game, 2);
    
    return {
      success: true,
      nextPlayer: {
        id: nextPlayer.id,
        name: nextPlayer.name
      },
      drawnCardsCount: drawnCards.length,
      actionPoints: nextPlayer.actionPoints
    };
  }
  
  // 3. Сбросить карту
  discardCard(game, playerId, cardIndex) {
    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Игрок не найден');
    
    // Проверяем, что карта существует
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      throw new Error('Неверный индекс карты');
    }
    
    const card = player.hand[cardIndex];
    
    // Перемещаем карту из руки в сброс
    player.hand.splice(cardIndex, 1);
    game.discardPile.push(card);
    
    // Добавляем в историю
    game.addToHistory({
      type: 'discard',
      playerId: playerId,
      playerName: player.name,
      card: card
    });
    
    return {
      success: true,
      card,
      handSize: player.hand.length
    };
  }
  
  // Вспомогательные методы
  calculateBankValue(bank) {
    return bank.reduce((total, card) => total + (card.value || 0), 0);
  }

  getGameState(gameId, playerId) {
    const game = this.getGame(gameId);
    if (!game) return null;

    const player = game.players.find(p => p.id === playerId);
    
    return {
      gameId: game.id,
      status: game.status,
      currentTurn: game.currentTurn,
      turnPhase: game.turnPhase,
      currentPlayerId: game.getCurrentPlayer().id,
      currentPlayerName: game.getCurrentPlayer().name,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        properties: p.properties,
        bank: p.bank,
        bankValue: this.calculateBankValue(p.bank),
        handSize: p.hand.length,
        actionPoints: p.actionPoints,
        actionsUsed: p.actionsUsed,
        isCurrentPlayer: p.id === player?.id ? p.id === game.getCurrentPlayer().id : false
      })),
      ownHand: player ? player.hand : [],
      ownActionPoints: player ? player.actionPoints : 0,
      ownActionsUsed: player ? player.actionsUsed : 0,
      deckSize: game.deck.length,
      discardPileSize: game.discardPile.length,
      discardPileTop: game.discardPile[game.discardPile.length - 1] || null,
      actionsHistory: game.actionsHistory.slice(-10) // Последние 10 действий
    };
  }
}

module.exports = GameManager;