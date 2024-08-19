const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  EnrollmentCode: String,
  StudentName: String,
  Gender: String,
  Class: String,
  Stop: String,
  Address: String,
  BusNumber: { type: String, default: null },
  BusSrNumber: { type: String, default: null },
  StopName: String
});

// Export the model with the collection name 'students'
module.exports = mongoose.model('Student', studentSchema, 'students');
