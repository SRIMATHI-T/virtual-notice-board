const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Replace with your MongoDB Atlas URI if available
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/CampusConnect', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
