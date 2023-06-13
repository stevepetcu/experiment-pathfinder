-- CreateTable
CREATE TABLE "HighScore" (
    "id" STRING NOT NULL DEFAULT gen_random_uuid(),
    "name" STRING(255) NOT NULL,
    "timeToComplete" INT4 NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HighScore_pkey" PRIMARY KEY ("id")
);
