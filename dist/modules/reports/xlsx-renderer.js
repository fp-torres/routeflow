"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderXlsx = renderXlsx;
const exceljs_1 = __importDefault(require("exceljs"));
const types_1 = require("@routeflow/types");
const INK = 'FF13233B';
const STATUS_FILL = {
    Concluída: 'FFDDF3E6',
    'Não realizada': 'FFFBE0DE',
    Pendente: 'FFF1F3F6',
    'Em andamento': 'FFDCEBFB',
    Reagendada: 'FFFFF1D6',
    Expirada: 'FFF6CFCF',
    'Vencimento próximo': 'FFFBE0DE',
    'Vence em breve': 'FFFFF1D6',
    Válida: 'FFDDF3E6',
};
/** Excel formatado: cabeçalhos, filtros, larguras, datas, moeda, status e cabeçalho congelado. */
async function renderXlsx(report) {
    const wb = new exceljs_1.default.Workbook();
    wb.creator = 'RouteFlow';
    wb.created = report.generatedAt;
    wb.title = `RouteFlow — ${report.title}`;
    const summary = wb.addWorksheet('Resumo', { views: [{ showGridLines: false }] });
    summary.columns = [{ width: 42 }, { width: 28 }];
    summary.mergeCells('A1:B1');
    summary.getCell('A1').value = 'ROUTEFLOW — Relatório Operacional';
    summary.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
    summary.getRow(1).height = 28;
    summary.getCell('A2').value = report.title;
    summary.getCell('A2').font = { bold: true, size: 12 };
    summary.getCell('A3').value =
        `Período: ${(0, types_1.formatDateBR)(report.from)} — ${(0, types_1.formatDateBR)(report.to)}`;
    summary.getCell('A4').value =
        `Gerado em ${(0, types_1.formatDateTimeBR)(report.generatedAt, report.timeZone)}`;
    summary.getCell('A4').font = { italic: true, color: { argb: 'FF5B6B82' } };
    const header = summary.getRow(6);
    header.values = ['Indicador', 'Valor'];
    header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
    });
    report.kpis.forEach((kpi, i) => {
        const row = summary.getRow(7 + i);
        row.values = [kpi.label, kpi.value];
        row.getCell(2).alignment = { horizontal: 'right' };
    });
    if (report.conclusions.length) {
        const start = 9 + report.kpis.length;
        summary.getCell(`A${start}`).value = 'Conclusões';
        summary.getCell(`A${start}`).font = { bold: true, size: 12 };
        report.conclusions.forEach((line, i) => {
            summary.mergeCells(`A${start + 1 + i}:B${start + 1 + i}`);
            summary.getCell(`A${start + 1 + i}`).value = `• ${line}`;
            summary.getCell(`A${start + 1 + i}`).alignment = { wrapText: true, vertical: 'top' };
        });
    }
    for (const section of report.sections) {
        const ws = wb.addWorksheet(section.sheetName.slice(0, 31), {
            views: [{ state: 'frozen', ySplit: 1 }],
        });
        ws.columns = section.columns.map((c) => ({
            header: c.header,
            key: c.key,
            width: Math.max(10, Math.min(60, c.width * 1.4)),
        }));
        const head = ws.getRow(1);
        head.height = 22;
        head.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
            cell.alignment = { vertical: 'middle' };
        });
        for (const data of section.rows) {
            const values = {};
            for (const c of section.columns) {
                const v = data[c.key];
                if (v == null || v === '')
                    values[c.key] = null;
                else if (c.format === 'date')
                    values[c.key] = (0, types_1.isoToUtcDate)(String(v).slice(0, 10));
                else if (c.format === 'datetime')
                    values[c.key] = new Date(String(v));
                else
                    values[c.key] = v;
            }
            const row = ws.addRow(values);
            section.columns.forEach((c, i) => {
                const cell = row.getCell(i + 1);
                if (c.format === 'money')
                    cell.numFmt = '"R$" #,##0.00';
                if (c.format === 'date')
                    cell.numFmt = 'dd/mm/yyyy';
                if (c.format === 'datetime')
                    cell.numFmt = 'dd/mm/yyyy hh:mm';
                if (c.format === 'percent')
                    cell.numFmt = '0.0%';
                if (c.format === 'number')
                    cell.numFmt = '#,##0.##';
                if (c.format === 'status' && typeof cell.value === 'string' && STATUS_FILL[cell.value]) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: STATUS_FILL[cell.value] },
                    };
                }
                if (c.align === 'right')
                    cell.alignment = { horizontal: 'right' };
            });
        }
        ws.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: Math.max(1, section.rows.length + 1), column: section.columns.length },
        };
    }
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
//# sourceMappingURL=xlsx-renderer.js.map