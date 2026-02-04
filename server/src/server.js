const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const socketHandler = require('./socket/socketHandler');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// Настройка Socket.IO с CORS
const io = socketIo(server, {
  cors: {
    origin: "*", // Разрешаем все origins для разработки
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Определяем абсолютный путь к клиентским файлам
const clientPath = path.join(__dirname, '../../client/public');

// Раздаем статические файлы из клиентской папки
app.use(express.static(clientPath));

// Логирование для отладки
console.log('Static files served from:', clientPath);
console.log('Environment:', process.env.NODE_ENV);

// Routes
app.use('/api', apiRoutes);

// Добавим перед обработчиком 404
app.get('/game.html', (req, res) => {
  const gamePath = path.join(__dirname, '../../client/public/game.html');
  console.log('📁 Отправка game.html:', gamePath);
  res.sendFile(gamePath);
});

// Обработка 404
app.use((req, res) => {
  console.log('📄 Запрос несуществующего файла:', req.path);
  res.status(404).sendFile('index.html', { root: clientPath });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socketHandler(io, socket);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});