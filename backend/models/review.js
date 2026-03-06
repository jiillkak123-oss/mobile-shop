const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, default: '' },
  helpfulCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Review', ReviewSchema);
