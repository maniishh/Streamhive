
let _io = null;

const userSocketMap = new Map();

export function initSocket(io) {
  _io = io;

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      userSocketMap.set(String(userId), socket.id);
    }

    socket.on('disconnect', () => {
      if (userId) userSocketMap.delete(String(userId));
    });
  });
}

export function notifyUser(recipientId, notification) {
  if (!_io) return;
  const socketId = userSocketMap.get(String(recipientId));
  if (socketId) {
    _io.to(socketId).emit('notification:new', notification);
  }
}

export function getIO() { return _io; }
