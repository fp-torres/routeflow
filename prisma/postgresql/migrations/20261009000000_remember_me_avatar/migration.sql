-- RouteFlow: "Lembrar acesso" (sessão persistente x temporária) e foto de perfil.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarKey" VARCHAR(255),
ADD COLUMN     "avatarUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "persistent" BOOLEAN NOT NULL DEFAULT false;
