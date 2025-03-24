-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mappings" (
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "oauth_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_mappings_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "warranties" (
    "warranty_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "purchase_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "additional_info" TEXT,
    "receipt_image_url" TEXT NOT NULL,
    "product_image_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warranties_pkey" PRIMARY KEY ("warranty_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_user_mappings_oauth_id" ON "user_mappings"("oauth_id");

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_mappings"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warranties_updated_at
    BEFORE UPDATE ON warranties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();