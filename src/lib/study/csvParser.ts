import type { Deck, Card, QuizItem, CardType } from './types';
import { auditAndFixCSV } from './csvFixer';
import { extractSmartTitle } from './titleExtractor';

interface CSVRow {
  deck_title?: string;
  front: string;
  back: string;
  chapter?: string;
  subject?: string;
  lesson?: string;
  type: string;
  tags?: string;
  mc_correct?: string;
  mc_distractor1?: string;
  mc_distractor2?: string;
  mc_distractor3?: string;
  tf_answer?: string;
  tf_correct?: string;
  explanation?: string;
  enum_items?: string;
  id_answer?: string;
  id_variants?: string;
  id_acceptable_variants?: string;
  notes_content?: string;
  image_keywords?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
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

function parseCSV(text: string): { rows: CSVRow[]; inferredDeckTitle: string } {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  const lines = splitCSVRows(cleanText);

  if (lines.length < 2) return { rows: [], inferredDeckTitle: '' };

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/['"]/g, ''));
  const rows: CSVRow[] = [];
  let inferredDeckTitle = '';

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((key, idx) => {
      row[key] = (values[idx] ?? '').trim().replace(/^["']|["']$/g, '');
    });

    if (row.deck_title && !inferredDeckTitle) {
      inferredDeckTitle = row.deck_title;
    }

    const rawType = (row.card_type || row.type || 'definition').toLowerCase().trim();
    const cleanType = ['definition', 'keyword', 'multiple_choice', 'true_false', 'enumeration', 'identification'].includes(rawType)
      ? rawType
      : rawType === 'mc' ? 'multiple_choice'
      : rawType === 'tf' ? 'true_false'
      : rawType === 'enum' ? 'enumeration'
      : rawType === 'id' ? 'identification'
      : 'definition';

    // Parse front and back safely from their respective named columns
    const front = row.front || '';
    const back = row.back || row.id_answer || row.mc_correct || row.tf_correct || row.tf_answer || '';

    // Derive clean chapter tag
    let chapter = row.chapter || '';
    if (!chapter && row.tags) {
      chapter = row.tags.split(/[;,]/)[0]?.trim() || '';
    }
    if (!chapter) {
      chapter = cleanType === 'definition' ? 'Definition' : cleanType === 'true_false' ? 'True / False' : 'Concepts';
    }

    rows.push({
      deck_title:             row.deck_title || '',
      front,
      back,
      chapter,
      subject:                row.subject || '',
      lesson:                 row.lesson || '',
      type:                   cleanType,
      tags:                   row.tags || '',
      mc_correct:             row.mc_correct || back,
      mc_distractor1:         row.mc_distractor_1 || row.mc_distractor1 || '',
      mc_distractor2:         row.mc_distractor_2 || row.mc_distractor2 || '',
      mc_distractor3:         row.mc_distractor_3 || row.mc_distractor3 || '',
      tf_correct:             row.tf_correct || row.tf_answer || (back.toLowerCase() === 'true' ? 'True' : 'False'),
      tf_answer:              row.tf_correct || row.tf_answer || (back.toLowerCase() === 'true' ? 'True' : 'False'),
      explanation:            row.explanation || row.tf_explanation || '',
      enum_items:             row.enum_items || row.enumeration_items || back,
      id_answer:              row.id_answer || row.identification_answer || back,
      id_acceptable_variants: row.id_acceptable_variants || row.id_variants || row.identification_variants || '',
      id_variants:            row.id_acceptable_variants || row.id_variants || row.identification_variants || '',
      notes_content:          row.notes_content || '',
      image_keywords:         row.image_keywords || '',
    });
  }

  return { rows, inferredDeckTitle };
}

function buildCards(rows: CSVRow[], deckId: string, primarySubject: string): Card[] {
  const cards: Card[] = [];

  rows.forEach((row, i) => {
    const front = row.front?.trim();
    if (!front) return;

    const back = row.back?.trim() || front;
    const tagList = row.tags ? row.tags.split(/[;,]/).map(t => t.trim()).filter(Boolean) : [row.chapter || primarySubject];

    cards.push({
      id: `card-csv-${Date.now()}-${i}`,
      deckId,
      front,
      back,
      chapter: row.chapter || 'Concepts',
      subject: row.subject || primarySubject,
      lesson: row.lesson || 'Lesson 1',
      type: row.type as CardType,
      mastery: 0,
      status: 'new',
      know: null,
      correctCount: 0,
      wrongCount: 0,
      lastReviewed: null,
      nextReview: null,
      tags: tagList,
      explanation: row.explanation || '',
      mc_correct: row.mc_correct || back,
      mc_distractor_1: row.mc_distractor1 || '',
      mc_distractor_2: row.mc_distractor2 || '',
      mc_distractor_3: row.mc_distractor3 || '',
      mc_distractor1: row.mc_distractor1 || '',
      mc_distractor2: row.mc_distractor2 || '',
      mc_distractor3: row.mc_distractor3 || '',
      tf_correct: row.tf_correct || row.tf_answer || (back.toLowerCase() === 'true' ? 'True' : 'False'),
      tf_answer: row.tf_correct || row.tf_answer || (back.toLowerCase() === 'true' ? 'True' : 'False'),
      enum_items: row.enum_items || back,
      id_answer: row.id_answer || back,
      id_acceptable_variants: row.id_acceptable_variants || row.id_variants || '',
      id_variants: row.id_acceptable_variants || row.id_variants || '',
    });
  });

  return cards;
}

export function parseCSVFile(
  text: string,
  title?: string
): { deck: Deck; cards: Card[] } {
  const fixedCSV = auditAndFixCSV(text);
  const { rows, inferredDeckTitle } = parseCSV(fixedCSV);
  const subjects = [...new Set(rows.map(r => r.subject).filter(Boolean))];
  const primarySubject = subjects[0] ?? 'General';

  const resolvedTitle = title && title !== 'Untitled Deck' && title !== 'Generated Deck' && title !== 'Study Deck'
    ? title
    : (inferredDeckTitle || extractSmartTitle(text, primarySubject));

  const deckId = `deck-csv-${Date.now()}`;
  const uploadedAt = new Date().toISOString();

  const cards = buildCards(rows, deckId, primarySubject);

  const deck: Deck = {
    id: deckId,
    title: resolvedTitle,
    subject: primarySubject,
    uploadedAt,
    cards,
  };

  return { deck, cards };
}
