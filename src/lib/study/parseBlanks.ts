import nlp from "compromise";

export interface TextToken {
  id: string;
  text: string;
  isWord: boolean;
  isBlank: boolean;
}

export function parseBlanks(text: string, blankPercentage: number = 0.25): TextToken[] {
  // Check if text has explicit cloze markers: [word] or {{word}}
  const explicitClozeRegex = /(\[[^\]]+\]|\{\{[^\}]+\}\})/g;
  const hasExplicitCloze = explicitClozeRegex.test(text);

  if (hasExplicitCloze) {
    // Process text with explicit cloze markers
    const parts = text.split(/(\[[^\]]+\]|\{\{[^\}]+\}\})/g);
    const tokens: TextToken[] = [];
    let tokenIndex = 0;

    for (const part of parts) {
      if (!part) continue;
      if (
        (part.startsWith("[") && part.endsWith("]")) ||
        (part.startsWith("{{") && part.endsWith("}}"))
      ) {
        const rawWord = part.replace(/^(\[|\{\{)|(\]|\}\})$/g, "").trim();
        tokens.push({
          id: `token-${tokenIndex++}`,
          text: rawWord,
          isWord: true,
          isBlank: true,
        });
      } else {
        const subTokens = part.split(/([a-zA-Z0-9_]+)/g).filter(Boolean);
        for (const sub of subTokens) {
          const isWord = /^[a-zA-Z0-9_]+$/.test(sub);
          tokens.push({
            id: `token-${tokenIndex++}`,
            text: sub,
            isWord,
            isBlank: false,
          });
        }
      }
    }
    return tokens;
  }

  // Regex to split by words but keep whitespace and punctuation as separate tokens
  const tokens = text.split(/([a-zA-Z0-9_]+)/g).filter(Boolean);

  const wordTokens = tokens
    .map((t, i) => {
      const isWord = /^[a-zA-Z0-9_]+$/.test(t);
      return { text: t, isWord, originalIndex: i };
    })
    .filter((t) => t.isWord);

  // Use Math.ceil so even short sentences get a fair amount of blanks
  const numBlanks = Math.max(1, Math.ceil(wordTokens.length * blankPercentage));
  const selectedBlankIndices = new Set<number>();

  // Step 1: Use Compromise NLP to find high-value entities
  try {
    const doc = (nlp as any)(text);
    const targetPhrases = new Set([
      ...doc.match("#Date").out("array"),
      ...doc.match("#Person").out("array"),
      ...doc.match("#Place").out("array"),
      ...doc.match("#Organization").out("array"),
      ...doc.match("#Acronym").out("array"),
    ].flatMap((p: string) => p.toLowerCase().split(/\s+/)));

    // Step 2: Extract key nouns
    const nounPhrases = new Set(
      doc.match("#Noun").out("array").flatMap((p: string) => p.toLowerCase().split(/\s+/))
    );

    // Randomize indices to avoid always picking the first few
    const shuffledWordTokens = [...wordTokens].sort(() => 0.5 - Math.random());

    // Select Prime Entities (Dates, People, Places, etc.)
    for (const token of shuffledWordTokens) {
      if (selectedBlankIndices.size < numBlanks && targetPhrases.has(token.text.toLowerCase())) {
        selectedBlankIndices.add(token.originalIndex);
      }
    }

    // Select Nouns if we need more blanks
    for (const token of shuffledWordTokens) {
      if (
        selectedBlankIndices.size < numBlanks &&
        !selectedBlankIndices.has(token.originalIndex) &&
        nounPhrases.has(token.text.toLowerCase())
      ) {
        selectedBlankIndices.add(token.originalIndex);
      }
    }
  } catch (nlpErr) {
    console.warn("Compromise NLP parsing fallback:", nlpErr);
  }

  // Fallback to purely random words if we STILL need more blanks
  const shuffledRemaining = [...wordTokens].sort(() => 0.5 - Math.random());
  for (const token of shuffledRemaining) {
    if (selectedBlankIndices.size < numBlanks && !selectedBlankIndices.has(token.originalIndex)) {
      selectedBlankIndices.add(token.originalIndex);
    }
  }

  // Build final array
  return tokens.map((t, i) => {
    const isWord = /^[a-zA-Z0-9_]+$/.test(t);
    return {
      id: `token-${i}`,
      text: t,
      isWord,
      isBlank: isWord && selectedBlankIndices.has(i),
    };
  });
}
