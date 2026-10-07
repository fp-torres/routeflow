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
import { hashPassword } from '../src/modules/auth/password';
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
    await http().post('/api/auth/refresh').set('Cookie', refreshCookie).expect(401);
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
    expect(preview.body.proposedDistanceKm).toBeLessThanOrEqual(preview.body.currentDistanceKm);
    const detail = await http().post(`/api/routes/${routeId}/recalculate`).set(auth()).expect(200);
    expect(detail.body.estimatedDistance).toBeGreaterThan(0);
    expect(detail.body.legs[0].summary).toMatch(/estimativa/);
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
    expect(started.body.warning).toMatch(/autorização/);
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
    await http().post(`/api/shared-access/${created.body.id}/revoke`).set(auth()).expect(200);
    await http().get(`/api/public/${created.body.token}`).expect(404);
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
});
