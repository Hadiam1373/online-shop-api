-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "recipientFirstName" TEXT,
ADD COLUMN "recipientLastName" TEXT,
ADD COLUMN "recipientPhone" TEXT,
ADD COLUMN "province" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "deliveryNotes" TEXT;
