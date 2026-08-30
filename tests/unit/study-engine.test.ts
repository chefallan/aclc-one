import { describe, it, expect } from "vitest";
import { parseCSVFile } from "@/lib/study/csvParser";
import { auditAndFixCSV } from "@/lib/study/csvFixer";
import { areMathExpressionsEquivalent, evaluateMathExpression, solveLinearEquation } from "@/lib/study/mathEvaluator";
import { checkIdentificationAnswer } from "@/lib/study/answerChecker";
import { buildMCQuestion } from "@/lib/study/distractorEngine";
import type { Card } from "@/lib/study/types";

describe("Study Engine - CSV Parser & Auto-Fixer", () => {
  it("should parse standard 15-column flashcard CSV", () => {
    const csv = [
      "front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants",
      '"What is normalization?","Process of organizing data in a database",Ch1,Databases,L1,definition,,,,,,,,,',
      '"What is 2+2?","",Ch1,Math,L1,multiple_choice,4,3,5,6,,,,,',
      '"The Earth is flat.","",Ch1,Science,L1,true_false,,,,,false,"It is an oblate spheroid",,,',
      '"Primary colors","",Ch1,Art,L1,enumeration,,,,,,,"red;blue;yellow",,',
      '"Father of Computer Science","",Ch1,CS,L1,identification,,,,,,,,,"Alan Turing","alan turing;turing"',
    ].join("\n");

    const { deck, cards } = parseCSVFile(csv, "Test Deck");

    expect(deck.title).toBe("Test Deck");
    expect(cards.length).toBe(5);
    expect(cards[0].front).toBe("What is normalization?");
    expect(cards[0].back).toBe("Process of organizing data in a database");
    expect(cards[0].type).toBe("definition");
    expect(cards[1].type).toBe("multiple_choice");
    expect(cards[1].mc_correct).toBe("4");
    expect(cards[2].type).toBe("true_false");
    expect(cards[2].tf_answer).toBe("false");
    expect(cards[3].type).toBe("enumeration");
    expect(cards[3].enum_items).toBe("red;blue;yellow");
    expect(cards[4].type).toBe("identification");
    expect(cards[4].id_answer).toBe("Alan Turing");
  });

  it("should auto-fix short/malformed CSV rows with auditAndFixCSV", () => {
    const rawCSV = [
      "front,back,type",
      '"RAM","Random Access Memory",definition',
    ].join("\n");

    const fixed = auditAndFixCSV(rawCSV);
    const { cards } = parseCSVFile(fixed, "Fixed Deck");

    expect(cards.length).toBe(1);
    expect(cards[0].front).toBe("RAM");
    expect(cards[0].back).toBe("Random Access Memory");
  });
});

describe("Study Engine - Math Evaluator", () => {
  it("should evaluate arithmetic expressions and fractions", () => {
    expect(evaluateMathExpression("2 + 2")).toBe(4);
    expect(evaluateMathExpression("(2^3)")).toBe(8);
    expect(evaluateMathExpression("1/2")).toBe(0.5);
    expect(evaluateMathExpression("sqrt(16)")).toBe(4);
    expect(evaluateMathExpression("50%")).toBe(0.5);
  });

  it("should solve linear equations", () => {
    expect(solveLinearEquation("2x + 4 = 10")).toBe(3);
    expect(solveLinearEquation("x - 5 = 15")).toBe(20);
  });

  it("should determine mathematical equivalence", () => {
    expect(areMathExpressionsEquivalent("(2^3)", "8")).toBe(true);
    expect(areMathExpressionsEquivalent("2x + 4 = 10", "3")).toBe(true);
    expect(areMathExpressionsEquivalent("1/2", "0.5")).toBe(true);
    expect(areMathExpressionsEquivalent("10", "11")).toBe(false);
  });
});

describe("Study Engine - Identification Answer Checker (Levenshtein & Fuzzy)", () => {
  it("should accept exact answers and variants", () => {
    const res = checkIdentificationAnswer("Alan Turing", "Alan Turing", ["turing"]);
    expect(res.isCorrect).toBe(true);

    const res2 = checkIdentificationAnswer("turing", "Alan Turing", ["turing"]);
    expect(res2.isCorrect).toBe(true);
  });

  it("should be forgiving with minor typos (Levenshtein distance)", () => {
    const res = checkIdentificationAnswer("Alan Turring", "Alan Turing", []);
    expect(res.isCorrect).toBe(true);
  });

  it("should reject wrong answers", () => {
    const res = checkIdentificationAnswer("Ada Lovelace", "Alan Turing", []);
    expect(res.isCorrect).toBe(false);
  });
});

describe("Study Engine - Distractor Engine", () => {
  it("should generate 4 options with correct answer for Multiple Choice", () => {
    const sampleCards: Card[] = [
      {
        id: "c1",
        deckId: "d1",
        front: "Primary input device",
        back: "Keyboard",
        chapter: "Ch1",
        subject: "CS",
        lesson: "L1",
        type: "definition",
        mastery: 0,
        status: "new",
        know: null,
        correctCount: 0,
        wrongCount: 0,
        lastReviewed: null,
        nextReview: null,
      },
      {
        id: "c2",
        deckId: "d1",
        front: "Primary display device",
        back: "Monitor",
        chapter: "Ch1",
        subject: "CS",
        lesson: "L1",
        type: "definition",
        mastery: 0,
        status: "new",
        know: null,
        correctCount: 0,
        wrongCount: 0,
        lastReviewed: null,
        nextReview: null,
      },
    ];

    const q = buildMCQuestion(sampleCards[0], sampleCards);
    expect(q.question).toBe("Primary input device");
    expect(q.correct).toBe("Keyboard");
    expect(q.options.length).toBe(4);
    expect(q.options[q.correctIndex].text).toBe("Keyboard");
  });
});