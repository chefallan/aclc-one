import type { Deck, Card, QuizItem, CardType } from './types';
import { auditAndFixCSV } from './csvFixer';
import { extractSmartTitle } from './titleExtractor';

interface CSVRow {
  front: string;
  back: string;
  chapter: string;
  subject: string;
  lesson: string;
  type: string;
  mc_correct?: string;
  mc_distractor1?: string;
  mc_distractor2?: string;
  mc_distractor3?: string;
  tf_answer?: string;
  explanation?: string;
  enum_items?: string;
  id_answer?: string;
  id_variants?: string;
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

function parseCSV(text: string): CSVRow[] {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  const lines = splitCSVRows(cleanText);

  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((key, idx) => {
      row[key] = (values[idx] ?? '').trim();
    });

    rows.push({
      front:          row.front          ?? '',
      back:           row.back           ?? '',
      chapter:        row.chapter        ?? '',
      subject:        row.subject        ?? '',
      lesson:         row.lesson         ?? '',
      type:           row.type           ?? 'definition',
      mc_correct:     row.mc_correct     ?? row.mc_correct_answer  ?? '',
      mc_distractor1: row.mc_distractor1 ?? row.mc_distractor_1   ?? '',
      mc_distractor2: row.mc_distractor2 ?? row.mc_distractor_2   ?? '',
      mc_distractor3: row.mc_distractor3 ?? row.mc_distractor_3   ?? '',
      tf_answer:      row.tf_answer      ?? row.true_false         ?? '',
      explanation:    row.explanation    ?? row.tf_explanation     ?? '',
      enum_items:     row.enum_items     ?? row.enumeration_items  ?? '',
      id_answer:      row.id_answer      ?? row.identification_answer   ?? '',
      id_variants:    row.id_variants    ?? row.identification_variants ?? '',
    });
  }

  return rows;
}

function resolveBack(row: CSVRow): string | null {
  const type = row.type.toLowerCase().trim();

  switch (type) {
    case 'multiple_choice':
    case 'mc':
      return row.mc_correct || row.back || null;

    case 'true_false':
    case 'tf': {
      const answer = (row.tf_answer || row.back).toLowerCase().trim();
      if (!answer) return null;
      const isTrue = answer === 'true' || answer === 't' || answer === 'yes';
      return isTrue ? 'True' : 'False';
    }

    case 'enumeration':
    case 'enum': {
      const raw = row.enum_items || row.back;
      if (!raw) return null;
      const items = raw.split(';').map(s => s.trim()).filter(Boolean);
      return items.length >= 2 ? items.join(', ') : null;
    }

    case 'identification':
    case 'id':
      return row.id_answer || row.back || null;

    default:
      return row.back || null;
  }
}

function buildCards(rows: CSVRow[], deckId: string, primarySubject: string): Card[] {
  const cards: Card[] = [];

  rows.forEach((row, i) => {
    const front = row.front?.trim();
    if (!front) return;

    const type = row.type.toLowerCase().trim();
    const back = resolveBack(row) || row.back || front;

    const cardType = (
      ['definition', 'concept', 'formula', 'process', 'list', 'keyword',
       'multiple_choice', 'true_false', 'enumeration', 'identification'].includes(type)
        ? type
        : 'definition'
    ) as CardType;

    cards.push({
      id: `card-csv-${Date.now()}-${i}`,
      deckId,
      front,
      back,
      chapter: row.chapter || '',
      subject: row.subject || primarySubject,
      lesson: row.lesson || '',
      type: cardType,
      mastery: 0,
      status: 'new',
      know: null,
      correctCount: 0,
      wrongCount: 0,
      lastReviewed: null,
      nextReview: null,
      mc_correct: row.mc_correct || '',
      mc_distractor1: row.mc_distractor1 || '',
      mc_distractor2: row.mc_distractor2 || '',
      mc_distractor3: row.mc_distractor3 || '',
      tf_answer: row.tf_answer || '',
      enum_items: row.enum_items || '',
      id_answer: row.id_answer || '',
      id_variants: row.id_variants || '',
    });
  });

  return cards;
}

function generateQuizItems(rows: CSVRow[], primarySubject: string): QuizItem[] {
  const quizItems: QuizItem[] = [];

  for (const row of rows) {
    const chapter = row.chapter || 'General';
    const subject = row.subject || primarySubject;
    const type = row.type.toLowerCase().trim();

    if (type === 'multiple_choice' || type === 'mc') {
      const correct = row.mc_correct || row.back;
      const distractors = [row.mc_distractor1, row.mc_distractor2, row.mc_distractor3]
        .filter((d): d is string => !!d?.trim());

      if (correct && distractors.length === 3) {
        quizItems.push({
          mode: 'multiple_choice',
          question: row.front,
          correct,
          distractors,
          chapter,
          subject,
        });
      }
    }

    if (type === 'true_false' || type === 'tf') {
      const raw = (row.tf_answer || row.back).toLowerCase().trim();
      const isTrue = raw === 'true' || raw === 't' || raw === 'yes' || raw === 'y';

      if (raw) {
        quizItems.push({
          mode: 'true_false',
          statement: row.front,
          falseVersion: row.front,
          explanation: row.explanation || (isTrue ? 'This statement is true.' : 'This statement is false.'),
          correct: isTrue,
          chapter,
          subject,
        });
      }
    }

    if (type === 'enumeration' || type === 'enum') {
      const raw = row.enum_items || row.id_variants || row.back;
      if (raw) {
        const items = raw.split(';').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (items.length >= 2) {
          quizItems.push({
            mode: 'enumeration',
            topic: row.front,
            items,
            chapter,
            subject,
          });
        }
      }
    }

    if (type === 'identification' || type === 'id') {
      const answer = row.id_answer || row.back;
      if (answer) {
        const variants = row.id_variants
          ? row.id_variants.split(';').map(s => s.trim()).filter(Boolean)
          : [answer.toLowerCase()];

        quizItems.push({
          mode: 'identification',
          definition: row.front,
          answer,
          acceptVariants: variants,
          chapter,
          subject,
        });
      }
    }
  }

  return quizItems;
}

export function parseCSVFile(
  text: string,
  title: string
): { deck: Deck; cards: Card[] } {
  const fixedCSV = auditAndFixCSV(text);
  const rows = parseCSV(fixedCSV);
  const subjects = [...new Set(rows.map(r => r.subject).filter(Boolean))];
  const primarySubject = subjects[0] ?? 'General';

  const deckId = `deck-csv-${Date.now()}`;
  const uploadedAt = new Date().toISOString();

  const cards = buildCards(rows, deckId, primarySubject);
  const quizItems = generateQuizItems(rows, primarySubject);

  const inferredTitle = title && title !== 'Untitled Deck' && title !== 'Generated Deck' ? title : extractSmartTitle(text, primarySubject);
  const deck: Deck = {
    id: deckId,
    title: inferredTitle,
    subject: primarySubject,
    uploadedAt,
    cards,
    quizItems,
  };

  return { deck, cards };
}
