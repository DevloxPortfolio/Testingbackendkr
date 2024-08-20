const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const XLSX = require('xlsx');
const Bus = require('../models/bus'); // Ensure the model is correctly imported

// Initialize AWS S3
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

const router = express.Router();

// Configure multer to use S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    acl: 'private',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, `uploads/${Date.now().toString()}_${file.originalname}`);
    }
  })
});

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

  try {
    // Get the S3 file URL
    const fileUrl = req.file.location;

    // Download file from S3
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: req.file.key
    };

    s3.getObject(params, (err, data) => {
      if (err) {
        console.error('Error fetching file from S3:', err);
        return res.status(500).json({ message: 'Error fetching file from S3', error: err.message });
      }

      // Process the file
      const workbook = XLSX.read(data.Body, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      let duplicateCount = 0;
      const processedData = [];

      (async () => {
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
      })();
    });

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Error processing file', error: error.message });
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
