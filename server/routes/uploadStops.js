// server/routes/uploadStops.js

const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const Stop = require('../models/stop.js');

const router = express.Router();

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST route to upload stops
router.post('/upload-stops', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const results = [];
  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);

  bufferStream
    .pipe(csv())
    .on('data', (row) => results.push({
      srno: parseInt(row.srno, 10),
      code: row.code,
      stopname: row.stopname,
    }))
    .on('end', async () => {
      try {
        // Save stops to MongoDB
        await Stop.insertMany(results);
        res.status(200).send('File uploaded and data saved.');
      } catch (error) {
        res.status(500).send('Error saving data.');
      }
    });
});

module.exports = router;
