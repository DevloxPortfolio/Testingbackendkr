const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const Student = require('../models/student');

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

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
      const filePath = path.join(__dirname, '../uploads/', req.file.filename);
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
  
      // Trim whitespace from data
      const trimmedData = data.map(trimObjectValues);
  
      let processedCount = 0;
      let duplicateCount = 0;
  
      // Process and insert data into MongoDB
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
  
      // Clean up uploaded file
      fs.unlinkSync(filePath);
  
      res.status(200).json({
        message: 'File processed successfully',
        processedCount,
        duplicateCount
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
