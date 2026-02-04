class Lobby {
  constructor(id, name, creatorId, maxPlayers = 5) {
    this.id = id;
    this.name = name;
    this.creatorId = creatorId;
    this.players = [];
    this.maxPlayers = maxPlayers;
    this.gameStarted = false;
    this.createdAt = new Date();
  }
  
  addPlayer(player) {
    if (this.players.length >= this.maxPlayers) {
      throw new Error('Lobby is full');
    }
    if (this.players.find(p => p.id === player.id)) {
      throw new Error('Player already in lobby');
    }
    this.players.push(player);
  }
  
  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      creatorId: this.creatorId,
      players: this.players.map(p => p.toJSON()),
      playerCount: this.players.length,
      maxPlayers: this.maxPlayers,
      gameStarted: this.gameStarted
    };
  }
}

module.exports = Lobby;