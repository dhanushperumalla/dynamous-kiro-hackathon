import { connectDatabase } from '@/config/database';
import { User } from '@/models/User';
import { logger } from '@/utils/logger';

/**
 * Debug user account issues
 */
async function debugUser(email: string) {
  try {
    logger.info('Starting user debug...');
    
    // Connect to database
    await connectDatabase();
    logger.info('Connected to database');
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      logger.error('User not found', { email });
      process.exit(1);
    }
    
    logger.info('User found', {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.security.emailVerified,
      isAccountLocked: user.isAccountLocked(),
      lockUntil: user.security.lockUntil,
      failedLoginAttempts: user.security.failedLoginAttempts,
      createdAt: user.createdAt
    });
    
    // Fix common issues
    if (!user.isActive) {
      logger.info('Activating user account...');
      user.isActive = true;
    }
    
    if (!user.security.emailVerified) {
      logger.info('Verifying user email...');
      user.security.emailVerified = true;
      user.security.emailVerificationToken = undefined;
      user.security.emailVerificationExpires = undefined;
    }
    
    if (user.isAccountLocked()) {
      logger.info('Unlocking user account...');
      user.security.failedLoginAttempts = 0;
      user.security.lockUntil = undefined;
    }
    
    await user.save();
    logger.info('User account fixed and saved');
    
    process.exit(0);
  } catch (error) {
    logger.error('Debug user failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];
if (!email) {
  console.log('Usage: npm run debug-user <email>');
  process.exit(1);
}

debugUser(email);