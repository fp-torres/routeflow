// Configuração do Prisma CLI (Prisma 7). Caminhos relativos a este arquivo.
// Use sempre pelos scripts do package.json (npm run db:*), que validam o
// provider e impedem migrations no banco errado.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'schema.prisma',
  migrations: {
    path: 'migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    // Usado por 'migrate dev' e pela verificação de divergência do CI
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
