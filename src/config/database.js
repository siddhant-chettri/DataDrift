const mongoose = require('mongoose');

// MongoDB connection URI - Using environment variables for security
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://siddhantchtriofficial:AEhXqcgYu7-CZ64@cluster0.aenzcev.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'instagramData';

// MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB }; 