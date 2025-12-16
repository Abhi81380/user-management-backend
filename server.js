// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const fs = require('fs');
const path = require('path');
// Enable CORS (optional, but safe)
// const jwt = require('jsonwebtoken');
// const fetch = require('node-fetch');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();
app.use(cors());

// Parse JSON request body
app.use(express.json());

const usersFilePath = path.join(__dirname, 'users.json');

const authFilePath = path.join(__dirname, 'authentication.json');

// Load authentication users
function loadAuthUsers() {
  const data = fs.readFileSync(authFilePath, 'utf-8');
  return JSON.parse(data);
}

// Helper function to load users
function loadUsers() {
  const data = fs.readFileSync(usersFilePath, 'utf-8');
  return JSON.parse(data);
}
// Helper function to save users
function saveUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}
// POST /api/login

// app.post('/api/login', (req, res) => {
//   const { email, password } = req.body;

//   // Simple dummy login validation
//   if (email === 'test@example.com' && password === '123456') {
//     return res.json({ token: 'local-dev-token-123' });
//   }

//   // Otherwise invalid
//   res.status(401).json({ error: 'Invalid credentials' });
// });
// ✅ LOGIN endpoint (reads from authentication.json)
// app.post('/api/login', (req, res) => {
//   const { email, password } = req.body;
//   const authUsers = loadAuthUsers();

//   const user = authUsers.find(u => u.email === email && u.password === password);

//   if (!user) {console.log(user,"notusername")
//     return res.status(401).json({ error: 'Invalid credentials' });
//   }
// console.log(user,"username")
//   // Simple token (role + id encoded)
//   // const token = `token-${user.role}-${user.id}`;
//   const token = `token-${user.role}-${user.id}-${Date.now()}`;


//   res.json({
//     message: 'Login successful',
//     token,
//     role: user.role,
//     userId: user.id
//   });
// });

// ✅ Simple authentication middleware

const jwt = require('jsonwebtoken');
const SECRET_KEY = 'my-secret-key';

// ✅ LOGIN endpoint using JWT
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const authUsers = loadAuthUsers();

  const user = authUsers.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // ✅ Generate a JWT token (valid for 1 hour)
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  res.json({
    message: 'Login successful',
    token,
    role: user.role,
    userId: user.id,
  });
});

// === 🤖 CHATBOT API ===
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch(`${process.env.OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'HTTP-Referer': 'http://localhost:4200',  // optional but recommended
        'X-Title': 'User Management System Chatbot'
      },
      body: JSON.stringify({
        model: 'mistralai/mixtral-8x7b-instruct', // free, fast model
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for a User Management System built with Angular and Node.js.
            You only answer questions related to this project's features, APIs, login, CRUD operations, or structure.
            If asked unrelated questions, respond: "I can only answer about the User Management System."`,
          },
          ...messages,
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ OpenRouter API Error:', data);
      return res.status(response.status).json({ error: data });
    }

    res.json(data);
  } catch (err) {
    console.error('💥 Chatbot API Error:', err.message);
    res.status(500).json({ error: 'Chatbot request failed' });
  }
});



// ✅ JWT Authentication Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    // ✅ Verify token
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userRole = decoded.role;
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}




// ✅ Admin-only route protection
function adminOnly(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
}





// GET all users
// ===== USERS API =====


// ✅ GET all users
app.get('/api/users', authMiddleware, (req, res) => {
  const users = loadUsers();
  res.json(users);
  console.log('✅ Users fetched:', users.length, 'records');
});

// ✅ GET a single user by ID
app.get('/api/users/:id',  authMiddleware, adminOnly, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// ✅ POST - Add new user
app.post('/api/users',  authMiddleware, adminOnly, (req, res) => {
  const users = loadUsers();
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: 'firstName, lastName, and email are required' });
  }

  const newUser = {
    id: users.length ? users[users.length - 1].id + 1 : 1,
    firstName,
    lastName,
    email
  };

  users.push(newUser);
  saveUsers(users);
  res.status(201).json(newUser);
});

// ✅ PUT - Update existing user
app.put('/api/users/:id',  authMiddleware, adminOnly, (req, res) => {
  const users = loadUsers();
  const userId = parseInt(req.params.id);
  const { firstName, lastName, email } = req.body;
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) return res.status(404).json({ message: 'User not found' });

  users[index] = { ...users[index], firstName, lastName, email };
  saveUsers(users);
  res.json({ message: 'User updated successfully', user: users[index] });
});

// ✅ DELETE - Remove user
app.delete('/api/users/:id',  authMiddleware, adminOnly, (req, res) => {
  const users = loadUsers();
  const userId = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) return res.status(404).json({ message: 'User not found' });

  const deletedUser = users.splice(index, 1);
  saveUsers(users);
  res.json({ message: 'User deleted successfully', deletedUser });
});








// Test route (GET)
app.get('/', (req, res) => {
  res.send('✅ JWT Backend running successfully!');
});


// app.listen(3000, () => {
//   console.log('✅ Local backend running on http://localhost:3000');
// });
// ===== START SERVER =====
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});