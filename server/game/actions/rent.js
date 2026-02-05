module.exports = (game, player, card, options) => {
  const { color, double } = options;
  const rentValue = game.calculateRent(player, color);
  const amount = double ? rentValue * 2 : rentValue;

  game.players.forEach(p => {
    if (p.id !== player.id) {
      game.requestPayment(p.id, player.id, amount, "rent");
    }
  });
};