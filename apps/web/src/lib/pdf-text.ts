/**
 * Extrai o texto de um PDF no navegador (pdf.js), reconstruindo as linhas pela posição
 * dos textos na página — base para ler as filiais e datas de uma carta de autorização.
 * O pdf.js é carregado sob demanda (só quando uma carta é enviada).
 */
export async function extractPdfLines(file: File, maxPages = 6): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const lines: string[] = [];
  try {
    const doc = await task.promise;
    for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items = content.items
        .filter(
          (i): i is typeof i & { str: string; transform: number[] } => 'str' in i && !!i.str.trim(),
        )
        .map((i) => ({ text: i.str.trim(), x: i.transform[4] ?? 0, y: i.transform[5] ?? 0 }))
        .sort((a, b) => b.y - a.y || a.x - b.x);
      // agrupa textos da mesma linha (pequena variação vertical)
      let row: typeof items = [];
      const flush = () => {
        if (row.length)
          lines.push(
            row
              .sort((a, b) => a.x - b.x)
              .map((i) => i.text)
              .join(' '),
          );
        row = [];
      };
      for (const item of items) {
        if (row.length && Math.abs(row[0]!.y - item.y) > 3) flush();
        row.push(item);
      }
      flush();
    }
  } finally {
    await task.destroy();
  }
  return lines;
}
