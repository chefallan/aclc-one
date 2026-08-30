import OpenAI from "openai";
import { getAiClient, resolveAiConfig } from "@/lib/ai-client";
import { auditAndFixCSV } from "./csvFixer";
import { parseCSVFile } from "./csvParser";
import type { Deck, Card } from "./types";

export interface GenerateCardsOptions {
  notesText: string;
  topic?: string;
  subject?: string;
  chapter?: string;
  lesson?: string;
}

export interface GenerateCardsResult {
  csvText: string;
  deck: Deck;
  cards: Card[];
  totalCards: number;
}

const SYSTEM_PROMPT = `You are an expert educational study card and quiz generator for ACLC College.
Your task is to analyze the provided study notes and convert them into high-quality, examinable flashcards and quiz items in a strict 15-column CSV format.

1. 15-COLUMN UNIFIED CSV SCHEMA:
The header must be exactly:
front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants

2. CARD TYPES TO GENERATE:
- definition: front = concept/definition description, back = term/concept name, type = definition
- keyword: front = main topic/keyword/person, back = key bullet points or summary, type = keyword
- multiple_choice: front = question, type = multiple_choice, mc_correct = correct answer, mc_distractor1..3 = 3 plausible wrong options
- true_false: front = statement, type = true_false, tf_answer = true or false, explanation = brief rationale
- enumeration: front = list category/question, type = enumeration, enum_items = item1;item2;item3 (semicolon separated)
- identification: front = definition/clue, type = identification, id_answer = term, id_variants = variant1;variant2

3. RULES:
- Output ONLY the raw plain-text CSV without markdown formatting or code blocks.
- Wrap all cells with commas, newlines, or quotes in double quotes ("...").
- Generate between 5 to 20 balanced cards covering the full material provided.
- Do not skip important definitions, dates, or key concepts.`;

/** Fallback configurations to try in order */
function getFallbackChain() {
  const chain: Array<{ name: string; baseURL: string; apiKey: string; model: string }> = [];

  // 1. Groq (Fastest)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    chain.push({
      name: "Groq (llama-3.1-8b-instant)",
      baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      model: "llama-3.1-8b-instant",
    });
    chain.push({
      name: "Groq (llama3-8b-8192)",
      baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      model: "llama3-8b-8192",
    });
    chain.push({
      name: "Groq (gemma2-9b-it)",
      baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      model: "gemma2-9b-it",
    });
  }

  // 2. OpenRouter (Free tier models)
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    chain.push({
      name: "OpenRouter (llama-3.3-70b:free)",
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      apiKey: openrouterKey,
      model: "meta-llama/llama-3.3-70b-instruct:free",
    });
    chain.push({
      name: "OpenRouter (gemini-2.0-flash:free)",
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      apiKey: openrouterKey,
      model: "google/gemini-2.0-flash-exp:free",
    });
  }

  // 3. Gemini Direct OpenAI-compatible endpoint
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    chain.push({
      name: "Gemini (gemini-2.0-flash)",
      baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: geminiKey,
      model: "gemini-2.0-flash",
    });
  }

  // 4. OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    chain.push({
      name: "OpenAI (gpt-4o-mini)",
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      apiKey: openaiKey,
      model: "gpt-4o-mini",
    });
  }

  return chain;
}

/** Offline deterministic generator when all remote AI keys fail */
function generateOfflineFallbackCards(options: GenerateCardsOptions): GenerateCardsResult {
  const { notesText, topic = "Study Notes", subject = "General", chapter = "Ch1", lesson = "L1" } = options;

  const lines = notesText
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  const rows: string[] = [
    "front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants",
  ];

  let cardIndex = 1;
  for (const line of lines.slice(0, 10)) {
    const cleanLine = line.replace(/^[•\-*\d.]+\s*/, "").replace(/"/g, '""');
    
    // Check if line contains a definition pattern: "Term: Definition" or "Term - Definition"
    const splitMatch = cleanLine.match(/^([^:\-—]+)[:\-—](.+)$/);
    if (splitMatch) {
      const term = splitMatch[1].trim();
      const def = splitMatch[2].trim();
      rows.push(`"${def}","${term}",${chapter},${subject},${lesson},definition,,,,,,,,,`);
      rows.push(`"What is ${term}?","",${chapter},${subject},${lesson},multiple_choice,"${def}","Alternative definition A","Alternative definition B","None of the above",,,,`);
      rows.push(`"${term} is defined as: ${def}","",${chapter},${subject},${lesson},true_false,,,,,true,"Based on course notes.",,,`);
    } else {
      // General concept statement
      rows.push(`"According to study notes: ${cleanLine}","",${chapter},${subject},${lesson},true_false,,,,,true,"Direct statement from notes.",,,`);
      rows.push(`"Key Concept #${cardIndex}","${cleanLine}",${chapter},${subject},${lesson},keyword,,,,,,,,,`);
    }
    cardIndex++;
  }

  const csvText = rows.join("\n");
  const fixedCSV = auditAndFixCSV(csvText);
  const { deck, cards } = parseCSVFile(fixedCSV, topic);

  return {
    csvText: fixedCSV,
    deck,
    cards,
    totalCards: cards.length,
  };
}

export async function generateFlashcardsFromNotes(
  options: GenerateCardsOptions
): Promise<GenerateCardsResult> {
  const { notesText, topic = "Study Notes", subject = "General", chapter = "Chapter 1", lesson = "Lesson 1" } = options;

  const userPrompt = `TOPIC: ${topic}
SUBJECT: ${subject}
CHAPTER: ${chapter}
LESSON: ${lesson}

REFERENCE STUDY NOTES:
${notesText.trim()}

Generate the 15-column CSV now.`;

  const fallbackChain = getFallbackChain();

  // Try the primary configured client first
  try {
    const ai = await getAiClient();
    const response = await ai.client.chat.completions.create({
      model: ai.model,
      temperature: 0.3,
      max_tokens: 3000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    let rawOutput = response.choices[0]?.message?.content || "";
    rawOutput = rawOutput.replace(/^\`\`\`(csv)?/gi, "").replace(/\`\`\`$/g, "").trim();

    if (rawOutput.length > 20) {
      const fixedCSV = auditAndFixCSV(rawOutput);
      const { deck, cards } = parseCSVFile(fixedCSV, topic);
      return { csvText: fixedCSV, deck, cards, totalCards: cards.length };
    }
  } catch (primaryErr: any) {
    console.warn(`Primary AI Client failed (${primaryErr.message}). Initiating fallback chain...`);
  }

  // Iterate through fallback chain
  for (const target of fallbackChain) {
    try {
      console.log(`Attempting fallback with ${target.name} (model: ${target.model})...`);
      const client = new OpenAI({
        apiKey: target.apiKey,
        baseURL: target.baseURL,
      });

      const response = await client.chat.completions.create({
        model: target.model,
        temperature: 0.3,
        max_tokens: 3000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      let rawOutput = response.choices[0]?.message?.content || "";
      rawOutput = rawOutput.replace(/^\`\`\`(csv)?/gi, "").replace(/\`\`\`$/g, "").trim();

      if (rawOutput.length > 20) {
        console.log(`✅ Successfully generated flashcards using ${target.name}!`);
        const fixedCSV = auditAndFixCSV(rawOutput);
        const { deck, cards } = parseCSVFile(fixedCSV, topic);
        return { csvText: fixedCSV, deck, cards, totalCards: cards.length };
      }
    } catch (fbErr: any) {
      console.warn(`Fallback ${target.name} failed (${fbErr.message}). Trying next...`);
    }
  }

  // If all online endpoints fail, use deterministic generator
  console.warn("All remote AI models failed or unavailable. Using offline deterministic card generator.");
  return generateOfflineFallbackCards(options);
}
