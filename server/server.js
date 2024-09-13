const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config(); // Load environment variables

const app = express();
const dbURI = process.env.MONGODB_URI; // Use environment variable for MongoDB URI
const port = process.env.PORT || 3000; // Use environment variable for port or default to 3000

// AWS S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Multer S3 upload configuration
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    acl: 'public-read',
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      cb(null, `${Date.now().toString()}-${file.originalname}`);
    }
  })
});

// Check for MongoDB URI
if (!dbURI) {
  console.error('Missing MongoDB URI');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: '*', // Allows all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))  // Successful connection
  .catch(err => {
    console.error('Failed to connect to MongoDB', err); // Failed connection
    process.exit(1); // Exit if the connection fails
  });

// Health check for MongoDB connection status
app.get('/db-status', async (req, res) => {
  const dbState = mongoose.connection.readyState; // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  res.json({ dbStatus: dbState === 1 ? 'Connected' : 'Not Connected' });
});

// Basic route
app.get("/", (req, res) => {
  res.json("Hello, welcome to the server!");
});

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.json({
    message: 'File uploaded successfully!',
    file: req.file
  });
});

// Routes
app.use('/api', require('./routes/studentRoutes'));
app.use('/api', require('./routes/busRoutes'));
app.use('/api', require('./routes/allocationRoutes'));
app.use('/api', require('./routes/uploadStops'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

// Log AWS and S3 configurations for debugging purposes
console.log('AWS Access Key ID:', process.env.AWS_ACCESS_KEY_ID);
console.log('AWS Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY);
console.log('AWS Region:', process.env.AWS_REGION);
console.log('S3 Bucket:', process.env.S3_BUCKET);
console.log('Mongodb URI:', process.env.MONGODB_URI);
