// Database seed script for ClaimFlow system
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.appeal.deleteMany();
    await prisma.claimTimeline.deleteMany();
    await prisma.document.deleteMany();
    await prisma.claim.deleteMany();
    await prisma.insuranceProfile.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.cPTCode.deleteMany();
    await prisma.iCDCode.deleteMany();
    await prisma.systemConfig.deleteMany();
  }

  // Create system configuration
  console.log('⚙️ Creating system configuration...');
  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'SYSTEM_VERSION',
        value: '1.0.0',
        description: 'Current system version',
        category: 'SYSTEM',
      },
      {
        key: 'MAX_FILE_SIZE_MB',
        value: '10',
        description: 'Maximum file upload size in MB',
        category: 'UPLOAD',
      },
      {
        key: 'ALLOWED_FILE_TYPES',
        value: 'pdf,jpg,jpeg,png,tiff',
        description: 'Allowed file types for upload',
        category: 'UPLOAD',
      },
      {
        key: 'OCR_CONFIDENCE_THRESHOLD',
        value: '0.8',
        description: 'Minimum OCR confidence threshold',
        category: 'OCR',
      },
      {
        key: 'AI_VALIDATION_ENABLED',
        value: 'true',
        description: 'Enable AI-powered claim validation',
        category: 'AI',
      },
      {
        key: 'NOTIFICATION_EMAIL_ENABLED',
        value: 'true',
        description: 'Enable email notifications',
        category: 'NOTIFICATIONS',
      },
      {
        key: 'AUDIT_LOG_RETENTION_DAYS',
        value: '2555', // 7 years
        description: 'Audit log retention period in days',
        category: 'COMPLIANCE',
      },
    ],
  });

  // Create sample CPT codes
  console.log('🏥 Creating CPT codes...');
  await prisma.cPTCode.createMany({
    data: [
      {
        code: '99213',
        description: 'Office or other outpatient visit for the evaluation and management of an established patient',
        category: 'Evaluation and Management',
        averagePrice: 150.00,
        medicarePrice: 110.00,
      },
      {
        code: '99214',
        description: 'Office or other outpatient visit for the evaluation and management of an established patient',
        category: 'Evaluation and Management',
        averagePrice: 200.00,
        medicarePrice: 165.00,
      },
      {
        code: '99215',
        description: 'Office or other outpatient visit for the evaluation and management of an established patient',
        category: 'Evaluation and Management',
        averagePrice: 280.00,
        medicarePrice: 230.00,
      },
      {
        code: '90834',
        description: 'Psychotherapy, 45 minutes',
        category: 'Mental Health',
        averagePrice: 120.00,
        medicarePrice: 95.00,
      },
      {
        code: '90837',
        description: 'Psychotherapy, 60 minutes',
        category: 'Mental Health',
        averagePrice: 160.00,
        medicarePrice: 130.00,
      },
      {
        code: '93000',
        description: 'Electrocardiogram, routine ECG with at least 12 leads',
        category: 'Cardiovascular',
        averagePrice: 85.00,
        medicarePrice: 65.00,
      },
      {
        code: '85025',
        description: 'Blood count; complete (CBC), automated',
        category: 'Laboratory',
        averagePrice: 45.00,
        medicarePrice: 35.00,
      },
      {
        code: '80053',
        description: 'Comprehensive metabolic panel',
        category: 'Laboratory',
        averagePrice: 65.00,
        medicarePrice: 50.00,
      },
      {
        code: '73060',
        description: 'Radiologic examination, knee; 2 views',
        category: 'Radiology',
        averagePrice: 180.00,
        medicarePrice: 140.00,
      },
      {
        code: '73070',
        description: 'Radiologic examination, elbow; 2 views',
        category: 'Radiology',
        averagePrice: 160.00,
        medicarePrice: 125.00,
      },
    ],
  });

  // Create sample ICD codes
  console.log('📋 Creating ICD codes...');
  await prisma.iCDCode.createMany({
    data: [
      {
        code: 'Z00.00',
        description: 'Encounter for general adult medical examination without abnormal findings',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z00.01',
        description: 'Encounter for general adult medical examination with abnormal findings',
        category: 'Factors influencing health status',
      },
      {
        code: 'F32.9',
        description: 'Major depressive disorder, single episode, unspecified',
        category: 'Mental and behavioral disorders',
      },
      {
        code: 'F41.1',
        description: 'Generalized anxiety disorder',
        category: 'Mental and behavioral disorders',
      },
      {
        code: 'I10',
        description: 'Essential (primary) hypertension',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'M25.561',
        description: 'Pain in right knee',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M25.562',
        description: 'Pain in left knee',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'R06.02',
        description: 'Shortness of breath',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R50.9',
        description: 'Fever, unspecified',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
    ],
  });

  // Create demo users
  console.log('👥 Creating demo users...');
  const hashedPassword = await bcrypt.hash('Demo123!', 12);
  
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@claimflow.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      phone: '+1-555-0123',
      dateOfBirth: new Date('1985-06-15'),
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      emailVerified: new Date(),
      isActive: true,
    },
  });

  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Patient',
      phone: '+1-555-0456',
      dateOfBirth: new Date('1990-03-22'),
      address: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      emailVerified: new Date(),
      isActive: true,
    },
  });

  // Create sample insurance profiles
  console.log('🏥 Creating insurance profiles...');
  const demoInsurance = await prisma.insuranceProfile.create({
    data: {
      userId: demoUser.id,
      insurerName: 'Blue Cross Blue Shield',
      insurerId: 'BCBS',
      payerId: '12345',
      planName: 'PPO Gold Plan',
      planType: 'PPO',
      groupNumber: 'GRP001',
      memberNumber: 'MEM123456789', // In production, this would be encrypted
      memberName: 'Demo User', // In production, this would be encrypted
      memberDateOfBirth: new Date('1985-06-15'), // In production, this would be encrypted
      policyNumber: 'POL987654321', // In production, this would be encrypted
      effectiveDate: new Date('2024-01-01'),
      expirationDate: new Date('2024-12-31'),
      copayAmount: 25.00,
      deductibleAmount: 1500.00,
      outOfPocketMax: 6000.00,
      isPrimary: true,
      verificationStatus: 'VERIFIED',
      ocrConfidence: 0.95,
      manuallyVerified: true,
    },
  });

  const testInsurance = await prisma.insuranceProfile.create({
    data: {
      userId: testUser.id,
      insurerName: 'Aetna',
      insurerId: 'AETNA',
      payerId: '67890',
      planName: 'HMO Standard',
      planType: 'HMO',
      groupNumber: 'GRP002',
      memberNumber: 'MEM987654321', // In production, this would be encrypted
      memberName: 'Test Patient', // In production, this would be encrypted
      memberDateOfBirth: new Date('1990-03-22'), // In production, this would be encrypted
      policyNumber: 'POL123456789', // In production, this would be encrypted
      effectiveDate: new Date('2024-01-01'),
      expirationDate: new Date('2024-12-31'),
      copayAmount: 20.00,
      deductibleAmount: 2000.00,
      outOfPocketMax: 7000.00,
      isPrimary: true,
      verificationStatus: 'VERIFIED',
      ocrConfidence: 0.88,
      manuallyVerified: false,
    },
  });

  // Create sample claims
  console.log('📄 Creating sample claims...');
  const demoClaim1 = await prisma.claim.create({
    data: {
      userId: demoUser.id,
      insuranceProfileId: demoInsurance.id,
      claimNumber: 'CLM-2024-001',
      dateOfService: new Date('2024-01-15'),
      providerName: 'Dr. Smith Medical Center',
      providerNPI: '1234567890',
      providerAddress: '789 Medical Blvd, San Francisco, CA 94105',
      amountCents: 15000, // $150.00
      cptCodes: ['99213'],
      icdCodes: ['Z00.00'],
      description: 'Annual physical examination',
      notes: 'Routine checkup, all vitals normal',
      status: 'SUBMITTED',
      submissionMethod: 'ELECTRONIC',
      submittedAt: new Date('2024-01-16'),
      submissionId: 'SUB-2024-001',
      confirmationNumber: 'CONF-ABC123',
      aiValidationScore: 0.92,
      validationErrors: [],
      validationWarnings: ['Consider adding preventive care modifier'],
    },
  });

  const demoClaim2 = await prisma.claim.create({
    data: {
      userId: demoUser.id,
      insuranceProfileId: demoInsurance.id,
      dateOfService: new Date('2024-01-22'),
      providerName: 'Mental Health Associates',
      providerNPI: '0987654321',
      amountCents: 12000, // $120.00
      cptCodes: ['90834'],
      icdCodes: ['F32.9'],
      description: 'Psychotherapy session',
      notes: 'Individual therapy session for depression',
      status: 'DRAFT',
      aiValidationScore: 0.85,
      validationErrors: [],
      validationWarnings: [],
    },
  });

  const testClaim = await prisma.claim.create({
    data: {
      userId: testUser.id,
      insuranceProfileId: testInsurance.id,
      claimNumber: 'CLM-2024-002',
      dateOfService: new Date('2024-01-20'),
      providerName: 'Urgent Care Plus',
      providerNPI: '1122334455',
      amountCents: 8500, // $85.00
      cptCodes: ['93000'],
      icdCodes: ['R06.02'],
      description: 'ECG for chest pain evaluation',
      status: 'PROCESSING',
      submissionMethod: 'ELECTRONIC',
      submittedAt: new Date('2024-01-21'),
      submissionId: 'SUB-2024-002',
      confirmationNumber: 'CONF-XYZ789',
      aiValidationScore: 0.78,
      validationErrors: [],
      validationWarnings: ['Verify diagnosis code specificity'],
    },
  });

  // Create claim timeline entries
  console.log('📅 Creating claim timeline...');
  await prisma.claimTimeline.createMany({
    data: [
      {
        claimId: demoClaim1.id,
        type: 'CREATED',
        title: 'Claim Created',
        description: 'Claim was created and saved as draft',
        newStatus: 'DRAFT',
        createdAt: new Date('2024-01-15T14:30:00Z'),
      },
      {
        claimId: demoClaim1.id,
        type: 'SUBMITTED',
        title: 'Claim Submitted',
        description: 'Claim was submitted electronically to insurance company',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        createdAt: new Date('2024-01-16T10:15:00Z'),
      },
      {
        claimId: testClaim.id,
        type: 'CREATED',
        title: 'Claim Created',
        description: 'Claim was created and saved as draft',
        newStatus: 'DRAFT',
        createdAt: new Date('2024-01-20T09:45:00Z'),
      },
      {
        claimId: testClaim.id,
        type: 'SUBMITTED',
        title: 'Claim Submitted',
        description: 'Claim was submitted electronically to insurance company',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        createdAt: new Date('2024-01-21T11:20:00Z'),
      },
      {
        claimId: testClaim.id,
        type: 'PROCESSING',
        title: 'Processing Started',
        description: 'Insurance company has started processing the claim',
        previousStatus: 'SUBMITTED',
        newStatus: 'PROCESSING',
        createdAt: new Date('2024-01-22T08:30:00Z'),
      },
    ],
  });

  // Create sample notifications
  console.log('🔔 Creating notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        title: 'Claim Submitted Successfully',
        message: 'Your claim CLM-2024-001 has been submitted to Blue Cross Blue Shield.',
        type: 'CLAIM_STATUS_UPDATE',
        channels: ['EMAIL', 'IN_APP'],
        relatedEntityType: 'Claim',
        relatedEntityId: demoClaim1.id,
        sentAt: new Date('2024-01-16T10:16:00Z'),
      },
      {
        userId: testUser.id,
        title: 'Claim Processing Update',
        message: 'Your claim CLM-2024-002 is now being processed by Aetna.',
        type: 'CLAIM_STATUS_UPDATE',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        relatedEntityType: 'Claim',
        relatedEntityId: testClaim.id,
        sentAt: new Date('2024-01-22T08:31:00Z'),
      },
      {
        userId: demoUser.id,
        title: 'Welcome to ClaimFlow',
        message: 'Welcome to ClaimFlow! Start by adding your insurance information.',
        type: 'WELCOME',
        channels: ['EMAIL', 'IN_APP'],
        isRead: true,
        readAt: new Date('2024-01-10T12:00:00Z'),
        sentAt: new Date('2024-01-10T12:00:00Z'),
      },
    ],
  });

  // Create audit log entries
  console.log('📊 Creating audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: demoUser.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: demoUser.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: true,
        createdAt: new Date('2024-01-15T08:00:00Z'),
      },
      {
        userId: demoUser.id,
        action: 'CLAIM_CREATE',
        entityType: 'Claim',
        entityId: demoClaim1.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: true,
        createdAt: new Date('2024-01-15T14:30:00Z'),
      },
      {
        userId: demoUser.id,
        action: 'CLAIM_SUBMIT',
        entityType: 'Claim',
        entityId: demoClaim1.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: true,
        createdAt: new Date('2024-01-16T10:15:00Z'),
      },
      {
        userId: testUser.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: testUser.id,
        ipAddress: '10.0.0.50',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        success: true,
        createdAt: new Date('2024-01-20T09:30:00Z'),
      },
    ],
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`
📊 Seeded data summary:
- Users: 2
- Insurance Profiles: 2
- Claims: 3
- CPT Codes: 10
- ICD Codes: 10
- Timeline Entries: 5
- Notifications: 3
- Audit Logs: 4
- System Config: 7 entries

🔐 Demo credentials:
- Email: demo@claimflow.com
- Password: Demo123!

- Email: test@example.com
- Password: Demo123!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });