class Game {
  constructor(id, lobby) {
    this.id = id;
    this.lobbyId = lobby.id;
    this.players = lobby.players;
    this.currentTurn = 0;
    this.status = 'waiting'; // waiting, active, finished
    this.createdAt = new Date();
    this.deck = [];
    this.discardPile = [];
    this.turnPhase = 'draw'; // draw, action, end
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