const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  code: String,
  stopname: String
});

// Export the model with the collection name 'stops'
module.exports = mongoose.model('Stop', stopSchema, 'stops');
