// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const fs = require('fs');
const path = require('path');

// Enable CORS (optional, but safe)
app.use(cors());

// Parse JSON request body
app.use(express.json());

const usersFilePath = path.join(__dirname, 'users.json');

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
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Simple dummy login validation
  if (email === 'test@example.com' && password === '123456') {
    return res.json({ token: 'local-dev-token-123' });
  }

  // Otherwise invalid
  res.status(401).json({ error: 'Invalid credentials' });
});



// GET all users
// ===== USERS API =====


// ✅ GET all users
app.get('/api/users', (req, res) => {
  const users = loadUsers();
  res.json(users);
  console.log('✅ Users fetched:', users.length, 'records');
});

// ✅ GET a single user by ID
app.get('/api/users/:id', (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// ✅ POST - Add new user
app.post('/api/users', (req, res) => {
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
app.put('/api/users/:id', (req, res) => {
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
app.delete('/api/users/:id', (req, res) => {
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
  res.send('✅ Backend is running successfully on Render');
});

// Start the server
// app.listen(3000, () => {
//   console.log('✅ Local backend running on http://localhost:3000');
// });
// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});