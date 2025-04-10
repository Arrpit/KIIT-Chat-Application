const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5011',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Serve React App for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kiit-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Message Schema
const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'All fields are required',
        details: {
          name: !name ? 'Name is required' : null,
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// Search users by email
app.get('/api/users/search', authenticateToken, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Improved search query to match partial email addresses and names
    const users = await User.find(
      {
        $and: [
          {
            $or: [
              { email: { $regex: email, $options: 'i' } },
              { name: { $regex: email, $options: 'i' } }
            ]
          },
          { _id: { $ne: req.user.id } }
        ]
      },
      { password: 0 }
    );

    // Map the response to match the expected format
    const formattedUsers = users.map(user => ({
      _id: user._id,
      id: user._id, // Add id field for compatibility
      name: user.name,
      email: user.email
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Socket.IO Authentication
const authenticateSocket = (socket, next) => {
  console.log('Socket authentication attempt:', socket.id);
  const token = socket.handshake.auth.token;
  if (!token) {
    console.error('Socket auth failed: No token provided');
    return next(new Error('Authentication error: No token provided'));
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      console.error('Socket auth failed: Invalid token', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }
    console.log('Socket authenticated for user:', decoded.id, decoded.email);
    socket.user = decoded;
    next();
  });
};

io.use(authenticateSocket);

// Connected Users
let connectedUsers = new Map();
// Store messages in memory (in production, use a database)
const messages = [];

// Debug function to log connected users
const logConnectedUsers = () => {
  console.log('Currently connected users:', Array.from(connectedUsers.entries()).map(([id, user]) => ({
    id: id,
    name: user.name,
    email: user.email
  })));
};

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`User connected: ${socket.user.name} (${socket.user.email}) with socket ID: ${socket.id}`);
  
  connectedUsers.set(userId, {
    id: userId,
    name: socket.user.name,
    email: socket.user.email,
    socketId: socket.id
  });

  // Log all connected users for debugging
  logConnectedUsers();
  
  // Broadcast connected users
  io.emit('users', Array.from(connectedUsers.values()));

  socket.on('get_messages', async () => {
    try {
      // Fetch messages from database instead of memory
      const userMessages = await Message.find({
        $or: [
          { senderId: userId },
          { recipientId: userId }
        ]
      }).sort({ timestamp: 1 });
      socket.emit('existing_messages', userMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      socket.emit('error', { message: 'Error fetching messages' });
    }
  });

  socket.on('message', async (data) => {
    try {
      // Validate message data
      if (!data.content || !data.recipientId) {
        throw new Error('Invalid message data');
      }

      // Create and save the message
      const message = new Message({
        content: data.content, // Content is already encrypted from client
        senderId: data.senderId,
        recipientId: data.recipientId,
        timestamp: new Date()
      });
      await message.save();

      const messageToSend = {
        _id: message._id,
        content: message.content,
        senderId: message.senderId,
        recipientId: message.recipientId,
        timestamp: message.timestamp
      };

      // Send to recipient if online
      const recipient = Array.from(connectedUsers.values())
        .find(user => user.id === data.recipientId);
      
      if (recipient) {
        console.log(`Sending message to recipient: ${recipient.name} (${recipient.email}) with socket ID: ${recipient.socketId}`);
        io.to(recipient.socketId).emit('message', messageToSend);
      } else {
        console.log(`Recipient not online. Message will be delivered when they connect. Recipient ID: ${data.recipientId}`);
      }

      // Send back to sender for confirmation
      socket.emit('message', messageToSend);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.user.name} (${socket.user.email}), reason: ${reason}`);
    connectedUsers.delete(userId);
    
    // Log remaining connected users
    logConnectedUsers();
    
    // Broadcast updated user list
    io.emit('users', Array.from(connectedUsers.values()));
  });
});

const findAvailablePort = async (startPort) => {
  const net = require('net');
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
};

// Use port from environment variable or default to 5012
const startPort = process.env.PORT || 5012;

// Start the server with port finding
findAvailablePort(startPort).then(PORT => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Server URL:', `http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});