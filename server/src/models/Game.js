class Game {
  constructor(id, lobby) {
    this.id = id;
    this.lobbyId = lobby.id;
    this.players = lobby.players.map((player, index) => ({
      ...player,
      turnOrder: index,
      hand: [],
      bank: [],
      properties: [],
      actionPoints: 3,
      actionsUsed: 0
    }));
    this.currentTurn = 0;
    this.status = 'active';
    this.createdAt = new Date();
    this.deck = [];
    this.discardPile = [];
    this.turnPhase = 'draw'; // draw, main, end
    this.actionsHistory = [];
  }
  
  getCurrentPlayer() {
    return this.players[this.currentTurn];
  }
  
  nextTurn() {
    this.currentTurn = (this.currentTurn + 1) % this.players.length;
    const currentPlayer = this.getCurrentPlayer();
    currentPlayer.actionPoints = 3;
    currentPlayer.actionsUsed = 0;
    this.turnPhase = 'draw';
    return currentPlayer;
  }
  
  addToHistory(action) {
    this.actionsHistory.push({
      ...action,
      timestamp: new Date()
    });
  }
  
  toJSON() {
    return {
      id: this.id,
      lobbyId: this.lobbyId,
      status: this.status,
      currentTurn: this.currentTurn,
      turnPhase: this.turnPhase,
      playerCount: this.players.length,
      createdAt: this.createdAt
    };
  }
}

module.exports = Game;