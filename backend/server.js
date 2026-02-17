const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const chatRoutes = require('./routes/chat');
const forumRoutes = require('./routes/forum');
const workflowRoutes = require('./routes/workflows');
const webhookRoutes = require('./routes/webhooks');
const logoRoutes = require('./routes/logo');

const { startLogoCleanupJob } = require('./utils/logoCleanup');

const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Authorization"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

// Configure security headers with Helmet (less restrictive for development)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "*"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      fontSrc: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Explicit preflight handling
app.options('*', cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Create uploads directories if they don't exist
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
const logosDir = path.join(uploadsDir, 'logos');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/msme_marketplace')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Socket.io connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.user.name} (${socket.user._id})`);

  connectedUsers.set(socket.user._id.toString(), socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`👥 ${socket.user.name} joined room: ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`👋 ${socket.user.name} left room: ${roomId}`);
  });

  socket.on('send-message', async (data) => {
    const { roomId, message } = data;

    socket.to(roomId).emit('receive-message', {
      ...message,
      sender: {
        _id: socket.user._id,
        name: socket.user.name,
        profileImage: socket.user.profileImage
      }
    });

    const ChatRoom = require('./models/ChatRoom');
    const chatRoom = await ChatRoom.findById(roomId);
    if (chatRoom) {
      const recipientId = socket.user._id.toString() === chatRoom.buyer.toString()
        ? chatRoom.seller.toString()
        : chatRoom.buyer.toString();

      const recipientSocketId = connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new-message-notification', {
          roomId,
          message: message.content,
          senderName: socket.user.name
        });
      }
    }
  });

  socket.on('typing', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('user-typing', {
      userId: socket.user._id,
      userName: socket.user.name
    });
  });

  socket.on('stop-typing', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('user-stop-typing', {
      userId: socket.user._id
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.user.name}`);
    connectedUsers.delete(socket.user._id.toString());
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/logo', logoRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MSME Marketplace API is running' });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);

  // Start logo cleanup job
  startLogoCleanupJob();
});

module.exports = { app, server, io };
