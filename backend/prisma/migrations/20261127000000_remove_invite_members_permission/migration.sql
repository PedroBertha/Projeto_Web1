-- Convidar membros passa a ser exclusivo de ADMIN: remove INVITE_MEMBERS do
-- enum project_permission. O PostgreSQL não remove valores de um enum, então o
-- tipo é recriado e o valor é retirado das listas já gravadas.

ALTER TYPE "project_permission" RENAME TO "project_permission_old";

CREATE TYPE "project_permission" AS ENUM ('MANAGE_COLUMNS', 'CREATE_TASKS', 'EDIT_TASKS', 'MOVE_TASKS', 'DELETE_TASKS', 'ASSIGN_TASKS', 'UPLOAD_ATTACHMENTS');

ALTER TABLE "project_members" ALTER COLUMN "permissions" DROP DEFAULT;
ALTER TABLE "project_members" ALTER COLUMN "permissions" TYPE "project_permission"[]
  USING array_remove("permissions"::text[], 'INVITE_MEMBERS')::"project_permission"[];
ALTER TABLE "project_members" ALTER COLUMN "permissions" SET DEFAULT ARRAY['CREATE_TASKS', 'EDIT_TASKS', 'MOVE_TASKS', 'UPLOAD_ATTACHMENTS']::"project_permission"[];

ALTER TABLE "invitations" ALTER COLUMN "permissions" DROP DEFAULT;
ALTER TABLE "invitations" ALTER COLUMN "permissions" TYPE "project_permission"[]
  USING array_remove("permissions"::text[], 'INVITE_MEMBERS')::"project_permission"[];
ALTER TABLE "invitations" ALTER COLUMN "permissions" SET DEFAULT ARRAY['CREATE_TASKS', 'EDIT_TASKS', 'MOVE_TASKS', 'UPLOAD_ATTACHMENTS']::"project_permission"[];

DROP TYPE "project_permission_old";
