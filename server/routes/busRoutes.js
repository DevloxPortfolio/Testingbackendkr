// server/routes/busRoutes.js
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const Bus = require('../models/bus'); // Ensure the model is correctly imported

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Helper function to trim object values
const trimObjectValues = (obj) => {
  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = (typeof obj[key] === 'string') ? obj[key].trim() : obj[key];
    return acc;
  }, {});
};

// Bus Upload Route
router.post('/upload-bus', upload.single('busFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const filePath = req.file.path;

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    let duplicateCount = 0;
    const processedData = [];

    for (const row of rows) {
      const trimmedRow = trimObjectValues(row);
      const existingBus = await Bus.findOne({ Busno: trimmedRow.Busno });

      if (!existingBus) {
        processedData.push(trimmedRow);
      } else {
        duplicateCount++;
      }
    }

    if (processedData.length > 0) {
      await Bus.insertMany(processedData);
    }

    res.status(200).json({ message: 'File processed successfully', duplicateCount });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Error processing file', error });
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
  }
});
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
