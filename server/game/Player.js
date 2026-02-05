class Player {
  constructor(id, name, socketId) {
    this.id = id;
    this.name = name;
    this.socketId = socketId;
    this.hand = [];
    this.bank = [];
    this.properties = {};
    this.actionsLeft = 3;
    this.emptyHandLastTurn = false;
  }

  draw(cards) {
    this.hand.push(...cards);
  }
}

module.exports = Player;