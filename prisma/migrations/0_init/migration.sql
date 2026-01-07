Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUYER', 'REALTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OverallImpression" AS ENUM ('LOVED', 'LIKED', 'NEUTRAL', 'DISLIKED');

-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'TRANSCRIBING', 'TRANSCRIBED', 'ANALYZED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "price" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "sqft" INTEGER,
    "yearBuilt" INTEGER,
    "propertyType" TEXT,
    "listingStatus" TEXT,
    "images" TEXT[],
    "description" TEXT,
    "features" TEXT[],
    "rawApiData" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseBuyer" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "addedByRealtorId" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "matchScore" DOUBLE PRECISION,
    "notes" TEXT,
    "realtorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HouseBuyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "overallImpression" "OverallImpression",
    "wouldBuy" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "audioUrl" TEXT,
    "audioSize" INTEGER,
    "audioDuration" INTEGER,
    "status" "RecordingStatus" NOT NULL DEFAULT 'UPLOADING',
    "transcript" TEXT,
    "detectedLanguage" TEXT,
    "sentiment" TEXT,
    "keyPoints" TEXT[],
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordingPhoto" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoSize" INTEGER,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecordingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "buyerId" TEXT,
    "status" "TourStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourStop" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "visitId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "estimatedTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TourStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerRealtor" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BuyerRealtor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DreamHouseProfile" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "profile" JSONB,
    "trainingChats" JSONB[],
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DreamHouseProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReport" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "language" TEXT NOT NULL DEFAULT 'en',
    "content" JSONB,
    "ranking" JSONB,
    "recommendedHouseId" TEXT,
    "dealBreakers" JSONB,
    "insights" JSONB,
    "housesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "recordingsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "generationStartedAt" TIMESTAMP(3),
    "generationCompletedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AIReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "shareReportWithRealtor" BOOLEAN NOT NULL DEFAULT false,
    "shareDreamHouseProfile" BOOLEAN NOT NULL DEFAULT false,
    "shareRecordings" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestBody" JSONB,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "duration" INTEGER,
    "errorMessage" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "House_externalId_key" ON "House"("externalId");

-- CreateIndex
CREATE INDEX "House_externalId_idx" ON "House"("externalId");

-- CreateIndex
CREATE INDEX "House_city_state_idx" ON "House"("city", "state");

-- CreateIndex
CREATE INDEX "House_deletedAt_idx" ON "House"("deletedAt");

-- CreateIndex
CREATE INDEX "HouseBuyer_buyerId_idx" ON "HouseBuyer"("buyerId");

-- CreateIndex
CREATE INDEX "HouseBuyer_houseId_idx" ON "HouseBuyer"("houseId");

-- CreateIndex
CREATE INDEX "HouseBuyer_deletedAt_idx" ON "HouseBuyer"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HouseBuyer_houseId_buyerId_key" ON "HouseBuyer"("houseId", "buyerId");

-- CreateIndex
CREATE INDEX "Visit_buyerId_idx" ON "Visit"("buyerId");

-- CreateIndex
CREATE INDEX "Visit_houseId_idx" ON "Visit"("houseId");

-- CreateIndex
CREATE INDEX "Visit_status_idx" ON "Visit"("status");

-- CreateIndex
CREATE INDEX "Visit_scheduledAt_idx" ON "Visit"("scheduledAt");

-- CreateIndex
CREATE INDEX "Visit_deletedAt_idx" ON "Visit"("deletedAt");

-- CreateIndex
CREATE INDEX "Recording_visitId_idx" ON "Recording"("visitId");

-- CreateIndex
CREATE INDEX "Recording_buyerId_idx" ON "Recording"("buyerId");

-- CreateIndex
CREATE INDEX "Recording_status_idx" ON "Recording"("status");

-- CreateIndex
CREATE INDEX "Recording_deletedAt_idx" ON "Recording"("deletedAt");

-- CreateIndex
CREATE INDEX "RecordingPhoto_recordingId_idx" ON "RecordingPhoto"("recordingId");

-- CreateIndex
CREATE INDEX "RecordingPhoto_deletedAt_idx" ON "RecordingPhoto"("deletedAt");

-- CreateIndex
CREATE INDEX "Tour_realtorId_idx" ON "Tour"("realtorId");

-- CreateIndex
CREATE INDEX "Tour_buyerId_idx" ON "Tour"("buyerId");

-- CreateIndex
CREATE INDEX "Tour_status_idx" ON "Tour"("status");

-- CreateIndex
CREATE INDEX "Tour_deletedAt_idx" ON "Tour"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TourStop_visitId_key" ON "TourStop"("visitId");

-- CreateIndex
CREATE INDEX "TourStop_tourId_idx" ON "TourStop"("tourId");

-- CreateIndex
CREATE INDEX "TourStop_orderIndex_idx" ON "TourStop"("orderIndex");

-- CreateIndex
CREATE INDEX "TourStop_deletedAt_idx" ON "TourStop"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TourStop_tourId_houseId_key" ON "TourStop"("tourId", "houseId");

-- CreateIndex
CREATE INDEX "BuyerRealtor_buyerId_idx" ON "BuyerRealtor"("buyerId");

-- CreateIndex
CREATE INDEX "BuyerRealtor_realtorId_idx" ON "BuyerRealtor"("realtorId");

-- CreateIndex
CREATE INDEX "BuyerRealtor_deletedAt_idx" ON "BuyerRealtor"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerRealtor_buyerId_realtorId_key" ON "BuyerRealtor"("buyerId", "realtorId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_realtorId_idx" ON "Invite"("realtorId");

-- CreateIndex
CREATE INDEX "Invite_email_idx" ON "Invite"("email");

-- CreateIndex
CREATE INDEX "Invite_token_idx" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_status_idx" ON "Invite"("status");

-- CreateIndex
CREATE INDEX "Invite_deletedAt_idx" ON "Invite"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DreamHouseProfile_buyerId_key" ON "DreamHouseProfile"("buyerId");

-- CreateIndex
CREATE INDEX "DreamHouseProfile_buyerId_idx" ON "DreamHouseProfile"("buyerId");

-- CreateIndex
CREATE INDEX "AIReport_buyerId_idx" ON "AIReport"("buyerId");

-- CreateIndex
CREATE INDEX "AIReport_status_idx" ON "AIReport"("status");

-- CreateIndex
CREATE INDEX "AIReport_deletedAt_idx" ON "AIReport"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacySettings_buyerId_key" ON "PrivacySettings"("buyerId");

-- CreateIndex
CREATE INDEX "PrivacySettings_buyerId_idx" ON "PrivacySettings"("buyerId");

-- CreateIndex
CREATE INDEX "ApiLog_service_idx" ON "ApiLog"("service");

-- CreateIndex
CREATE INDEX "ApiLog_createdAt_idx" ON "ApiLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_userId_idx" ON "ApiLog"("userId");

-- CreateIndex
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_runAt_idx" ON "Job"("runAt");

-- AddForeignKey
ALTER TABLE "HouseBuyer" ADD CONSTRAINT "HouseBuyer_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseBuyer" ADD CONSTRAINT "HouseBuyer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseBuyer" ADD CONSTRAINT "HouseBuyer_addedByRealtorId_fkey" FOREIGN KEY ("addedByRealtorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingPhoto" ADD CONSTRAINT "RecordingPhoto_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourStop" ADD CONSTRAINT "TourStop_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourStop" ADD CONSTRAINT "TourStop_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourStop" ADD CONSTRAINT "TourStop_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRealtor" ADD CONSTRAINT "BuyerRealtor_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRealtor" ADD CONSTRAINT "BuyerRealtor_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DreamHouseProfile" ADD CONSTRAINT "DreamHouseProfile_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReport" ADD CONSTRAINT "AIReport_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

