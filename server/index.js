const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const lobby = require("./socket/lobby");
const gameHandlers = require("./socket/gameHandlers");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let games;

io.on("connection", socket => {
  games = lobby(io, socket);
  gameHandlers(io, socket, games);
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});