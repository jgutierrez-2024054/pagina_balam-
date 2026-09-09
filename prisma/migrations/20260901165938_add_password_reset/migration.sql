-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "priceAmount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "priceAmount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "priceAmount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpires" TIMESTAMP(3);
