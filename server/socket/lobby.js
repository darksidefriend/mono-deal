const Game = require("../game/Game");
const games = new Map();

module.exports = (io, socket) => {
  socket.on("create_room", ({ roomId, name }) => {
    const game = new Game(roomId);
    games.set(roomId, game);
    game.addPlayer(socket.id, name, socket.id);
    socket.join(roomId);
    socket.emit("room_created");
  });

  socket.on("join_room", ({ roomId, name }) => {
    const game = games.get(roomId);
    if (!game) return;
    game.addPlayer(socket.id, name, socket.id);
    socket.join(roomId);
    io.to(roomId).emit("player_joined", game.players);
  });

  socket.on("start_game", ({ roomId }) => {
    const game = games.get(roomId);
    if (!game) return;
    game.start();
    io.to(roomId).emit("game_started", game);
  });

  return games;
};