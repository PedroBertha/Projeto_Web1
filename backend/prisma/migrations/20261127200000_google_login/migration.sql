-- Login com Google: contas criadas pelo Google não têm senha, e "google_id"
-- guarda o identificador ("sub") da conta Google vinculada.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_id" VARCHAR(255),
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
