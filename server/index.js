const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, userName }) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { userId: socket.id, userName: userName });
    const clients = io.sockets.adapter.rooms.get(roomId);
    const participants = [];
    if (clients) {
      for (const clientId of clients) {
        if (clientId !== socket.id) participants.push(clientId);
      }
    }
    socket.emit('existing-participants', participants);
  });

  socket.on('signal', ({ targetId, signal }) => {
    io.to(targetId).emit('signal', { senderId: socket.id, signal: signal });
  });

  socket.on('chat-message', ({ roomId, message, userName }) => {
    io.to(roomId).emit('chat-message', { userId: socket.id, userName, message, timestamp: new Date().toISOString() });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) socket.to(roomId).emit('user-left', socket.id);
    }
  });
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Signaling server running on port 3001');
});
