-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'DENIED', 'APPEALED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionMethod" AS ENUM ('ELECTRONIC', 'PAPER', 'FAX', 'PORTAL');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RECEIPT', 'INSURANCE_CARD', 'MEDICAL_RECORD', 'PRESCRIPTION', 'REFERRAL', 'AUTHORIZATION', 'APPEAL_LETTER', 'CORRESPONDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('PRIVATE', 'SHARED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "InsuranceVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('CREATED', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'DENIED', 'APPEALED', 'PAID', 'DOCUMENT_ADDED', 'STATUS_CHANGED', 'NOTE_ADDED', 'ERROR_OCCURRED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AppealOutcome" AS ENUM ('APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'PENDING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CLAIM_STATUS_UPDATE', 'PAYMENT_RECEIVED', 'DOCUMENT_REQUIRED', 'APPEAL_UPDATE', 'SYSTEM_ALERT', 'REMINDER', 'WELCOME', 'SECURITY_ALERT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "password" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insurerName" TEXT NOT NULL,
    "insurerId" TEXT,
    "payerId" TEXT,
    "planName" TEXT,
    "planType" TEXT,
    "groupNumber" TEXT,
    "memberNumber" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "memberDateOfBirth" TIMESTAMP(3),
    "policyNumber" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "copayAmount" DECIMAL(10,2),
    "deductibleAmount" DECIMAL(10,2),
    "outOfPocketMax" DECIMAL(10,2),
    "frontImageUrl" TEXT,
    "backImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "InsuranceVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "ocrConfidence" DOUBLE PRECISION,
    "ocrProcessedAt" TIMESTAMP(3),
    "manuallyVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insuranceProfileId" TEXT,
    "claimNumber" TEXT,
    "externalClaimId" TEXT,
    "dateOfService" TIMESTAMP(3) NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerNPI" TEXT,
    "providerAddress" TEXT,
    "facilityName" TEXT,
    "amountCents" INTEGER NOT NULL,
    "paidAmountCents" INTEGER,
    "patientResponsibilityCents" INTEGER,
    "cptCodes" TEXT[],
    "icdCodes" TEXT[],
    "modifiers" TEXT[],
    "description" TEXT,
    "notes" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "submissionMethod" "SubmissionMethod",
    "submittedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "submissionId" TEXT,
    "confirmationNumber" TEXT,
    "clearinghouseId" TEXT,
    "aiValidationScore" DOUBLE PRECISION,
    "aiSuggestions" JSONB,
    "validationErrors" TEXT[],
    "validationWarnings" TEXT[],
    "appealCount" INTEGER NOT NULL DEFAULT 0,
    "lastAppealDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "url" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "category" TEXT,
    "ocrText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "ocrProcessedAt" TIMESTAMP(3),
    "extractedData" JSONB,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryptionKey" TEXT,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_timeline" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "type" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "previousStatus" "ClaimStatus",
    "newStatus" "ClaimStatus",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "appealNumber" TEXT,
    "denialReason" TEXT NOT NULL,
    "appealReason" TEXT NOT NULL,
    "appealLetter" TEXT,
    "status" "AppealStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "responseReceivedAt" TIMESTAMP(3),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "outcome" "AppealOutcome",
    "outcomeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channels" "NotificationChannel"[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpt_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "averagePrice" DECIMAL(10,2),
    "medicarePrice" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icd_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "icdVersion" TEXT NOT NULL DEFAULT 'ICD-10',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icd_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claimNumber_key" ON "claims"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "documents_s3Key_key" ON "documents"("s3Key");

-- CreateIndex
CREATE UNIQUE INDEX "appeals_appealNumber_key" ON "appeals"("appealNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cpt_codes_code_key" ON "cpt_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "icd_codes_code_key" ON "icd_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "insurance_profiles_userId_idx" ON "insurance_profiles"("userId");

-- CreateIndex
CREATE INDEX "insurance_profiles_isActive_idx" ON "insurance_profiles"("isActive");

-- CreateIndex
CREATE INDEX "claims_userId_idx" ON "claims"("userId");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_dateOfService_idx" ON "claims"("dateOfService");

-- CreateIndex
CREATE INDEX "claims_submittedAt_idx" ON "claims"("submittedAt");

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "documents"("userId");

-- CreateIndex
CREATE INDEX "documents_claimId_idx" ON "documents"("claimId");

-- CreateIndex
CREATE INDEX "documents_documentType_idx" ON "documents"("documentType");

-- CreateIndex
CREATE INDEX "claim_timeline_claimId_idx" ON "claim_timeline"("claimId");

-- CreateIndex
CREATE INDEX "claim_timeline_createdAt_idx" ON "claim_timeline"("createdAt");

-- CreateIndex
CREATE INDEX "appeals_claimId_idx" ON "appeals"("claimId");

-- CreateIndex
CREATE INDEX "appeals_status_idx" ON "appeals"("status");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "cpt_codes_code_idx" ON "cpt_codes"("code");

-- CreateIndex
CREATE INDEX "cpt_codes_category_idx" ON "cpt_codes"("category");

-- CreateIndex
CREATE INDEX "icd_codes_code_idx" ON "icd_codes"("code");

-- CreateIndex
CREATE INDEX "icd_codes_category_idx" ON "icd_codes"("category");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_profiles" ADD CONSTRAINT "insurance_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_insuranceProfileId_fkey" FOREIGN KEY ("insuranceProfileId") REFERENCES "insurance_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_timeline" ADD CONSTRAINT "claim_timeline_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;