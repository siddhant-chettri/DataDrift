const mongoose = require('mongoose');

const trendingTopicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  region: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    geo: {
      type: String,
      required: true,
      trim: true
    }
  },
  rank: {
    type: Number,
    required: true
  },
  traffic: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
trendingTopicSchema.index({ "title": 1, "region.geo": 1, "date": 1 });

const TrendingTopic = mongoose.model('TrendingTopic', trendingTopicSchema);

module.exports = TrendingTopic; 