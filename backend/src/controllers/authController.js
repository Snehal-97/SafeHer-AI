const supabase = require('../config/supabaseClient');
const jwt = require('jsonwebtoken');

// Register a new user
const signup = async (req, res) => {
  try {
    const { email, password, full_name, phone_number } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: 'Failed to create user', details: authError.message });
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        {
          id: userId,
          email,
          full_name: full_name || '',
          phone_number: phone_number || ''
        }
      ]);

    if (profileError) {
      return res.status(400).json({ error: 'Failed to create user profile', details: profileError.message });
    }

    res.status(201).json({
      message: 'User registered successfully!',
      user: { id: userId, email, full_name }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

// Log in an existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid email or password', details: error?.message });
    }

    const user = data.user;

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

module.exports = { signup, login };
