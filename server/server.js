
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://clearbiller:DKnvsIZBvHjsjmmN@cluster0.eipii.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/FinderHUb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  campusId: { type: String, required: true },
  role: { type: String, enum: ['Student', 'Faculty', 'Staff'], required: true },
});

const User = mongoose.model('User', userSchema);

// Routes
// 1. Register a new user
app.post('/register', [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('campusId').notEmpty().withMessage('Campus ID is required'),
  body('role').isIn(['Student', 'Faculty', 'Staff']).withMessage('Role must be Student, Faculty, or Staff')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return res.status(400).json({ errors: errorMessages });
  }

  const { fullName, email, password, phoneNumber, campusId, role } = req.body;

  // Check if email is already registered
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'Email is already registered' });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
      campusId,
      role,
    });

    // Save the new user to the database
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Server error, please try again later' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Server is up and running successfully!');
});

// Handle root route to confirm server is working
app.get('/', (req, res) => {
  res.status(200).send('FinderHub server is up and running! abhijeet kulkarni');
});
