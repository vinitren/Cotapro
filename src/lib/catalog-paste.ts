/**
 * Parse de texto colado para importação em lote no catálogo.
 * Formatos suportados:
 *   A) "Nome - 39,90"
 *   B) "Nome    39,90" (Excel: múltiplos espaços/tabs)
 * Valores: R$ 39,90 | 39,90 | 39.90
 */

export interface ParsedCatalogItem {
  name: string;
  unit_price: number;
}

export interface ParsePasteCatalogResult {
  items: ParsedCatalogItem[];
  invalidLines: number;
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/R\$\s*/gi, '').replace(/\s/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : Math.round(num * 100) / 100;
}

/**
 * Divide por linhas, ignora vazias, detecta formato A ou B, retorna itens válidos.
 */
export function parsePasteCatalog(text: string): ParsePasteCatalogResult {
  const lines = (text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedCatalogItem[] = [];
  let invalidLines = 0;

  for (const line of lines) {
    // Formato A: "Nome - 39,90"
    const matchA = line.match(/^(.+?)\s*-\s*([\d\s.,R$]+)$/);
    if (matchA) {
      const name = matchA[1].trim();
      const price = parsePrice(matchA[2]);
      if (name && price !== null && price >= 0) {
        items.push({ name, unit_price: price });
        continue;
      }
    }

    // Formato B: "Nome    39,90" (2+ espaços ou tabs)
    const matchB = line.match(/^(.+?)\s{2,}([\d\s.,R$]+)$/);
    if (matchB) {
      const name = matchB[1].trim();
      const price = parsePrice(matchB[2]);
      if (name && price !== null && price >= 0) {
        items.push({ name, unit_price: price });
        continue;
      }
    }

    invalidLines++;
  }

  return { items, invalidLines };
}
