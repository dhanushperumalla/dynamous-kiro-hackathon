import { connectDatabase } from '../../src/config/database';
import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  await connectDatabase();
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.connection.close();
};