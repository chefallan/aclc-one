export type CardType =
  | 'definition'
  | 'concept'
  | 'formula'
  | 'process'
  | 'list'
  | 'keyword'
  | 'multiple_choice'
  | 'true_false'
  | 'enumeration'
  | 'identification';

export type CardStatus = 'new' | 'learning' | 'mastered';

export type QuizMode = 'flashcard' | 'multiple_choice' | 'identification' | 'true_false' | 'enumeration';

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  chapter: string;
  subject: string;
  lesson: string;
  type: CardType;
  mastery: number;
  status: CardStatus;
  know: boolean | null;
  correctCount: number;
  wrongCount: number;
  lastReviewed: string | null;
  nextReview: string | null;
  mc_correct?: string;
  mc_distractor1?: string;
  mc_distractor2?: string;
  mc_distractor3?: string;
  tf_answer?: string;
  explanation?: string | null;
  enum_items?: string;
  id_answer?: string;
  id_variants?: string;
}

export interface MultipleChoiceItem {
  mode: 'multiple_choice';
  question: string;
  correct: string;
  distractors: string[];
  chapter: string;
  subject: string;
}

export interface TrueFalseItem {
  mode: 'true_false';
  statement: string;
  falseVersion: string;
  explanation: string;
  correct: boolean;
  chapter: string;
  subject: string;
}

export interface EnumerationItem {
  mode: 'enumeration';
  topic: string;
  items: string[];
  chapter: string;
  subject: string;
}

export interface IdentificationItem {
  mode: 'identification';
  definition: string;
  answer: string;
  acceptVariants: string[];
  chapter: string;
  subject: string;
}

export type QuizItem =
  | MultipleChoiceItem
  | TrueFalseItem
  | EnumerationItem
  | IdentificationItem;

export interface Deck {
  id: string;
  title: string;
  subject: string;
  uploadedAt: string;
  cards: Card[];
  quizItems: QuizItem[];
}

export interface MCOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface MCQuestion {
  question: string;
  correct: string;
  options: MCOption[];
  correctIndex: number;
}
