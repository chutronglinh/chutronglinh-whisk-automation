import mongoose from 'mongoose';

// Set strictQuery option
mongoose.set('strictQuery', false);

// Increase buffer timeout
mongoose.set('bufferTimeoutMS', 30000); // 30 seconds

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`✗ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};