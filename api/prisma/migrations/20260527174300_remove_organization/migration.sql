-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_inviter_id_fkey";

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT "members_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "members" DROP CONSTRAINT "members_user_id_fkey";

-- AlterTable
ALTER TABLE "courses" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "active_organization_id";

-- DropTable
DROP TABLE "invitations";

-- DropTable
DROP TABLE "members";

-- DropTable
DROP TABLE "organizations";
