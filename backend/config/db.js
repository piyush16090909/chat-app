// ============================================================
// config/db.js — MongoDB connection using Mongoose
// Called once at server startup. Exits the process on failure
// so you know immediately if the DB URL is wrong.
// ============================================================

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options suppress deprecation warnings in Mongoose 7+
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // Exit with failure so Docker / PM2 restarts the process
    process.exit(1);
  }
};

module.exports = connectDB;
