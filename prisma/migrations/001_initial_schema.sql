-- ClaimFlow Initial Database Schema
-- HIPAA-compliant insurance claims management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'VALIDATING', 'READY', 'SUBMITTED', 'PROCESSING', 'PAID', 'DENIED', 'APPEALED');
CREATE TYPE "SubmissionMethod" AS ENUM ('ELECTRONIC', 'PDF');
CREATE TYPE "DocumentType" AS ENUM ('RECEIPT', 'INSURANCE_CARD', 'CLAIM_FORM', 'APPEAL_LETTER');
CREATE TYPE "NotificationType" AS ENUM ('CLAIM_STATUS_CHANGE', 'VALIDATION_COMPLETE', 'SUBMISSION_COMPLETE', 'PAYMENT_RECEIVED');

-- Users table with encrypted PHI
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "dob" TIMESTAMP(3),
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Insurance profiles with encrypted sensitive data
CREATE TABLE "insurance_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insurer" TEXT NOT NULL,
    "plan" TEXT,
    "memberId" TEXT NOT NULL,
    "groupId" TEXT,
    "payerId" TEXT,
    "address" TEXT,
    "cardImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_profiles_pkey" PRIMARY KEY ("id")
);

-- Claims with comprehensive tracking
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerName" TEXT,
    "providerNpi" TEXT,
    "dateOfService" TIMESTAMP(3),
    "amountCents" INTEGER NOT NULL,
    "cptCodes" TEXT[],
    "icdCodes" TEXT[],
    "status" "ClaimStatus" NOT NULL,
    "submissionMethod" "SubmissionMethod" NOT NULL,
    "denialReason" TEXT,
    "paidAmountCents" INTEGER,
    "confidenceScore" DOUBLE PRECISION,
    "timeline" JSONB NOT NULL,
    "receiptUrls" TEXT[],
    "validationResults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- Claim documents and attachments
CREATE TABLE "claim_documents" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_documents_pkey" PRIMARY KEY ("id")
);

-- User notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- HIPAA audit logging
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "insurance_profiles_userId_key" ON "insurance_profiles"("userId");

-- Create performance indexes
CREATE INDEX "claims_userId_idx" ON "claims"("userId");
CREATE INDEX "claims_status_idx" ON "claims"("status");
CREATE INDEX "claims_dateOfService_idx" ON "claims"("dateOfService");
CREATE INDEX "claim_documents_claimId_idx" ON "claim_documents"("claimId");
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_read_idx" ON "notifications"("read");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- Add foreign key constraints
ALTER TABLE "insurance_profiles" ADD CONSTRAINT "insurance_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security (RLS) for HIPAA compliance
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "insurance_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "claim_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "users_own_data" ON "users" FOR ALL USING (id = current_setting('app.current_user_id')::text);
CREATE POLICY "insurance_own_data" ON "insurance_profiles" FOR ALL USING ("userId" = current_setting('app.current_user_id')::text);
CREATE POLICY "claims_own_data" ON "claims" FOR ALL USING ("userId" = current_setting('app.current_user_id')::text);
CREATE POLICY "notifications_own_data" ON "notifications" FOR ALL USING ("userId" = current_setting('app.current_user_id')::text);

-- Claim documents policy (access through claim ownership)
CREATE POLICY "claim_documents_own_data" ON "claim_documents" FOR ALL USING (
    "claimId" IN (
        SELECT "id" FROM "claims" WHERE "userId" = current_setting('app.current_user_id')::text
    )
);