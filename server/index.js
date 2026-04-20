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

const userNames = {};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('join-room', ({ roomId, userName }) => {
    console.log(`${userName} (${socket.id}) joining room ${roomId}`);
    socket.join(roomId);
    userNames[socket.id] = userName;

    socket.to(roomId).emit('user-joined', { userId: socket.id, userName: userName });

    const clients = io.sockets.adapter.rooms.get(roomId);
    const participants = [];
    if (clients) {
      for (const clientId of clients) {
        if (clientId !== socket.id) {
          participants.push({
            id: clientId,
            name: userNames[clientId] || 'Remote User'
          });
        }
      }
    }
    console.log(`Sending ${participants.length} existing participants to ${socket.id}`);
    socket.emit('existing-participants', participants);
  });

  socket.on('signal', ({ targetId, signal }) => {
    console.log(`Relaying ${signal.type || 'candidate'} from ${socket.id} to ${targetId}`);
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

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    delete userNames[socket.id];
  });
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Signaling server running on port 3001');
});
