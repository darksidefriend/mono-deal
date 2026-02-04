const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const socketHandler = require('./socket/socketHandler');
const apiRoutes = require('./routes/api');
const LobbyManager = require('./game/LobbyManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../client/public'));

// Routes
app.use('/api', apiRoutes);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socketHandler(io, socket);
});

// Serve game page
app.get('/game/:id', (req, res) => {
  res.sendFile('game.html', { root: '../client/public' });
});

// Serve lobby page
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '../client/public' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});