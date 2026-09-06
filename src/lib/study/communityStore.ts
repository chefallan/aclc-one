export interface PublishedDeckItem {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string[];
  program: string; // BSIT, BSCS, BSBA, BSHM, WADT
  yearLevel: number; // 1, 2, 3, 4
  semester: number; // 1, 2
  subjectCode: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorSection?: string;
  cardCount: number;
  cardsCsv: string;
  createdAt: string;
  likesCount: number;
  forksCount: number;
}

export const initialCommunityDecks: PublishedDeckItem[] = [
  {
    id: "pub-deck-cats",
    title: "What Are Cats by Lawrence",
    content: "Comprehensive study deck on Felis catus taxonomy, ancestry from Felis lybica, ossified hyoid purring anatomy, obligate carnivore metabolism (taurine), vibrissae tactile navigation, Jacobson's organ, and righting reflex.",
    summary: "Felis catus biology, sensory organs, obligate carnivore diet, and feline anatomy.",
    tags: ["BSIT 2-1", "Biology", "Cats", "Review"],
    program: "BSIT",
    yearLevel: 2,
    semester: 1,
    subjectCode: "IT 201",
    authorId: "user-lawrence-cats",
    authorName: "Lawrence",
    authorRole: "STUDENT",
    authorSection: "BSIT-2A",
    cardCount: 6,
    cardsCsv: [
      "deck_title,card_type,front,back,explanation,tags,mc_distractor_1,mc_distractor_2,mc_distractor_3,tf_correct,id_answer,id_acceptable_variants,enum_items,notes_content,image_keywords",
      '"What Are Cats by Lawrence","definition","What is a Cat (Felis catus)?","A small, carnivorous mammal belonging to the family Felidae, known for agility, retractable claws, and keen senses.","Domestic cats are the only domesticated species in the family Felidae.","Biology;Cats;Mammals","","","","","","","","","cat;feline;mammal"',
      '"What Are Cats by Lawrence","true_false","Cats are obligate carnivores, meaning their bodies require nutrients only found in animal meat.","True","Cats cannot synthesize certain essential nutrients like taurine without meat.","Biology;Diet","","","","True","","","","","carnivore;meat"',
      '"What Are Cats by Lawrence","multiple_choice","Which sensory organ in cats enables them to detect vibrations and navigate in the dark?","Whiskers (Vibrissae)","Whiskers are deeply embedded and connected to the nervous system.","Anatomy;Senses","Retractable Claws","Tapetum Lucidum","Jacobson\'s Organ","","","","","","whiskers;vibrissae"',
      '"What Are Cats by Lawrence","identification","The reflective layer of tissue behind a cat\'s retina that enhances night vision.","Tapetum Lucidum","Tapetum Lucidum reflects light back through the retina, improving night vision.","Anatomy;Vision","","","","","Tapetum Lucidum","tapetum, tapetum lucidum, feline retina","","","eye;retina;vision"',
      '"What Are Cats by Lawrence","enumeration","List 4 primary communication methods used by cats.","Purring; Meowing; Tail Posture; Scent Marking","Cats communicate using vocalizations, body language, and olfactory scent marks.","Behavior;Communication","","","","","","","Purring; Meowing; Tail Posture; Scent Marking","","purr;meow;tail"',
      '"What Are Cats by Lawrence","keyword","Feline Anatomy & Locomotion","Cats have **flexible spines**, **retractable claws**, and **specialized clavicles** that allow them to squeeze through any space larger than their head.","Their unique skeletal structure grants exceptional jumping ability.","Anatomy;Locomotion","","","","","","","","Feline anatomy features highly flexible vertebrae and specialized footpads.","skeleton;anatomy"',
    ].join("\n"),
    createdAt: new Date().toISOString(),
    likesCount: 38,
    forksCount: 21,
  },
  {
    id: "pub-deck-1",
    title: "Database Normalization & Relational Architecture",
    content: "Comprehensive notes covering 1NF, 2NF, 3NF, and Boyce-Codd Normal Form (BCNF) with real-world table schema examples and decomposition rules.",
    summary: "1NF, 2NF, 3NF, BCNF rules, partial and transitive dependency elimination.",
    tags: ["Databases", "IT402", "Architecture"],
    program: "BSIT",
    yearLevel: 4,
    semester: 1,
    subjectCode: "IT 402",
    authorId: "user-juan-1",
    authorName: "Juan Dela Cruz",
    authorRole: "STUDENT",
    authorSection: "BSIT-4A",
    cardCount: 6,
    cardsCsv: [
      "front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants",
      '"What is 1NF (First Normal Form)?","A relation where all column values are atomic and duplicate rows are eliminated.",Ch1,IT402,L1,definition,,,,,,,,,',
      '"Which normal form eliminates partial key dependencies?","",Ch1,IT402,L1,multiple_choice,"Second Normal Form (2NF)","First Normal Form (1NF)","Third Normal Form (3NF)","Boyce-Codd Normal Form (BCNF)",,,,',
      '"A relation in 3NF has no transitive dependencies.","",Ch1,IT402,L1,true_false,,,,,true,"3NF removes transitive dependencies among non-key attributes.",,,',
      '"State the three primary normal forms in order.","",Ch1,IT402,L1,enumeration,,,,,,,"1NF;2NF;3NF",,',
      '"In BCNF, every determinant must be what type of key?","",Ch1,IT402,L1,identification,,,,,,,,,"Candidate Key","candidate key;superkey;candidate"',
      '"Simplify/Evaluate the relation power formula: 2^3","",Ch1,IT402,L1,identification,,,,,,,,,"8","8;eight"',
    ].join("\n"),
    createdAt: new Date().toISOString(),
    likesCount: 18,
    forksCount: 9,
  },
  {
    id: "pub-deck-2",
    title: "Data Structures & Algorithm Complexity (Big-O)",
    content: "Time & space complexity analysis of Arrays, Linked Lists, Binary Search Trees, and Hash Tables. Covers searching, sorting, and graph traversals (BFS & DFS).",
    summary: "Big-O complexities for common data structures and algorithms.",
    tags: ["CS105", "Algorithms", "Data Structures"],
    program: "BSCS",
    yearLevel: 2,
    semester: 1,
    subjectCode: "CC 105",
    authorId: "user-carlos-2",
    authorName: "Carlos Bautista",
    authorRole: "STUDENT",
    authorSection: "BSCS-2A",
    cardCount: 5,
    cardsCsv: [
      "front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants",
      '"What is the average time complexity for Hash Table lookup?","",Ch1,CC105,L1,multiple_choice,"O(1)","O(n)","O(log n)","O(n^2)",,,,',
      '"A Binary Search Tree offers O(1) search time in the worst case.","",Ch1,CC105,L1,true_false,,,,,false,"Worst-case unbalanced BST is O(n), balanced is O(log n).",,,',
      '"What data structure uses LIFO (Last-In, First-Out)?","",Ch1,CC105,L1,identification,,,,,,,,,"Stack","stack;call stack"',
      '"List two graph traversal algorithms.","",Ch1,CC105,L1,enumeration,,,,,,,"BFS;DFS;Breadth-First Search;Depth-First Search",,',
      '"Who proposed the Turing Machine computational model?","",Ch1,CC105,L1,identification,,,,,,,,,"Alan Turing","alan turing;turing"',
    ].join("\n"),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    likesCount: 24,
    forksCount: 14,
  },
  {
    id: "pub-deck-3",
    title: "Web Fundamentals & Modern React Architecture",
    content: "HTML5 semantic tags, CSS Flexbox & Grid, JavaScript ES6+ features, React component lifecycle, Hooks (useState, useEffect, useMemo), and Next.js SSR.",
    summary: "Core concepts of modern web development and React Hooks.",
    tags: ["WebDev", "React", "Frontend"],
    program: "WADT",
    yearLevel: 1,
    semester: 2,
    subjectCode: "WD 102",
    authorId: "user-liza-3",
    authorName: "Liza Montero",
    authorRole: "STUDENT",
    authorSection: "WADT-1C",
    cardCount: 5,
    cardsCsv: [
      "front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants",
      '"What React Hook is used to manage side effects like API fetching?","",Ch2,WD102,L1,multiple_choice,"useEffect","useState","useContext","useReducer",,,,',
      '"Next.js App Router uses Server Components by default.","",Ch2,WD102,L1,true_false,,,,,true,"RSC (React Server Components) is default in Next.js App Router.",,,',
      '"What syntax extension allows writing HTML-like code in React?","",Ch2,WD102,L1,identification,,,,,,,,,"JSX","jsx;javascript xml"',
      '"List three basic HTTP request methods.","",Ch2,WD102,L1,enumeration,,,,,,,"GET;POST;PUT;DELETE",,',
      '"What CSS layout model is one-dimensional (row or column)?","",Ch2,WD102,L1,identification,,,,,,,,,"Flexbox","flexbox;flexible box;flex"',
    ].join("\n"),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    likesCount: 31,
    forksCount: 19,
  },
  {
    id: "pub-deck-4",
    title: "Principles of Marketing & Business Strategy",
    content: "The 4 Ps of Marketing (Product, Price, Place, Promotion), SWOT analysis frameworks, consumer behavior models, and market segmentation strategies.",
    summary: "4 Ps of marketing, SWOT analysis, and customer acquisition.",
    tags: ["Marketing", "Business", "BSBA"],
    program: "BSBA",
    yearLevel: 3,
    semester: 1,
    subjectCode: "MKT 301",
    authorId: "user-pedro-4",
    authorName: "Pedro Reyes",
    authorRole: "STUDENT",
    authorSection: "BSBA-3A",
    cardCount: 4,
    cardsCsv: [
      "front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants",
      '"Which of the following is NOT one of the 4 Ps of marketing?","",Ch1,MKT301,L1,multiple_choice,"Profit","Product","Price","Promotion",,,,',
      '"SWOT stands for Strengths, Weaknesses, Opportunities, and Threats.","",Ch1,MKT301,L1,true_false,,,,,true,"SWOT evaluates internal and external strategic factors.",,,',
      '"What business term describes dividing a target market into approachable groups?","",Ch1,MKT301,L1,identification,,,,,,,,,"Market Segmentation","market segmentation;segmentation"',
      '"Name two pricing strategies.","",Ch1,MKT301,L1,enumeration,,,,,,,"Cost-plus;Skimming;Penetration;Freemium",,',
    ].join("\n"),
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    likesCount: 15,
    forksCount: 7,
  },
];

// Global in-memory deck cache across serverless requests in same node process
const globalCommunityDecks: PublishedDeckItem[] = [...initialCommunityDecks];

export function getCommunityDecks(): PublishedDeckItem[] {
  return globalCommunityDecks;
}

export function addCommunityDeck(item: PublishedDeckItem): void {
  globalCommunityDecks.unshift(item);
}
