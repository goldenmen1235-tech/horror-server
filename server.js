const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = {};

io.on('connection', (socket) => {
    console.log('Подключён:', socket.id);

    socket.on('createRoom', () => {
        const code = Math.random().toString(36).slice(2, 6).toUpperCase();
        rooms[code] = { host: socket.id, players: [socket.id] };
        socket.join(code);
        socket.emit('roomCreated', code);
        console.log('Создана комната:', code);
    });

    socket.on('joinRoom', (code) => {
        if (!rooms[code]) { socket.emit('roomError', 'Комната не найдена'); return; }
        rooms[code].players.push(socket.id);
        socket.join(code);
        io.to(code).emit('playersUpdated', rooms[code].players);
        socket.emit('joinedRoom', code);
        console.log('Игрок', socket.id, 'вошёл в', code);
    });

    socket.on('startGame', (code) => {
        if (!rooms[code] || rooms[code].host !== socket.id) return;
        io.to(code).emit('gameStart');
    });

    socket.on('move', (data) => {
        socket.to(data.code).emit('remoteMove', { x: data.x, z: data.z });
    });

    socket.on('disconnect', () => {
        for (const code in rooms) {
            rooms[code].players = rooms[code].players.filter(id => id !== socket.id);
            if (rooms[code].players.length === 0) delete rooms[code];
            else io.to(code).emit('playersUpdated', rooms[code].players);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Сервер на порту ' + PORT));
