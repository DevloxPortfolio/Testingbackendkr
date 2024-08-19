const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  Busno: String,
  BusSrNO: String,
  stop1: String,
  stop2: String,
  stop3: String,
  stop4: String,
  stop5: String,
  stop6: String,
  stop7: String,
  stop8: String,
  stop9: String,
  Route: String,
  Seat: Number,
  Capacity: Number,
  Brand: String,
});

// Export the model with the collection name 'buses'
module.exports = mongoose.model('Bus', busSchema, 'buses');
