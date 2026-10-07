/**
 * Testes de integração/API ponta a ponta. Rodam contra um banco REAL de teste:
 *   E2E_DATABASE_PROVIDER=postgresql E2E_DATABASE_URL=postgresql://.../routeflow_test npm run test:e2e
 *   E2E_DATABASE_PROVIDER=mysql      E2E_DATABASE_URL=mysql://.../routeflow_test      npm run test:e2e
 * ATENÇÃO: o banco é LIMPO no início. Por segurança, o nome precisa conter "test".
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import request from 'supertest';
import { addDaysIso, todayIso } from '@routeflow/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { loadConfig } from '../src/config/env';
import { DB } from '../src/database/database.module';
import type { Db } from '../src/database/prisma.types';
import { hashPassword, sha256 } from '../src/modules/auth/password';
import { SpreadsheetImporter } from '../src/modules/importer/spreadsheet-importer';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

const provider = (process.env.E2E_DATABASE_PROVIDER ??
  process.env.DATABASE_PROVIDER ??
  'postgresql') as 'postgresql' | 'mysql';
const url = process.env.E2E_DATABASE_URL ?? '';
const spreadsheet = path.resolve(__dirname, '../../../data/Controle_Profissional_de_Visitas.xlsx');

function pdfBuffer(text: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.text(text);
    doc.end();
  });
}

async function cleanDatabase(db: Db): Promise<void> {
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.refreshToken.deleteMany();
  await db.visitActivity.deleteMany();
  await db.visitPhoto.deleteMany();
  await db.transportExpense.deleteMany();
  await db.routeStop.deleteMany();
  await db.visit.updateMany({ data: { rescheduledFromId: null } });
  await db.visit.deleteMany();
  await db.route.deleteMany();
  await db.routeTemplateStop.deleteMany();
  await db.routeTemplate.deleteMany();
  await db.authorizationLetterHistory.deleteMany();
  await db.authorizationLetter.deleteMany();
  await db.homeAddress.deleteMany();
  await db.sharedAccess.deleteMany();
  await db.importRun.deleteMany();
  await db.transportFare.deleteMany();
  await db.companySetting.deleteMany();
  await db.store.deleteMany();
  await db.user.deleteMany();
}

const describeIfDb = url && /test/i.test(url) ? describe : describe.skip;

describeIfDb(`RouteFlow API — e2e (${provider})`, () => {
  let app: NestExpressApplication;
  let db: Db;
  let token = '';
  let refreshCookie = '';
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_PROVIDER: provider,
      DATABASE_URL: url,
      JWT_SECRET: 'e2e-secret-e2e-secret-e2e-secret-0123456789',
      STORAGE_PATH: fs.mkdtempSync(path.join(os.tmpdir(), 'routeflow-e2e-')),
      GEOCODING_PROVIDER: 'none',
      ROUTE_PROVIDER: 'estimate',
    });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(config)],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] });
    configureApp(app, config);
    await app.init();
    db = app.get<Db>(DB);
    await cleanDatabase(db);
    const user = await db.user.create({
      data: {
        name: 'Felipe',
        email: 'felipe@routeflow.test',
        passwordHash: await hashPassword('Teste@123456'),
        role: 'ADMIN',
      },
    });
    await db.transportFare.create({
      data: {
        type: 'BUS',
        operator: 'Ônibus (teste)',
        value: 4.7,
        effectiveFrom: new Date('2020-01-01'),
        verified: false,
      },
    });
    const result = await new SpreadsheetImporter(db).run(fs.readFileSync(spreadsheet), {
      employeeId: user.id,
      fileName: 'planilha.xlsx',
      userId: user.id,
    });
    expect(result.summary.stores!.created).toBe(43);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health responde { status: "ok" }', async () => {
    const res = await http().get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
    const details = await http().get('/api/health/details').expect(200);
    expect(details.body).toMatchObject({ database: 'up', provider });
  });

  it('autentica, recusa senha errada e renova a sessão com refresh token', async () => {
    const wrong = await http()
      .post('/api/auth/login')
      .send({ email: 'felipe@routeflow.test', password: 'errada' })
      .expect(401);
    expect(wrong.body.message).toBe('E-mail ou senha incorretos.');
    await http().get('/api/stores').expect(401);
    const res = await http()
      .post('/api/auth/login')
      .send({ email: 'felipe@routeflow.test', password: 'Teste@123456' })
      .expect(200);
    token = res.body.accessToken;
    refreshCookie = String(res.headers['set-cookie']).split(';')[0]!;
    expect(res.body.user).toMatchObject({ name: 'Felipe', role: 'ADMIN' });
    const refreshed = await http()
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    expect(refreshed.body.accessToken).toBeTruthy();
    // reuso de um token já rotacionado, fora da tolerância de abas simultâneas (20 s):
    // tratado como vazamento — todas as sessões do usuário são encerradas
    await db.refreshToken.update({
      where: { tokenHash: sha256(refreshCookie.slice('rf_rt='.length)) },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });
    await http().post('/api/auth/refresh').set('Cookie', refreshCookie).expect(401);
    const rotatedCookie = String(refreshed.headers['set-cookie']).split(';')[0]!;
    await http().post('/api/auth/refresh').set('Cookie', rotatedCookie).expect(401);
    const again = await http()
      .post('/api/auth/login')
      .send({ email: 'felipe@routeflow.test', password: 'Teste@123456' })
      .expect(200);
    token = again.body.accessToken;
  });

  it('lista as 43 lojas importadas com ordenação natural e busca', async () => {
    const res = await http().get('/api/stores?pageSize=100').set(auth()).expect(200);
    expect(res.body.total).toBe(43);
    const venancio = res.body.items
      .filter((s: { network: string }) => s.network === 'Drogaria Venancio')
      .map((s: { code: string }) => s.code);
    expect(venancio.indexOf('V7')).toBeLessThan(venancio.indexOf('V100'));
    const search = await http().get('/api/stores?search=copacabana').set(auth()).expect(200);
    expect(search.body.total).toBeGreaterThanOrEqual(8);
  });

  it('valida entradas com mensagens em português', async () => {
    const res = await http()
      .post('/api/expenses')
      .set(auth())
      .send({ date: '2026-13-40', type: 'BUS' })
      .expect(400);
    expect(res.body.message).toMatch(/inválidos/);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('monta a agenda semanal a partir das rotas importadas', async () => {
    const res = await http()
      .get('/api/agenda?from=2026-10-05&to=2026-10-11')
      .set(auth())
      .expect(200);
    const byDate = Object.fromEntries(
      res.body.days.map((d: { date: string; total: number }) => [d.date, d.total]),
    );
    expect(byDate['2026-10-07']).toBe(8);
    expect(byDate['2026-10-08']).toBe(12);
    expect(byDate['2026-10-09']).toBe(8);
    const monday = await http()
      .get('/api/agenda?from=2026-10-12&to=2026-10-12')
      .set(auth())
      .expect(200);
    expect(monday.body.days[0].holiday.name).toBe('Nossa Senhora Aparecida');
  });

  let routeId = '';
  it('detalha a rota com links do Google Maps divididos e trechos em transporte público', async () => {
    const list = await http()
      .get('/api/routes?from=2026-10-07&to=2026-10-13')
      .set(auth())
      .expect(200);
    expect(list.body.length).toBeGreaterThanOrEqual(5);
    routeId = list.body.find((r: { date: string }) => r.date === '2026-10-08').id;
    const res = await http().get(`/api/routes/${routeId}`).set(auth()).expect(200);
    expect(res.body.stops).toHaveLength(12);
    expect(res.body.stops[10].store.name).toBe('Farmácia Drogakar');
    expect(res.body.fullRouteLinks).toHaveLength(2);
    expect(res.body.legLinks).toHaveLength(13);
    expect(res.body.legLinks[0].url).toContain('travelmode=transit');
    expect(res.body.startAddress).toContain('Barão de Petrópolis, 572');
    expect(res.body.canOptimize).toBe(false);
    expect(res.body.nextStop.transitUrl).toContain('travelmode=transit');
    expect(res.body.nextStop.transitUrl).not.toContain('origin=');
    const preview = await http()
      .post(`/api/routes/${routeId}/optimize`)
      .set(auth())
      .send({ apply: false })
      .expect(200);
    expect(preview.body.canOptimize).toBe(false);
    const order = res.body.stops.map((s: { id: string }) => s.id);
    const swapped = [order[1], order[0], ...order.slice(2)];
    const reordered = await http()
      .put(`/api/routes/${routeId}/stops/order`)
      .set(auth())
      .send({ stopIds: swapped })
      .expect(200);
    expect(reordered.body.stops[0].id).toBe(order[1]);
  });

  it('otimiza (opcionalmente) quando há coordenadas', async () => {
    const route = (await http().get(`/api/routes/${routeId}`).set(auth()).expect(200)).body;
    await http()
      .put('/api/me/home-address')
      .set(auth())
      .send({ address: route.startAddress, latitude: -22.9235, longitude: -43.2112 })
      .expect(200);
    for (const [i, stop] of route.stops.entries()) {
      await http()
        .patch(`/api/stores/${stop.store.id}`)
        .set(auth())
        .send({ latitude: -22.98 + (i % 4) * 0.004, longitude: -43.2 + (i % 3) * 0.006 })
        .expect(200);
    }
    await db.route.update({
      where: { id: routeId },
      data: { startLatitude: -22.9235, startLongitude: -43.2112, legsComputedAt: null },
    });
    const preview = await http()
      .post(`/api/routes/${routeId}/optimize`)
      .set(auth())
      .send({ apply: false })
      .expect(200);
    expect(preview.body.canOptimize).toBe(true);
    expect(preview.body).toMatchObject({ method: 'exact', source: 'estimate', fixedStops: 0 });
    expect(preview.body.proposedDurationSeconds).toBeLessThanOrEqual(
      preview.body.currentDurationSeconds,
    );
    // Paradas já visitadas mantêm a posição; o restante é reorganizado a partir da última delas
    const firstVisit = route.stops[0].visit.id;
    await db.visit.update({ where: { id: firstVisit }, data: { status: 'COMPLETED' } });
    const midDay = await http()
      .post(`/api/routes/${routeId}/optimize`)
      .set(auth())
      .send({ apply: false })
      .expect(200);
    expect(midDay.body.fixedStops).toBe(1);
    expect(midDay.body.proposedOrder[0]).toBe(route.stops[0].id);
    await db.visit.update({ where: { id: firstVisit }, data: { status: 'PENDING' } });
    const applied = await http()
      .post(`/api/routes/${routeId}/optimize`)
      .set(auth())
      .send({ apply: true })
      .expect(200);
    expect(applied.body.applied).toBe(preview.body.improvementSeconds > 30);
    const detail = await http().post(`/api/routes/${routeId}/recalculate`).set(auth()).expect(200);
    expect(detail.body.estimatedDistance).toBeGreaterThan(0);
    expect(detail.body.legs[0].summary).toMatch(/estimativa/);
    expect(detail.body.legs[0].steps.length).toBeGreaterThan(0);
    expect(detail.body.legs[0].source).toBe('estimate');
  });

  let visitId = '';
  it('executa o fluxo da visita: iniciar, foto otimizada, atividade e finalizar', async () => {
    const visits = await http().get('/api/visits?date=2026-10-07').set(auth()).expect(200);
    expect(visits.body.total).toBe(8);
    visitId = visits.body.items[0].id;
    const started = await http()
      .post(`/api/visits/${visitId}/start`)
      .set(auth())
      .send({ latitude: -22.97, longitude: -43.18, accuracy: 25 })
      .expect(200);
    expect(started.body.visit.status).toBe('IN_PROGRESS');
    // primeira visita do dia é de uma loja Cristal: carta não exigida, sem aviso
    expect(started.body.warning).toBeNull();
    const original = await sharp({
      create: { width: 4032, height: 3024, channels: 3, background: '#c25b2c' },
    })
      .jpeg({ quality: 98 })
      .toBuffer();
    const upload = await http()
      .post(`/api/visits/${visitId}/photos`)
      .set(auth())
      .field('category', 'FACADE')
      .field('originalSizes', String(original.length))
      .attach('files', original, { filename: 'fachada.jpg', contentType: 'image/jpeg' })
      .expect(201);
    expect(upload.body[0]).toMatchObject({
      mimeType: 'image/webp',
      category: 'FACADE',
      width: 2048,
    });
    expect(upload.body[0].optimizedSize).toBeLessThan(upload.body[0].originalSize);
    const image = await http().get(upload.body[0].thumbnailUrl).expect(200);
    expect(image.headers['content-type']).toBe('image/webp');
    await http()
      .post(`/api/visits/${visitId}/photos`)
      .set(auth())
      .attach('files', Buffer.from('não é imagem'), 'x.jpg')
      .expect(415);
    await http()
      .post(`/api/visits/${visitId}/activities`)
      .set(auth())
      .send({ type: 'ACTIVITY', description: 'Reposição de produtos' })
      .expect(201);
    const finished = await http()
      .post(`/api/visits/${visitId}/finish`)
      .set(auth())
      .send({ status: 'COMPLETED', notes: 'Tudo certo', latitude: -22.97, longitude: -43.18 })
      .expect(200);
    expect(finished.body.visit.status).toBe('COMPLETED');
    expect(finished.body.visit.photos).toHaveLength(1);
    expect(
      finished.body.visit.activities.map((a: { description: string }) => a.description),
    ).toEqual(expect.arrayContaining(['Visita iniciada', 'Visita concluída']));
  });

  it('permite editar a visita depois de finalizada, mantendo o histórico', async () => {
    const before = (await http().get(`/api/visits/${visitId}`).set(auth()).expect(200)).body;
    const finishedAt = new Date(Date.parse(before.finishedAt) + 10 * 60_000).toISOString();
    const edited = await http()
      .patch(`/api/visits/${visitId}`)
      .set(auth())
      .send({ notes: 'Tudo certo — reposição concluída', finishedAt })
      .expect(200);
    expect(edited.body.notes).toBe('Tudo certo — reposição concluída');
    expect(edited.body.finishedAt).toBe(finishedAt);
    await http()
      .patch(`/api/visits/${visitId}`)
      .set(auth())
      .send({ startedAt: finishedAt, finishedAt: before.startedAt })
      .expect(400);
    const photo = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#2c7bc2' },
    })
      .jpeg()
      .toBuffer();
    await http()
      .post(`/api/visits/${visitId}/photos`)
      .set(auth())
      .field('category', 'DISPLAY')
      .attach('files', photo, { filename: 'gondola.jpg', contentType: 'image/jpeg' })
      .expect(201);
    const notDone = await http()
      .patch(`/api/visits/${visitId}`)
      .set(auth())
      .send({ status: 'NOT_COMPLETED', statusReason: 'Teste de correção' })
      .expect(200);
    expect(notDone.body.status).toBe('NOT_COMPLETED');
    const back = await http()
      .patch(`/api/visits/${visitId}`)
      .set(auth())
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect(back.body.status).toBe('COMPLETED');
    expect(back.body.photos).toHaveLength(2);
    expect(back.body.activities.map((a: { description: string }) => a.description)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^Visita editada após a finalização: observações, horário de término/,
        ),
      ]),
    );
  });

  it('reagenda uma visita pendente para uma data futura', async () => {
    const visits = await http().get('/api/visits?date=2026-10-09').set(auth()).expect(200);
    const target = addDaysIso(todayIso(), 3);
    const res = await http()
      .post(`/api/visits/${visits.body.items[0].id}/reschedule`)
      .set(auth())
      .send({ date: target, reason: 'Loja fechada' })
      .expect(201);
    expect(res.body.scheduledDate).toBe(target);
    expect(res.body.rescheduledFrom.id).toBe(visits.body.items[0].id);
  });

  let letterId = '';
  it('gerencia cartas de autorização em PDF com vencimento e histórico', async () => {
    const store = (await http().get('/api/stores?search=V47').set(auth()).expect(200)).body
      .items[0];
    const expiration = addDaysIso(todayIso(), 5);
    const created = await http()
      .post(`/api/stores/${store.id}/authorizations`)
      .set(auth())
      .field('title', 'Carta 2026')
      .field('expirationDate', expiration)
      .attach('file', await pdfBuffer('Carta de autorização'), {
        filename: 'carta.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    letterId = created.body.id;
    expect(created.body).toMatchObject({ validity: 'CRITICAL', daysLeft: 5 });
    expect(created.body.stores.map((s: { code: string }) => s.code)).toEqual(['V47']);
    // Carta da rede cobrindo várias lojas, com as datas da ação de cada uma
    const stores = (await http().get('/api/stores?pageSize=100').set(auth()).expect(200)).body
      .items;
    const byCode = (code: string) => stores.find((s: { code: string }) => s.code === code);
    const v9 = byCode('V9');
    const v72 = byCode('V72');
    const multi = await http()
      .post('/api/authorizations')
      .set(auth())
      .field('title', 'Autorização de Promotor — Out a Dez')
      .field('validFrom', todayIso())
      .field('expirationDate', addDaysIso(todayIso(), 60))
      .field('storeIds', `${v9.id},${v72.id}`)
      .field('storeDates', JSON.stringify({ [v9.id]: ['2026-12-08', '2026-10-08'] }))
      .attach('file', await pdfBuffer('Carta da rede'), {
        filename: 'carta-rede.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    expect(multi.body.network).toBe('Drogaria Venancio');
    expect(multi.body.stores).toHaveLength(2);
    expect(multi.body.stores.find((s: { code: string }) => s.code === 'V9').dates).toEqual([
      '2026-10-08',
      '2026-12-08',
    ]);
    await http()
      .post('/api/authorizations')
      .set(auth())
      .field('title', 'Sem lojas')
      .attach('file', await pdfBuffer('x'), { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(400);
    // tirar uma loja da carta; ao tirar a última, a carta é excluída
    const partial = await http()
      .delete(`/api/authorizations/${multi.body.id}/stores/${v72.id}`)
      .set(auth())
      .expect(200);
    expect(partial.body.letter.stores.map((s: { code: string }) => s.code)).toEqual(['V9']);
    const v9Info = (await http().get(`/api/stores/${v9.id}`).set(auth()).expect(200)).body
      .authorization;
    expect(v9Info).toMatchObject({ required: true, hasValid: true, validity: 'VALID' });
    // Cristal não exige carta; a exceção por loja continua possível
    const last = await http()
      .delete(`/api/authorizations/${multi.body.id}/stores/${v9.id}`)
      .set(auth())
      .expect(200);
    expect(last.body).toEqual({ deleted: true, letter: null });
    const v72Info = (await http().get(`/api/stores/${v72.id}`).set(auth()).expect(200)).body
      .authorization;
    expect(v72Info).toMatchObject({ required: true, hasValid: false });
    const malibu = byCode('CRI-DROGARIA-MALIBU');
    expect(malibu.authorization).toMatchObject({
      required: false,
      validity: 'NOT_REQUIRED',
      hasValid: true,
    });
    const forced = await http()
      .patch(`/api/stores/${malibu.id}`)
      .set(auth())
      .send({ authorizationRequired: true })
      .expect(200);
    expect(forced.body.authorization).toMatchObject({ required: true, hasValid: false });
    await http()
      .patch(`/api/stores/${malibu.id}`)
      .set(auth())
      .send({ authorizationRequired: null })
      .expect(200);
    const pdf = await http().get(created.body.url).expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    await http()
      .post(`/api/stores/${store.id}/authorizations`)
      .set(auth())
      .field('title', 'Falsa')
      .attach('file', Buffer.from('texto'), 'x.pdf')
      .expect(415);
    await http()
      .post(`/api/authorizations/${letterId}/file`)
      .set(auth())
      .attach('file', await pdfBuffer('Nova versão'), 'carta-v2.pdf')
      .expect(201);
    const history = await http()
      .get(`/api/authorizations/${letterId}/history`)
      .set(auth())
      .expect(200);
    expect(history.body.map((h: { action: string }) => h.action)).toEqual([
      'FILE_REPLACED',
      'CREATED',
    ]);
    const critical = await http()
      .get('/api/authorizations?validity=CRITICAL')
      .set(auth())
      .expect(200);
    expect(critical.body).toHaveLength(1);
    const notifications = app.get(NotificationsService);
    expect(await notifications.runDailyChecks()).toBeGreaterThan(0);
    const list = await http().get('/api/notifications').set(auth()).expect(200);
    expect(list.body.some((n: { type: string }) => n.type === 'AUTHORIZATION_EXPIRING')).toBe(true);
  });

  it('registra despesas com valor estimado e real e calcula o resumo', async () => {
    await http()
      .post('/api/expenses')
      .set(auth())
      .send({ date: todayIso(), type: 'BUS', estimatedValue: 4.7, actualValue: 5.1, visitId })
      .expect(201);
    await http()
      .post('/api/expenses')
      .set(auth())
      .send({ date: todayIso(), type: 'METRO', actualValue: 7.9 })
      .expect(201);
    const summary = await http().get('/api/expenses/summary').set(auth()).expect(200);
    expect(summary.body.day).toBeCloseTo(13, 2);
    expect(summary.body.byType.length).toBe(2);
  });

  it('entrega os dashboards do funcionário e do gestor', async () => {
    const dashboard = await http().get('/api/dashboard').set(auth()).expect(200);
    expect(dashboard.body.user.name).toBe('Felipe');
    expect(dashboard.body.authorizations.expiringIn7Days).toBe(1);
    expect(dashboard.body.authorizations.notRequired).toBe(9);
    expect(dashboard.body.charts.visitsByDay).toHaveLength(14);
    const manager = await http()
      .get('/api/dashboard/manager?from=2026-10-01&to=2026-10-31')
      .set(auth())
      .expect(200);
    expect(manager.body.totals.completed).toBe(1);
    expect(manager.body.byNetwork.map((n: { key: string }) => n.key)).toEqual(
      expect.arrayContaining(['Drogaria Venancio', 'Cristal']),
    );
  });

  it('exporta relatórios em PDF e Excel', async () => {
    const pdf = await http()
      .get('/api/reports/consolidated/pdf?from=2026-10-01&to=2026-10-31')
      .set(auth())
      .buffer(true)
      .expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(Buffer.from(pdf.body).subarray(0, 5).toString()).toBe('%PDF-');
    const xlsx = await http()
      .get('/api/reports/consolidated/xlsx?from=2026-10-01&to=2026-10-31')
      .set(auth())
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((xlsx.body as Buffer).subarray(0, 2).toString()).toBe('PK');
    const preview = await http()
      .get('/api/reports/visits/preview?from=2026-10-01&to=2026-10-31')
      .set(auth())
      .expect(200);
    expect(preview.body.kpis[0]).toMatchObject({ label: 'Visitas' });
  });

  it('compartilha um painel público somente leitura, com escopo e revogação', async () => {
    const created = await http()
      .post('/api/shared-access')
      .set(auth())
      .send({ label: 'Gestor', scope: ['visits', 'photos'] })
      .expect(201);
    expect(created.body.url).toContain(`/public/dashboard/${created.body.token}`);
    const panel = await http()
      .get(`/api/public/${created.body.token}?from=2026-10-01&to=2026-10-31`)
      .expect(200);
    expect(panel.body.metrics.totals.completed).toBe(1);
    expect(panel.body.recentVisits.length).toBeGreaterThan(0);
    await http().get(`/api/public/${created.body.token}/expenses`).expect(404);
    await http().post(`/api/public/${created.body.token}`).expect(404);
    // Não expira: pode ser copiado de novo, desativado e reativado; revogado é definitivo
    expect(created.body.expiresAt).toBeNull();
    const listed = await http().get('/api/shared-access').set(auth()).expect(200);
    expect(listed.body.find((l: { id: string }) => l.id === created.body.id).url).toBe(
      created.body.url,
    );
    await http()
      .patch(`/api/shared-access/${created.body.id}`)
      .set(auth())
      .send({ active: false })
      .expect(200);
    await http().get(`/api/public/${created.body.token}`).expect(404);
    await http()
      .patch(`/api/shared-access/${created.body.id}`)
      .set(auth())
      .send({ active: true })
      .expect(200);
    await http().get(`/api/public/${created.body.token}`).expect(200);
    await http().post(`/api/shared-access/${created.body.id}/revoke`).set(auth()).expect(200);
    await http().get(`/api/public/${created.body.token}`).expect(404);
    await http()
      .patch(`/api/shared-access/${created.body.id}`)
      .set(auth())
      .send({ active: true })
      .expect(400);
  });

  it('reimporta a planilha pela API sem duplicar dados', async () => {
    const res = await http()
      .post('/api/import/spreadsheet')
      .set(auth())
      .field('dryRun', 'true')
      .attach('file', fs.readFileSync(spreadsheet), 'planilha.xlsx')
      .expect(201);
    expect(res.body.summary.stores).toEqual({ created: 0, updated: 0, unchanged: 43 });
    expect(res.body.summary.visits.created).toBe(0);
  });

  it('registra a trilha de auditoria', async () => {
    const res = await http().get('/api/audit?pageSize=100').set(auth()).expect(200);
    const actions = res.body.items.map((i: { action: string }) => i.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'auth.login',
        'visit.start',
        'visit.finish',
        'photo.upload',
        'authorization.create',
        'report.generate',
      ]),
    );
  });

  it('"Lembrar acesso": sessão persistente ou temporária, e "Sair" encerra de verdade', async () => {
    const credentials = { email: 'felipe@routeflow.test', password: 'Teste@123456' };
    const refreshCookie = (res: { headers: Record<string, unknown> }) =>
      ([] as string[])
        .concat((res.headers['set-cookie'] as string[]) ?? [])
        .find((c) => c.startsWith('rf_rt='))!;
    // desmarcado: cookie de sessão (sem validade) — some ao fechar o navegador
    const temporary = await http().post('/api/auth/login').send(credentials).expect(200);
    expect(refreshCookie(temporary)).toMatch(/HttpOnly/i);
    expect(refreshCookie(temporary)).not.toMatch(/Expires=/i);
    // marcado: cookie com validade (~30 dias) — continua após fechar o navegador/reiniciar
    const remembered = await http()
      .post('/api/auth/login')
      .send({ ...credentials, remember: true })
      .expect(200);
    const cookie = refreshCookie(remembered);
    expect(Date.parse(/Expires=([^;]+)/i.exec(cookie)![1]!) - Date.now()).toBeGreaterThan(
      29 * 86_400_000,
    );
    // reabrir o sistema: a renovação restaura o acesso e mantém a persistência (token rotacionado)
    const first = cookie.split(';')[0]!;
    const reopened = await http().post('/api/auth/refresh').set('Cookie', first).expect(200);
    expect(reopened.body.user.email).toBe('felipe@routeflow.test');
    const rotated = refreshCookie(reopened);
    expect(rotated).toMatch(/Expires=/i);
    expect(rotated.split(';')[0]).not.toBe(first);
    // outra aba renovando ao mesmo tempo com o token anterior não derruba o acesso
    await http().post('/api/auth/refresh').set('Cookie', first).expect(200);
    // Sair: revoga a sessão e apaga os cookies; o cookie antigo não entra mais
    const current = rotated.split(';')[0]!;
    const out = await http().post('/api/auth/logout').set('Cookie', current).expect(204);
    expect(String(out.headers['set-cookie'])).toMatch(/rf_rt=;/);
    await http().post('/api/auth/refresh').set('Cookie', current).expect(401);
    // sessão inválida -> 401 (o app leva para /login)
    await http().post('/api/auth/refresh').set('Cookie', 'rf_rt=token-invalido').expect(401);
  });

  it('salva a foto de perfil otimizada, mostra em /me e permite remover', async () => {
    const photo = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: '#7aa64c' },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
    const uploaded = await http()
      .post('/api/users/me/avatar')
      .set(auth())
      .attach('file', photo, { filename: 'eu.jpg', contentType: 'image/jpeg' })
      .expect(201);
    expect(uploaded.body.avatarUrl).toBeTruthy();
    const image = await http().get(uploaded.body.avatarUrl).expect(200);
    expect(image.headers['content-type']).toBe('image/webp');
    const meta = await sharp(image.body as Buffer).metadata();
    expect([meta.width, meta.height]).toEqual([384, 384]);
    expect((image.body as Buffer).length).toBeLessThan(photo.length / 10);
    const me = await http().get('/api/auth/me').set(auth()).expect(200);
    expect(me.body.avatarUrl).toBe(uploaded.body.avatarUrl);
    await http()
      .post('/api/users/me/avatar')
      .set(auth())
      .attach('file', Buffer.from('não é imagem'), 'x.jpg')
      .expect(415);
    const removed = await http().delete('/api/users/me/avatar').set(auth()).expect(200);
    expect(removed.body.avatarUrl).toBeNull();
    await http().get(uploaded.body.avatarUrl).expect(404);
  });

  it('cria usuária funcionária com permissões restritas e transfere a operação', async () => {
    const me = (await http().get('/api/users/me').set(auth()).expect(200)).body;
    const created = await http()
      .post('/api/users')
      .set(auth())
      .send({
        name: 'Maria',
        email: 'maria@routeflow.test',
        password: 'Maria@123456',
        role: 'EMPLOYEE',
      })
      .expect(201);
    expect(created.body).toMatchObject({ name: 'Maria', role: 'EMPLOYEE', active: true });
    await http()
      .post('/api/users')
      .set(auth())
      .send({ name: 'Outra', email: 'maria@routeflow.test', password: 'Maria@123456' })
      .expect(409);
    const login = await http()
      .post('/api/auth/login')
      .send({ email: 'maria@routeflow.test', password: 'Maria@123456' })
      .expect(200);
    const maria = { Authorization: `Bearer ${login.body.accessToken}` };
    await http().get('/api/users').set(maria).expect(403);
    // qualquer perfil pode excluir uma carta (exclusão lógica, com histórico)
    await http().delete(`/api/authorizations/${letterId}`).set(maria).expect(204);
    await http().get(`/api/authorizations/${letterId}`).set(auth()).expect(404);
    await http()
      .post('/api/users')
      .set(maria)
      .send({ name: 'X', email: 'x@routeflow.test', password: 'Senha@123456' })
      .expect(403);
    await http().patch('/api/settings').set(maria).send({ companyName: 'Outra' }).expect(403);
    await http()
      .post('/api/shared-access')
      .set(maria)
      .send({ label: 'Teste', scope: ['visits'] })
      .expect(403);
    // funcionária vê só os próprios dados (pedir os de outro usuário é ignorado)
    const own = await http().get(`/api/dashboard?employeeId=${me.id}`).set(maria).expect(200);
    expect(own.body.user.name).toBe('Maria');
    expect(
      (await http().get('/api/routes?from=2026-10-07&to=2026-10-13').set(maria).expect(200)).body,
    ).toHaveLength(0);
    // administrador transfere a programação importada para a Maria
    const transfer = await http()
      .post(`/api/users/${created.body.id}/transfer-operation`)
      .set(auth())
      .send({ fromUserId: me.id, includePast: true })
      .expect(201);
    expect(transfer.body.routes).toBeGreaterThanOrEqual(5);
    expect(transfer.body.templates).toBe(1);
    expect(transfer.body.homeAddressCopied).toBe(true);
    const routes = await http()
      .get('/api/routes?from=2026-10-07&to=2026-10-13')
      .set(maria)
      .expect(200);
    expect(routes.body.length).toBeGreaterThanOrEqual(5);
    // administrador acompanha o dia da Maria ("visualizando como")
    const viewAs = await http()
      .get(`/api/dashboard?employeeId=${created.body.id}`)
      .set(auth())
      .expect(200);
    expect(viewAs.body.user.name).toBe('Maria');
    // proteções e gestão de acesso
    await http().patch(`/api/users/${me.id}`).set(auth()).send({ role: 'EMPLOYEE' }).expect(400);
    await http()
      .post(`/api/users/${created.body.id}/password`)
      .set(auth())
      .send({ password: 'NovaSenha@2026' })
      .expect(204);
    await http()
      .post('/api/auth/login')
      .send({ email: 'maria@routeflow.test', password: 'Maria@123456' })
      .expect(401);
    await http()
      .patch(`/api/users/${created.body.id}`)
      .set(auth())
      .send({ active: false })
      .expect(200);
    await http()
      .post('/api/auth/login')
      .send({ email: 'maria@routeflow.test', password: 'NovaSenha@2026' })
      .expect(401);
  });
});
