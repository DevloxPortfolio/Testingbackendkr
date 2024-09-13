// server/models/Stop.js

const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  srno: { type: Number, required: true },
  code: { type: String, required: true },
  stopname: { type: String, required: true },
});

module.exports = mongoose.model('Stop', stopSchema);
