-- AlterTable
ALTER TABLE "Artwork" ALTER COLUMN "priceAmount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Book" ALTER COLUMN "priceAmount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "priceAmount" DROP DEFAULT;
