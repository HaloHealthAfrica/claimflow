// Database connection testing utility
import { prisma, checkDatabaseConnection, encrypt, decrypt } from './db';

export async function testDatabaseSetup() {
  console.log('🔍 Testing database setup...');

  try {
    // Test basic connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');

    // Test encryption/decryption
    const testData = 'Sensitive PHI Data';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== testData) {
      throw new Error('Encryption/decryption test failed');
    }
    console.log('✅ Encryption/decryption working correctly');

    // Test basic CRUD operations
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        name: encrypt('Test User'),
      },
    });
    console.log('✅ User creation successful');

    // Clean up test user
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('✅ User deletion successful');

    console.log('🎉 All database tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDatabaseSetup()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}