# RouteFlow — pacote de produção

Node.js 22 · entrada: dist/main.js · start: npm start · build: não precisa (pacote pré-compilado).

Variáveis obrigatórias: NODE_ENV=production, DATABASE_PROVIDER=mysql, DATABASE_URL, JWT_SECRET (48+ caracteres), APP_URL, TRUST_PROXY=true, STORAGE_PATH (pasta FORA desta aplicação).

Sem terminal: MIGRATE_ON_START=true aplica as migrations ao iniciar; SEED_ON_START=true (só no 1º deploy, com SEED_USER_EMAIL e SEED_USER_PASSWORD) cria o usuário e importa a planilha.

Com terminal: npm install --omit=dev && npm run db:deploy && npm run db:seed && npm start

Guia completo: docs/deployment.md no repositório.
