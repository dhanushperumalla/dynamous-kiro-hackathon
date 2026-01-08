import mongoose from 'mongoose';
import { logger } from '@/utils/logger';

interface DatabaseConfig {
  url: string;
  options: mongoose.ConnectOptions;
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000; // 5 seconds

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    const config: DatabaseConfig = {
      url: process.env['DATABASE_URL'] || 'mongodb://localhost:27017/ai-sikshak',
      options: {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
        retryWrites: true,
        retryReads: true,
      }
    };

    try {
      await mongoose.connect(config.url, config.options);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info('Successfully connected to MongoDB', {
        url: config.url.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
        database: mongoose.connection.db?.databaseName
      });

      this.setupEventListeners();
    } catch (error) {
      logger.error('Failed to connect to MongoDB', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: config.url.replace(/\/\/.*@/, '//***:***@'),
        attempt: this.reconnectAttempts + 1
      });
      
      await this.handleReconnection();
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Successfully disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      this.isConnected = true;
      logger.info('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('Mongoose connection error', {
        error: error.message
      });
    });

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      logger.warn('Mongoose disconnected from MongoDB');
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.handleReconnection();
      }
    });

    mongoose.connection.on('reconnected', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Mongoose reconnected to MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Maximum reconnection attempts reached. Giving up.', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    logger.info('Attempting to reconnect to MongoDB', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delayMs: delay
    });

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('Reconnection attempt failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt: this.reconnectAttempts
        });
      }
    }, delay);
  }
}

// Create and export singleton instance
export const database = DatabaseConnection.getInstance();

// Export connection function for convenience
export const connectDatabase = () => database.connect();
export const disconnectDatabase = () => database.disconnect();
export const getDatabaseStatus = () => database.getConnectionStatus();