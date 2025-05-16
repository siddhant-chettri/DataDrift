const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  shortcode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  postUrl: {
    type: String,
    trim: true
  },
  caption: {
    type: String,
    trim: true
  },
  likeCount: {
    type: String,
    trim: true
  },
  videoSrc: {
    type: String,
    trim: true
  },
  hasTrendingAudio: {
    type: Boolean,
    default: false
  },
  audioName: {
    type: String,
    trim: true
  },
  audioAuthor: {
    type: String,
    trim: true
  },
  trendingAudioRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrendingAudio'
  },
  scrapeDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create an index for efficient querying
reelSchema.index({ username: 1 });
reelSchema.index({ hasTrendingAudio: 1 });
reelSchema.index({ audioName: 1 });

const Reel = mongoose.model('Reel', reelSchema);

module.exports = Reel; 