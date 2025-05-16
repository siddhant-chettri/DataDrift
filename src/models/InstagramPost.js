const mongoose = require('mongoose');

const instagramPostSchema = new mongoose.Schema({
  postId: {
    type: String,
    required: true,
    unique: true
  },
  mediaType: {
    type: String,
    enum: ['REEL', 'CAROUSEL_ALBUM', 'IMAGE', 'VIDEO'],
    required: true
  },
  caption: {
    type: String,
    trim: true
  },
  permalink: {
    type: String,
    required: true
  },
  region: {
    type: String,
    enum: ['bhojpuri', 'haryanvi', 'rajasthani'],
    index: true
  },
  mediaUrl: {
    type: String
  },
  thumbnailUrl: {
    type: String
  },
  timestamp: {
    type: Date,
    required: true
  },
  // Metrics
  likeCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  reachCount: {
    type: Number,
    default: 0
  },
  impressionCount: {
    type: Number,
    default: 0
  },
  savedCount: {
    type: Number,
    default: 0
  },
  sharesCount: {
    type: Number,
    default: 0
  },
  playsCount: {
    type: Number, // Only applicable for reels/videos
    default: 0
  },
  engagementRate: {
    type: Number,
    default: 0
  },
  hashtags: [{
    type: String,
    trim: true
  }],
  mentions: [{
    type: String,
    trim: true
  }],
  // For tracking performance over time
  performanceSnapshots: [{
    date: {
      type: Date,
      default: Date.now
    },
    likeCount: Number,
    commentsCount: Number,
    reachCount: Number,
    impressionCount: Number,
    savedCount: Number,
    sharesCount: Number,
    playsCount: Number,
    engagementRate: Number
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for efficient querying
instagramPostSchema.index({ mediaType: 1 });
instagramPostSchema.index({ timestamp: -1 });
instagramPostSchema.index({ engagementRate: -1 });

const InstagramPost = mongoose.model('InstagramPost', instagramPostSchema);

module.exports = InstagramPost; 