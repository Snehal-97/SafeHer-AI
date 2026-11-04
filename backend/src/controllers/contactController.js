const supabase = require('../config/supabaseClient');

// Add a trusted emergency contact
const addContact = async (req, res) => {
  try {
    const userId = req.user.id; // From verified JWT middleware
    const { contact_name, phone_number, relationship } = req.body;

    if (!contact_name || !phone_number) {
      return res.status(400).json({ error: 'Contact name and phone number are required.' });
    }

    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert([
        {
          user_id: userId,
          contact_name,
          phone_number,
          relationship: relationship || 'Family/Friend'
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: 'Failed to add contact', details: error.message });
    }

    res.status(201).json({
      message: 'Emergency contact added successfully!',
      contact: data
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

// Get all emergency contacts for the logged-in user
const getContacts = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: 'Failed to fetch contacts', details: error.message });
    }

    res.status(200).json({ contacts: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

module.exports = { addContact, getContacts };
