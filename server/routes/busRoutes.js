// busUpload.js

const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const XLSX = require('xlsx');
const Bus = require('../models/bus'); // Ensure the correct path to your Bus model

// Initialize AWS S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const router = express.Router();

// Configure multer to use S3 for file uploads
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    acl: 'private',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      cb(null, `uploads/${Date.now().toString()}_${file.originalname}`);
    }
  })
});

// Helper function to trim whitespace from object values
const trimObjectValues = (obj) => {
  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = (typeof obj[key] === 'string') ? obj[key].trim() : obj[key];
    return acc;
  }, {});
};

// Convert S3 stream to buffer
const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

// Bus Upload Route
router.post('/upload-bus', upload.single('busFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const fileKey = req.file.key;
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: fileKey
    };

    const command = new GetObjectCommand(params);
    const data = await s3.send(command);

    // Convert S3 file stream to buffer
    const buffer = await streamToBuffer(data.Body);

    // Read Excel file from the buffer
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error('Sheet not found in the file');
    }

    // Convert the sheet to JSON
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    
    let duplicateCount = 0;
    const processedData = [];

    // Process each row, checking for duplicates
    for (const row of rows) {
      const trimmedRow = trimObjectValues(row);
      const existingBus = await Bus.findOne({ Busno: trimmedRow.Busno });

      if (!existingBus) {
        processedData.push(trimmedRow);
      } else {
        duplicateCount++;
      }
    }

    // Insert non-duplicate buses to MongoDB
    if (processedData.length > 0) {
      await Bus.insertMany(processedData);
    }

    res.status(200).json({ message: 'File processed successfully', duplicateCount });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Fetch all buses from MongoDB
router.get('/upload-bus', async (req, res) => {
  try {
    const buses = await Bus.find(); // Fetch all buses
    console.log(`Found ${buses.length} buses.`); // Debug log
    res.status(200).json(buses);
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
