import PDFDocument from 'pdfkit';
import { formatDateBR, formatDateTimeBR } from '@routeflow/types';
import type { ReportCell, ReportColumn, ReportData } from './report.types';

const INK = '#13233B';
const SEA = '#0E63B8';
const LINE = '#F05A28';
const MUTED = '#5B6B82';
const BORDER = '#D9E0EA';
const ZEBRA = '#F4F7FB';

function formatCell(value: ReportCell, column: ReportColumn, timeZone: string): string {
  if (value == null || value === '') return '—';
  switch (column.format) {
    case 'money':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        Number(value),
      );
    case 'percent':
      return `${(Number(value) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    case 'number':
      return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    case 'date':
      return formatDateBR(String(value));
    case 'datetime':
      return formatDateTimeBR(String(value), timeZone);
    default:
      return String(value);
  }
}

/** Marca RouteFlow desenhada em vetor: linha de rota com paradas. */
function drawLogo(doc: PDFKit.PDFDocument, x: number, y: number): void {
  doc.save();
  doc
    .lineWidth(3)
    .strokeColor(LINE)
    .moveTo(x, y + 14)
    .bezierCurveTo(x + 8, y - 2, x + 16, y + 30, x + 26, y + 10)
    .stroke();
  doc.circle(x, y + 14, 4).fill('#FFFFFF');
  doc.circle(x + 26, y + 10, 4).fill(LINE);
  doc.restore();
}

/**
 * PDF profissional (não é impressão de tela): cabeçalho com marca, período,
 * indicadores, gráfico, tabelas com cabeçalho repetido, paginação e rodapé.
 */
export function renderPdf(report: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 36, bottom: 50, left: 36, right: 36 },
    bufferPages: true,
    info: {
      Title: `RouteFlow — ${report.title}`,
      Author: 'RouteFlow',
      Subject: 'Relatório operacional',
    },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(chunks))),
  );

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom;

  // Cabeçalho
  doc.rect(0, 0, doc.page.width, 78).fill(INK);
  drawLogo(doc, left, 26);
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor('#FFFFFF')
    .text('RouteFlow', left + 38, 22, { lineBreak: false });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#C9D4E5')
    .text('Gestão inteligente de operações em campo', left + 38, 46, { lineBreak: false });
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#FFFFFF')
    .text(report.title, left, 24, { width, align: 'right' });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#C9D4E5')
    .text(`${formatDateBR(report.from)} — ${formatDateBR(report.to)}`, left, 44, {
      width,
      align: 'right',
    });

  let y = 96;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(INK).text('Relatório Operacional', left, y);
  y += 22;
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MUTED)
    .text(`Gerado em ${formatDateTimeBR(report.generatedAt, report.timeZone)}`, left, y);
  y += 22;

  // Indicadores
  if (report.kpis.length) {
    const perRow = Math.min(report.kpis.length, 6);
    const gap = 8;
    const boxW = (width - gap * (perRow - 1)) / perRow;
    report.kpis.forEach((kpi, index) => {
      const col = index % perRow;
      const row = Math.floor(index / perRow);
      const bx = left + col * (boxW + gap);
      const by = y + row * 58;
      doc.roundedRect(bx, by, boxW, 50, 6).lineWidth(0.8).fillAndStroke('#FFFFFF', BORDER);
      doc.rect(bx, by + 8, 3, 34).fill(index === 0 ? LINE : SEA);
      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor(INK)
        .text(kpi.value, bx + 12, by + 9, { width: boxW - 18, lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(kpi.label, bx + 12, by + 31, { width: boxW - 18, lineBreak: false });
    });
    y += Math.ceil(report.kpis.length / perRow) * 58 + 10;
  }

  // Gráfico de barras (visitas por dia)
  if (report.chart && report.chart.points.length) {
    const chartH = 120;
    if (y + chartH + 30 > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(report.chart.title, left, y);
    y += 18;
    const points = report.chart.points.slice(-31);
    const max = Math.max(1, ...points.map((p) => p.total));
    const slot = width / points.length;
    const barW = Math.min(18, slot * 0.6);
    doc
      .moveTo(left, y + chartH)
      .lineTo(left + width, y + chartH)
      .lineWidth(0.6)
      .strokeColor(BORDER)
      .stroke();
    points.forEach((p, i) => {
      const bx = left + i * slot + (slot - barW) / 2;
      const totalH = (p.total / max) * (chartH - 14);
      const doneH = (p.completed / max) * (chartH - 14);
      doc.rect(bx, y + chartH - totalH, barW, totalH).fill('#C9D8EE');
      if (doneH > 0) doc.rect(bx, y + chartH - doneH, barW, doneH).fill(SEA);
      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor(MUTED)
        .text(p.label, left + i * slot, y + chartH + 3, {
          width: slot,
          align: 'center',
          lineBreak: false,
        });
      if (p.total > 0)
        doc
          .fontSize(7)
          .fillColor(INK)
          .text(String(p.total), bx - 4, y + chartH - totalH - 9, {
            width: barW + 8,
            align: 'center',
            lineBreak: false,
          });
    });
    doc.rect(left, y + chartH + 16, 8, 8).fill(SEA);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text('Concluídas', left + 12, y + chartH + 16, { lineBreak: false });
    doc.rect(left + 80, y + chartH + 16, 8, 8).fill('#C9D8EE');
    doc.text('Programadas', left + 92, y + chartH + 16, { lineBreak: false });
    y += chartH + 34;
  }

  // Tabelas
  for (const section of report.sections.filter((s) => s.pdf !== false)) {
    const totalWeight = section.columns.reduce((acc, c) => acc + c.width, 0);
    const widths = section.columns.map((c) => (c.width / totalWeight) * width);
    const drawHeader = () => {
      doc.rect(left, y, width, 18).fill(INK);
      let x = left;
      section.columns.forEach((c, i) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#FFFFFF')
          .text(c.header, x + 4, y + 5, {
            width: widths[i]! - 8,
            align: c.align ?? 'left',
            lineBreak: false,
            ellipsis: true,
          });
        x += widths[i]!;
      });
      y += 18;
    };
    if (y + 60 > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(INK)
      .text(`${section.title} (${section.rows.length})`, left, y);
    y += 18;
    if (section.rows.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(9)
        .fillColor(MUTED)
        .text('Nenhum registro no período.', left, y);
      y += 24;
      continue;
    }
    drawHeader();
    section.rows.forEach((row, rowIndex) => {
      const texts = section.columns.map((c) => formatCell(row[c.key] ?? null, c, report.timeZone));
      doc.font('Helvetica').fontSize(7.5);
      const height = Math.max(
        16,
        ...texts.map((t, i) => doc.heightOfString(t, { width: widths[i]! - 8 }) + 8),
      );
      if (y + height > bottom()) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }
      if (rowIndex % 2 === 1) doc.rect(left, y, width, height).fill(ZEBRA);
      let x = left;
      texts.forEach((t, i) => {
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(INK)
          .text(t, x + 4, y + 4, {
            width: widths[i]! - 8,
            align: section.columns[i]!.align ?? 'left',
          });
        x += widths[i]!;
      });
      y += height;
      doc
        .moveTo(left, y)
        .lineTo(left + width, y)
        .lineWidth(0.4)
        .strokeColor(BORDER)
        .stroke();
    });
    y += 18;
  }

  if (report.conclusions.length) {
    if (y + 80 > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text('Conclusões', left, y);
    y += 18;
    for (const line of report.conclusions) {
      doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(`•  ${line}`, left, y, { width });
      y = doc.y + 4;
    }
  }

  // Rodapé com paginação em todas as páginas
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const fy = doc.page.height - 32;
    doc
      .moveTo(left, fy - 6)
      .lineTo(left + width, fy - 6)
      .lineWidth(0.5)
      .strokeColor(BORDER)
      .stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED);
    doc.text('RouteFlow — Gestão inteligente de operações em campo', left, fy, {
      lineBreak: false,
    });
    doc.text(`Gerado em ${formatDateTimeBR(report.generatedAt, report.timeZone)}`, left, fy, {
      width,
      align: 'center',
      lineBreak: false,
    });
    doc.text(`Página ${i - range.start + 1} de ${range.count}`, left, fy, {
      width,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = savedBottom;
  }
  doc.end();
  return done;
}
