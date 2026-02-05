class NoChain {
  constructor(action) {
    this.action = action;
    this.stack = []; // { playerId, cardId }
    this.active = true;
  }

  add(playerId, cardId) {
    this.stack.push({ playerId, cardId });
  }

  lastPlayer() {
    return this.stack[this.stack.length - 1]?.playerId;
  }

  isCancelled() {
    return this.stack.length % 2 === 1;
  }
}

module.exports = NoChain;