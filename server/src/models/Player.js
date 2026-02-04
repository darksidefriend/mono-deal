class Player {
  constructor(id, name, socketId) {
    this.id = id;
    this.name = name;
    this.socketId = socketId;
    this.hand = [];
    this.bank = [];
    this.properties = [];
    this.isReady = false;
    this.isConnected = true;
    this.turnOrder = null;
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      isReady: this.isReady,
      isConnected: this.isConnected
    };
  }
}

module.exports = Player;