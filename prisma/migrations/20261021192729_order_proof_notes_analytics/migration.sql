-- CreateTable
CREATE TABLE "OrderInternalNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderInternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPaymentProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderPaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "itemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderInternalNote_orderId_createdAt_idx" ON "OrderInternalNote"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderPaymentProof_orderId_key" ON "OrderPaymentProof"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderPaymentProof_storageName_key" ON "OrderPaymentProof"("storageName");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventKey_createdAt_idx" ON "AnalyticsEvent"("eventKey", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_itemId_eventKey_idx" ON "AnalyticsEvent"("itemId", "eventKey");

-- AddForeignKey
ALTER TABLE "OrderInternalNote" ADD CONSTRAINT "OrderInternalNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderInternalNote" ADD CONSTRAINT "OrderInternalNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPaymentProof" ADD CONSTRAINT "OrderPaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
