-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "studentId" TEXT,
    "date" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "department" TEXT,
    "time" TEXT,
    "contact" TEXT,
    "note" TEXT,
    "floor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TEXT,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "title" TEXT NOT NULL DEFAULT 'Đăng ký lên văn phòng',
    "registrationLimit" JSONB,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_config_pkey" PRIMARY KEY ("id")
);
