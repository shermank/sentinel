-- Safely add role column (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
  END IF;
END $$;

-- FinalLetterStatus enum
CREATE TYPE "FinalLetterStatus" AS ENUM ('DRAFT', 'READY', 'DELIVERED');

-- final_letters table
CREATE TABLE "final_letters" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "recipientName"  TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "subject"        TEXT NOT NULL,
  "encryptedBody"  TEXT NOT NULL,
  "nonce"          TEXT NOT NULL,
  "status"         "FinalLetterStatus" NOT NULL DEFAULT 'DRAFT',
  "deliveredAt"    TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "final_letters_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "final_letters" ADD CONSTRAINT "final_letters_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "final_letters_userId_idx" ON "final_letters"("userId");
