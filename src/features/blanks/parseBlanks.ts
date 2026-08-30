/**
 * Pure TypeScript Blanks Extractor
 * Identifies keywords, terms, and blank candidates without external npm packages.
 */

export interface BlankItem {
  id: string;
  originalText: string;
  blankedText: string;
  targetTerm: string;
  variants: string[];
}

export function extractBlanksFromText(text: string): BlankItem[] {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const items: BlankItem[] = [];

  sentences.forEach((sentence, idx) => {
    // Find candidate terms: words inside quotes, capitalized phrases, or technical terms
    const termMatch =
      sentence.match(/"([^"]+)"/) ||
      sentence.match(/\b([A-Z][a-zA-Z0-9_-]+(?:\s+[A-Z][a-zA-Z0-9_-]+)?)\b/) ||
      sentence.match(/\b(\w{5,})\b/);

    if (termMatch && termMatch[1]) {
      const term = termMatch[1];
      const blanked = sentence.replace(term, "__________");
      items.push({
        id: `blank-${idx}`,
        originalText: sentence,
        blankedText: blanked,
        targetTerm: term,
        variants: [term.toLowerCase()],
      });
    }
  });

  return items;
}
