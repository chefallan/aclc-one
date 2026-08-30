import { shuffleSeeded } from './shuffleSeeded';
import type { Card, MCQuestion, MCOption } from './types';

export function buildMCQuestion(targetCard: Card, allCards: Card[]): MCQuestion {
  // If the card already has pre-generated distractors
  if (targetCard.mc_distractor1 && targetCard.mc_distractor2 && targetCard.mc_distractor3) {
    const rawOptions = [
      targetCard.mc_correct || targetCard.back,
      targetCard.mc_distractor1,
      targetCard.mc_distractor2,
      targetCard.mc_distractor3,
    ];
    const shuffled = shuffleSeeded(rawOptions, Date.now());
    const correctVal = targetCard.mc_correct || targetCard.back;
    const correctIdx = shuffled.indexOf(correctVal);

    const labels: MCOption['label'][] = ['A', 'B', 'C', 'D'];
    return {
      question: targetCard.front,
      correct: correctVal,
      options: shuffled.map((text, i) => ({ label: labels[i], text })),
      correctIndex: correctIdx >= 0 ? correctIdx : 0,
    };
  }

  const others = allCards.filter((c) => c.id !== targetCard.id);

  const poolA = others.filter(
    (c) => c.subject === targetCard.subject && c.lesson === targetCard.lesson
  );
  const poolB = others.filter(
    (c) => c.subject === targetCard.subject && c.chapter === targetCard.chapter
  );
  const poolC = others.filter(
    (c) => c.subject === targetCard.subject && c.type === targetCard.type
  );

  const merged = [...poolA, ...poolB, ...poolC];
  const seen = new Set<string>();
  const deduped: Card[] = [];
  for (const c of merged) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      deduped.push(c);
    }
  }

  let distractors = shuffleSeeded(deduped, Date.now())
    .slice(0, 3)
    .map((c) => c.back);

  if (distractors.length < 3) {
    const sameSubject = others.filter(
      (c) => c.subject === targetCard.subject && !distractors.includes(c.back)
    );
    const more = shuffleSeeded(sameSubject, Date.now() + 1)
      .map((c) => c.back)
      .filter((b) => !distractors.includes(b));
    distractors = [...distractors, ...more].slice(0, 3);
  }

  while (distractors.length < 3) {
    distractors.push(targetCard.back + ' (variant ' + (distractors.length + 1) + ')');
  }

  const allOptions = shuffleSeeded([targetCard.back, ...distractors], Date.now() + 2);
  const correctIndex = allOptions.indexOf(targetCard.back);

  const labels: MCOption['label'][] = ['A', 'B', 'C', 'D'];
  const options: MCOption[] = allOptions.map((text, i) => ({
    label: labels[i],
    text,
  }));

  return {
    question: targetCard.front,
    correct: targetCard.back,
    options,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
  };
}
