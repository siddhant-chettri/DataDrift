const mongoose = require('mongoose');

const trendingAudioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  audioAuthor: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    default: 'instagram',
    enum: ['instagram', 'tiktok', 'other']
  },
  frequency: {
    type: Number,
    default: 1
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  relatedReels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel'
  }]
}, {
  timestamps: true
});

// Index for efficient querying
trendingAudioSchema.index({ name: 1, source: 1 }, { unique: true });

const TrendingAudio = mongoose.model('TrendingAudio', trendingAudioSchema);

module.exports = TrendingAudio; 