-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'RENT', 'VACATION');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'VILLA', 'DUPLEX', 'PENTHOUSE', 'CHALET', 'LAND', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('FULLY', 'SEMI', 'UNFURNISHED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'INSTALLMENTS');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('OFF_PLAN', 'READY');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "PropertySourceType" AS ENUM ('MANUAL', 'IMPORTED');

-- CreateEnum
CREATE TYPE "PropertyMediaKind" AS ENUM ('IMAGE', 'PANORAMA_360', 'SPIN_360_FRAME');

-- CreateEnum
CREATE TYPE "PasswordResetTokenType" AS ENUM ('OTP', 'VERIFIED_TOKEN');

-- CreateEnum
CREATE TYPE "CommunityReaction" AS ENUM ('LIKE', 'LOVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT,
    "avatarPath" TEXT,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL,
    "isCompanyAccount" BOOLEAN NOT NULL DEFAULT false,
    "companyOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "feesPaid" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "projectName" TEXT,
    "unitCode" TEXT,
    "inventoryStatus" TEXT,
    "transaction" "TransactionType" NOT NULL,
    "type" "PropertyType" NOT NULL,
    "price" INTEGER,
    "rentPrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "pricePerSqm" INTEGER,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "areaSqm" INTEGER NOT NULL,
    "landArea" INTEGER,
    "gardenArea" INTEGER,
    "roofArea" INTEGER,
    "hasGarden" BOOLEAN NOT NULL DEFAULT false,
    "hasRoof" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "furnishing" "Furnishing" NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "completionStatus" "CompletionStatus" NOT NULL,
    "amenities" TEXT[],
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "installmentDownPayment" INTEGER,
    "installmentYears" INTEGER,
    "installmentMonthly" INTEGER,
    "sourceType" "PropertySourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceFile" TEXT,
    "sourceSheet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyMedia" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "kind" "PropertyMediaKind" NOT NULL DEFAULT 'IMAGE',
    "path" TEXT NOT NULL,
    "label" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "notes" TEXT,
    "suggestedSlots" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "queryJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerMessage" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "imagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" "CommunityReaction" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostCommentLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityListingLike" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityListingLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityListingComment" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityListingComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityListingCommentLike" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityListingCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "PasswordResetTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_companyOwnerId_idx" ON "User"("companyOwnerId");

-- CreateIndex
CREATE INDEX "Listing_userId_status_idx" ON "Listing"("userId", "status");

-- CreateIndex
CREATE INDEX "Listing_status_updatedAt_idx" ON "Listing"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Property_listingId_key" ON "Property"("listingId");

-- CreateIndex
CREATE INDEX "Property_transaction_type_idx" ON "Property"("transaction", "type");

-- CreateIndex
CREATE INDEX "Property_city_area_district_idx" ON "Property"("city", "area", "district");

-- CreateIndex
CREATE INDEX "Property_projectName_idx" ON "Property"("projectName");

-- CreateIndex
CREATE INDEX "Property_unitCode_idx" ON "Property"("unitCode");

-- CreateIndex
CREATE INDEX "Property_sourceType_idx" ON "Property"("sourceType");

-- CreateIndex
CREATE INDEX "PropertyMedia_propertyId_sortOrder_idx" ON "PropertyMedia"("propertyId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_propertyId_key" ON "Favorite"("userId", "propertyId");

-- CreateIndex
CREATE INDEX "Appointment_userId_status_idx" ON "Appointment"("userId", "status");

-- CreateIndex
CREATE INDEX "Appointment_propertyId_status_idx" ON "Appointment"("propertyId", "status");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_createdAt_idx" ON "SavedSearch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SellerMessage_sellerId_createdAt_idx" ON "SellerMessage"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "SellerMessage_buyerId_createdAt_idx" ON "SellerMessage"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "SellerMessage_appointmentId_idx" ON "SellerMessage"("appointmentId");

-- CreateIndex
CREATE INDEX "CommunityPost_userId_createdAt_idx" ON "CommunityPost"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostLike_postId_userId_key" ON "CommunityPostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "CommunityPostComment_postId_createdAt_idx" ON "CommunityPostComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPostComment_parentCommentId_idx" ON "CommunityPostComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "CommunityPostCommentLike_postId_idx" ON "CommunityPostCommentLike"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostCommentLike_commentId_userId_key" ON "CommunityPostCommentLike"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityListingLike_listingId_userId_key" ON "CommunityListingLike"("listingId", "userId");

-- CreateIndex
CREATE INDEX "CommunityListingComment_listingId_createdAt_idx" ON "CommunityListingComment"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityListingComment_parentCommentId_idx" ON "CommunityListingComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "CommunityListingCommentLike_listingId_idx" ON "CommunityListingCommentLike"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityListingCommentLike_commentId_userId_key" ON "CommunityListingCommentLike"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_type_expiresAt_idx" ON "PasswordResetToken"("email", "type", "expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_type_expiresAt_idx" ON "PasswordResetToken"("userId", "type", "expiresAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyOwnerId_fkey" FOREIGN KEY ("companyOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMedia" ADD CONSTRAINT "PropertyMedia_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerMessage" ADD CONSTRAINT "SellerMessage_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerMessage" ADD CONSTRAINT "SellerMessage_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerMessage" ADD CONSTRAINT "SellerMessage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerMessage" ADD CONSTRAINT "SellerMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "CommunityPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostCommentLike" ADD CONSTRAINT "CommunityPostCommentLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostCommentLike" ADD CONSTRAINT "CommunityPostCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostCommentLike" ADD CONSTRAINT "CommunityPostCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityListingLike" ADD CONSTRAINT "CommunityListingLike_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityListingLike" ADD CONSTRAINT "CommunityListingLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityListingComment" ADD CONSTRAINT "CommunityListingComment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityListingComment" ADD CONSTRAINT "CommunityListingComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityListingComment" ADD CONSTRAINT "CommunityListingComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "CommunityListingComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityListingCommentLike" ADD CONSTRAINT "CommunityListingCommentLike_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityListingCommentLike" ADD CONSTRAINT "CommunityListingCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityListingComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityListingCommentLike" ADD CONSTRAINT "CommunityListingCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
