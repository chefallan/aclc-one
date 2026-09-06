export const CLAUDE_PROMPT_TEMPLATE = `Analyze the entire reference material.
Identify every distinct topic and subtopic.
Extract every examinable fact, including definitions, formulas, theories, processes, rules, exceptions, examples, and conditions.
Merge duplicate facts but NEVER omit unique information.

VOLUME RULES (MANDATORY):
• Prioritize KEYWORD NOTES over flashcards. Put the bulk of unique information into keyword rows for the Notes tab (rich structured backs). Flashcards are a short review set, not a dump of every fact.
• Flashcard-mode rows (type definition, concept, formula, process, or list) MUST NOT exceed 130 total. If more unique facts exist, keep them in keyword notes instead of extra flashcards. Do not create filler flashcards. Never emit two flashcards with the same back/answer.
• Keyword notes have no 130 cap — extract thoroughly into notes. Quiz types (multiple_choice, true_false, enumeration, identification) should cover major topics but stay concise.
• TRUE/FALSE IS NEVER A FLASHCARD. True/False items belong ONLY in the True/False quiz. Use type true_false, leave the back column EMPTY, and never reuse that statement as a definition/concept/formula/process/list flashcard. Never set a flashcard back to True, False, true, or false.
Before finishing, internally verify that every major topic is represented.
If the output reaches the response limit, stop only after completing the current CSV row and output exactly: CONTINUE_FROM_NEXT_ROW. When I reply with "Continue", resume immediately from the next unfinished row.

1. UNIFIED COLUMN SCHEMA
The header must be exactly this, word for word, no substitutions:
front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants

There are exactly 15 columns. Do NOT add extra columns or rename headers.
Every single row must have exactly 15 comma-separated values. Unused columns must be left empty but still present as commas.
chapter = column 3, subject = column 4, lesson = column 5, type = column 6.

2. QUIZ TYPE PARAMETERS & ROW STRUCTURAL RULES
Apply the correct comma-padding so optional values always map to the correct absolute column index.

• definition: Populate ONLY the front and back fields. The front contains the description; the back contains the term.
  Format: "Description / Question","Term","Chapter","Subject","Lesson",definition,,,,,,,,,

• keyword (NOTES TAB): Populate front with the Topic / Person / Section / Keyword, and back with structured notes, dates, or bullet points.
  IMPORTANT DIRECTIVE FOR NOTES (STRICT BOLDING RULE):
  - Bold ONLY the definition / term / label name itself at the start of each bullet point (e.g. "• **Accessibility** – usable by everyone...", "• **Born**: Feb 8, 1890 | **Died**: Oct 2, 1960").
  - NEVER bold words inside the definition sentence or explanation body. DO NOT treat this like fill-in-the-blanks.
  - The explanation/body MUST be regular plain text so only the term name itself gets masked during active recall.
  Format: "CLARO M. RECTO","• **Born**: Feb 8, 1890 | **Died**: Oct 2, 1960\n• **Parents**: Claro Recto Sr. & Micaela Mayo\n• **Spouses**: Angeles Silos, Aurora Reyes","Chapter","Subject","Lesson",keyword,,,,,,,,,

• multiple_choice: Populate mc_correct and exactly three distractors.
  COLUMN COUNT RULE: After mc_distractor3 (column 10), there must be exactly 5 empty columns to reach column 15.
  Format: "Question","","Chapter","Subject","Lesson",multiple_choice,Correct,D1,D2,D3,,,,,

• true_false (QUIZ ONLY — NEVER a flashcard): Populate tf_answer with "true" or "false" and explanation with a brief justification. Leave back EMPTY. Do not also emit this as a flashcard.
  Format: "Statement","","Chapter","Subject","Lesson",true_false,,,,,true,"Explanation",,,

• enumeration: Populate enum_items only. Include exactly 6 empty commas after the type value.
  Format: "Topic / Category","","Chapter","Subject","Lesson",enumeration,,,,,,,"item1;item2;item3",,

• identification: Populate id_answer and id_variants only. Include exactly 8 empty commas after the type value.
  Format: "Definition / Clue","","Chapter","Subject","Lesson",identification,,,,,,,,,"Answer","variant1;variant2"

3. SYNTAX & FORMATTING CONSTRAINTS
Output ONLY the raw plain-text CSV. Do NOT output Markdown, do not explain anything, and do not number the rows.
Wrap any field containing spaces, commas, newlines, punctuation, or quotes inside double quotes.
Enumeration items must be inside ONE cell, lowercase, separated with semicolons.
Identification variants must be lowercase and separated with semicolons.
MANDATORY TYPE DISTRIBUTION RULE: Generate cards of all relevant types (definition, keyword, multiple_choice, true_false, enumeration, identification).
Most rows should be keyword notes. Flashcards (definition/concept/formula/process/list) are capped at 130 and should only cover the highest-yield examinable facts.
true_false rows are quiz-only and MUST NEVER appear as flashcards.
For study notes, key dates, biographies, and section summaries, generate keyword note cards for the Notes study tab.

TOPIC: [INSERT TOPIC]
CHAPTER: [INSERT CHAPTER]
SUBJECT: [INSERT SUBJECT]
LESSON: [INSERT LESSON]
REFERENCE STUDY NOTES: [PASTE YOUR STUDY NOTES HERE]`;

export const CLAUDE_NOTES_PROMPT_TEMPLATE = `Analyze the entire reference material and extract ALL information into structured, comprehensive STUDY NOTES ONLY (Keyword cards for the Notes tab).

1. EXTRACTION RULES
• Identify every distinct topic, section, person, theory, concept, formula, process, and key term.
• Do NOT generate quiz questions, multiple choice, or true/false questions.
• Generate EXCLUSIVELY "keyword" type rows for study notes.
• The "front" MUST be the Topic / Keyword / Person / Concept / Section title.
• The "back" MUST be rich, detailed, structured study notes, key dates, bullet points, definitions, formulas, or summaries. Use "\n• " for bullet points.
• MANDATORY DIRECTIVE FOR BOLDING KEYWORDS (STRICT RULE):
  - Bold ONLY the definition / term / concept / label name itself at the start of each bullet point (e.g., "• **Accessibility** – usable by everyone...", "• **Born**: Feb 8, 1890 | **Died**: Oct 2, 1960").
  - DO NOT bold words inside the explanation or sentence body (e.g., NEVER bold random words like "usable by **everyone** including people with **disabilities**"). THIS IS NOT A FILL-IN-THE-BLANKS QUIZ.
  - The explanation body must remain plain text so the student can read the entire clue while the term name is masked.
• Never omit important details, examples, or conditions.

2. UNIFIED 15-COLUMN CSV SCHEMA
The header must be exactly this, word for word, no substitutions:
front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants

Every single row must have exactly 15 comma-separated values with type="keyword":
"Topic / Concept / Keyword","• **Key Term 1** – Definition and explanation in plain text\n• **Key Term 2**: Detailed notes in plain text\n• **Date**: Feb 8, 1890","Chapter","Subject","Lesson",keyword,,,,,,,,,

TOPIC: [INSERT TOPIC]
CHAPTER: [INSERT CHAPTER]
SUBJECT: [INSERT SUBJECT]
LESSON: [INSERT LESSON]
REFERENCE STUDY NOTES: [PASTE YOUR STUDY NOTES HERE]`;
