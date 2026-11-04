const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const verifyToken = require('./middleware/auth');
const supabase = require('./config/supabaseClient');
const { signup, login } = require('./controllers/authController');
const { triggerSOS } = require('./controllers/emergencyController');
const { addContact, getContacts } = require('./controllers/contactController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Public health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'SafeHer-AI Backend' });
});

// Auth Routes (Public)
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);

// Protected route to get user profile
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; 

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User profile not found', details: error.message });
    }

    res.status(200).json({ profile: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Protected route to trigger SOS Emergency Alert
app.post('/api/emergency/sos', verifyToken, triggerSOS);

// Protected routes for Emergency Contacts
app.post('/api/contacts', verifyToken, addContact);
app.get('/api/contacts', verifyToken, getContacts);

app.listen(PORT, () => {
  console.log(`SafeHer-AI Server running on port ${PORT}`);
});
