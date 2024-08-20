const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const XLSX = require('xlsx');
const Student = require('../models/student');

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

// Function to trim whitespace from object values
const trimObjectValues = (obj) => {
  const trimmedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      trimmedObj[key] = typeof obj[key] === 'string' ? obj[key].trim() : obj[key];
    }
  }
  return trimmedObj;
};

// Student Upload Route
router.post('/upload', upload.single('excelFile'), async (req, res) => {
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
      const worksheet = workbook.Sheets[sheetName];
      const excelData = XLSX.utils.sheet_to_json(worksheet);  // Convert sheet to JSON

      // Trim whitespace from data
      const trimmedData = excelData.map(trimObjectValues);

      let processedCount = 0;
      let duplicateCount = 0;

      // Process and insert data into MongoDB
      (async () => {
        for (const record of trimmedData) {
          const { EnrollmentCode, ...rest } = record;
          if (!EnrollmentCode) {
            // Skip records without EnrollmentCode
            continue;
          }

          // Check for duplicates and insert data
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
          duplicateCount
        });
      })();

    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/students', async (req, res) => {
  try {
    const students = await Student.find(); // Fetch all students from MongoDB
    console.log(`Found ${students.length} students.`);
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
