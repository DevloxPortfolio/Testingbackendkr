const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables

const app = express();
const dbURI = process.env.MONGODB_URI; // Use environment variable for MongoDB URI

// Check for MongoDB URI
if (!dbURI) {
  console.error('Missing MongoDB URI');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Middleware
app.use(cors({
  origin: '*', // Allows all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api', require('./routes/studentRoutes'));
app.use('/api', require('./routes/busRoutes'));
app.use('/api', require('./routes/allocationRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Export the app as a serverless function
module.exports = (req, res) => {
  app(req, res);
};
