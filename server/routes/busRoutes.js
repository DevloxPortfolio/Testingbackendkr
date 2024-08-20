const express = require('express');
const Bus = require('../models/bus'); // Ensure the model is correctly imported

const router = express.Router();

// Get all buses
router.get('/upload-bus', async (req, res) => {
  try {
    const buses = await Bus.find(); // Fetch all buses from MongoDB
    console.log(`Found ${buses.length} buses.`);
    res.status(200).json(buses);
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
