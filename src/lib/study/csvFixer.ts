const EXPECTED_COLS = 15;

export const LEGACY_CSV_HEADER = [
  'front', 'back', 'chapter', 'subject', 'lesson', 'type',
  'mc_correct', 'mc_distractor1', 'mc_distractor2', 'mc_distractor3',
  'tf_answer', 'explanation', 'enum_items', 'id_answer', 'id_variants',
].join(',');

export const STITCH_CSV_HEADER = [
  'deck_title', 'card_type', 'front', 'back', 'explanation', 'tags',
  'mc_distractor_1', 'mc_distractor_2', 'mc_distractor_3',
  'tf_correct', 'id_answer', 'id_acceptable_variants', 'enum_items', 'notes_content', 'image_keywords',
].join(',');

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function quoteField(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes(';')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function splitCSVRows(text: string): string[] {
  const rows: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        cur += '"';
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (cur.trim()) rows.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) rows.push(cur.trim());
  return rows;
}

export function auditAndFixCSV(csvText: string): string {
  const clean = csvText.replace(/^\uFEFF/, '').trim();
  const lines = splitCSVRows(clean);
  if (!lines.length) return '';

  const firstLine = lines[0].toLowerCase();

  // If already contains stitch/claude 15-column header, keep original header
  if (firstLine.includes('deck_title') || firstLine.includes('card_type')) {
    return clean;
  }

  // If already contains legacy header, keep original clean text
  if (firstLine.startsWith('front') && firstLine.includes('type')) {
    return clean;
  }

  // If no header detected, prepend legacy header
  return [LEGACY_CSV_HEADER, ...lines].join('\n');
}

export function isCSVInput(text: string): boolean {
  const firstLine = text.trim().split(/\r?\n/)[0]?.trim().toLowerCase() ?? '';
  return firstLine.startsWith('front') || firstLine.includes('deck_title') || firstLine.includes('card_type');
}
