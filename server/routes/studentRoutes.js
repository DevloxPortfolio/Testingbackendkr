const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const XLSX = require('xlsx');
const Student = require('../models/student'); // Update with your actual path

const router = express.Router();

// AWS S3 Client Initialization
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Configure Multer for File Upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to trim object values
const trimObjectValues = (obj) => {
  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = typeof obj[key] === 'string' ? obj[key].trim() : obj[key];
    return acc;
  }, {});
};

// Upload Route
router.post('/upload', upload.single('excelFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    // Upload file to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: `uploads/${Date.now().toString()}_${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const upload = new Upload({
      client: s3,
      params: uploadParams,
    });

    await upload.done();

    // Process Excel file (after successful upload)
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);

    // Trim whitespace and process data
    const trimmedData = excelData.map(trimObjectValues);

    let processedCount = 0;
    let duplicateCount = 0;

    // Insert data into MongoDB
    for (const record of trimmedData) {
      const { EnrollmentCode, ...rest } = record;

      if (!EnrollmentCode) {
        continue; // Skip records without EnrollmentCode
      }

      const existingStudent = await Student.findOne({ EnrollmentCode });

      if (!existingStudent) {
        await Student.create(record);
        processedCount++;
      } else {
        duplicateCount++;
      }
    }

    res.status(200).json({
      message: 'File processed successfully',
      processedCount,
      duplicateCount,
    });

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Fetch All Students
router.get('/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
