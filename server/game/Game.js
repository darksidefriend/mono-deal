const Deck = require("./Deck");
const Player = require("./Player");
const rules = require("./rules");
const NoChain = require("./NoChain");

class Game {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.currentPlayer = 0;
    this.deck = new Deck();
    this.started = false;
    this.noChain = null;
  }

  addPlayer(id, name, socketId) {
    if (this.started) return;
    this.players.push(new Player(id, name, socketId));
  }

  start() {
    this.started = true;
    this.players.forEach(p => {
      p.draw(this.deck.draw(5));
    });
  }

  get activePlayer() {
    return this.players[this.currentPlayer];
  }

  nextTurn() {
    const p = this.activePlayer;
    p.emptyHandLastTurn = p.hand.length === 0;

    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    const next = this.activePlayer;

    next.actionsLeft = rules.ACTIONS_PER_TURN;
    next.draw(this.deck.draw(next.emptyHandLastTurn ? 5 : 2));
  }

    startNoChain(action, targetPlayerId) {
        this.noChain = new NoChain(action);

        return {
            type: "NO_PROMPT",
            targetPlayerId,
            message: "Против вас использована карта действия. Кинуть «Нет»?"
        };
    }

    resolveNo(playerId, cardId) {
        this.noChain.add(playerId, cardId);

        const last = this.noChain.lastPlayer();
        const next = this.players.find(p => p.id !== last);

        return {
            type: "NO_COUNTER_PROMPT",
            targetPlayerId: next.id
        };
    }

    finalizeNoChain() {
        const cancelled = this.noChain.isCancelled();
        const result = cancelled ? "CANCELLED" : "EXECUTE";
        this.noChain = null;
        return result;
    }

    calculateRent(player, color) {
        const set = player.properties[color] || [];
        const count = set.length;
        return set[0]?.meta?.rent[count - 1] || 0;
    }

    requestPayment(fromId, toId, amount, reason) {
        this.pendingPayment = { fromId, toId, amount, reason };
    }

    checkWin(player) {
        let completed = 0;

        for (const color in player.properties) {
            const set = player.properties[color];
            if (set && set.length >= set[0].meta.fullSet) {
            completed++;
            }
        }

        if (completed >= 3) {
            return player;
        }

        return null;
    }
}

module.exports = Game;