module.exports = (io, socket, games) => {
  socket.on("end_turn", ({ roomId }) => {
    const game = games.get(roomId);
    if (!game) return;
    game.nextTurn();
    io.to(roomId).emit("state_update", game);
  });

  socket.on("play_action", ({ roomId, cardId, data }) => {
        const game = games.get(roomId);
        const player = game.activePlayer;

        if (game.noChain) return;

        if (data.type === "rent") {
            const prompt = game.startNoChain(
            { type: "rent", cardId, data },
            data.targetPlayerId
            );

            io.to(roomId).emit("modal", prompt);
        }
    });

    socket.on("use_no", ({ roomId, cardId }) => {
        const game = games.get(roomId);
        const response = game.resolveNo(socket.id, cardId);
        io.to(roomId).emit("modal", response);
    });

    socket.on("no_response_end", ({ roomId }) => {
        const game = games.get(roomId);
        const result = game.finalizeNoChain();

        if (result === "EXECUTE") {
            io.to(roomId).emit("execute_action");
        } else {
            io.to(roomId).emit("action_cancelled");
        }
    });
};