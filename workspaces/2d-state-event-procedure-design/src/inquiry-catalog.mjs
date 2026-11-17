export const baseQuestionCount = 6;
export const generatedBaseQuestionRange = { min: 5, max: 7 };
export const baseQuestionTaskInstruction = "Explore the draft without presuming it has a defect.";
export const baseQuestionStyle = "distinct, concrete questions covering different active topic categories";

export const baseQuestions = [
  { slot_id: "base:purpose", labels: ["category:purpose"], text: "What user need does the proposed review process address, and how is that need reflected in its stages?" },
  { slot_id: "base:requirement_coverage", labels: ["category:requirement_coverage"], text: "How does it trace each original requirement through the draft, findings, revision, and final review?" },
  { slot_id: "base:evidence", labels: ["category:evidence"], text: "How does it preserve the distinction between source evidence, inference, assumptions, and proposed choices?" },
  { slot_id: "base:composition", labels: ["category:composition"], text: "How do the stages and their inputs connect while preserving each question's answer and derivation lineage?" },
  { slot_id: "base:exploration", labels: ["category:exploration"], text: "How do question quota, perspectives, and depth determine the breadth of the inquiry?" },
  { slot_id: "base:operation", labels: ["category:operation"], text: "How does the process handle incomplete batches, retries, unresolved answers, and completion?" }
];

export const baseQuestionTopics = [
  { id: "purpose", labels: ["category:purpose"], default_selection: true, instruction: "Cover the user need and how the stages address it." },
  { id: "requirement_coverage", labels: ["category:requirement_coverage"], default_selection: true, instruction: "Cover how original requirements are traced." },
  { id: "evidence", labels: ["category:evidence"], default_selection: true, instruction: "Cover distinctions among evidence, inference, assumptions, and choices." },
  { id: "composition", labels: ["category:composition"], default_selection: true, instruction: "Cover stage connections and question-answer lineage." },
  { id: "exploration", labels: ["category:exploration"], default_selection: true, instruction: "Cover quota, perspectives, and depth." },
  { id: "operation", labels: ["category:operation"], default_selection: true, instruction: "Cover batch failures, retries, unresolved items, and completion." },
  { id: "alternatives", labels: ["category:alternatives"], instruction: "Explore a viable alternative or different interpretation." },
  { id: "consequences", labels: ["category:consequences"], instruction: "Explore a relevant consequence or boundary case." }
];

export const baseQuestionConfig = {
  mode: "supplied",
  count: baseQuestionCount,
  questions: baseQuestions,
  taskInstruction: baseQuestionTaskInstruction,
  questionStyle: baseQuestionStyle,
  generatedQuestionRange: generatedBaseQuestionRange,
  generatedTopicRows: baseQuestionTopics,
  selectionPolicy: { mode: "configured_default", replacement: "without", seed: null }
};

export const perspectiveCount = 4;
export const questionsPerPerspective = 1;
export const questionCountByPerspective = [
  { perspective_id: "assumptions", count: questionsPerPerspective },
  { perspective_id: "evidence", count: questionsPerPerspective },
  { perspective_id: "alternatives", count: questionsPerPerspective },
  { perspective_id: "failure_cases", count: questionsPerPerspective }
];

export const perspectiveGeneratorPool = [
  {
    id: "assumptions",
    labels: ["perspective:assumptions"],
    default_selection: true,
    instruction: "Examine dependencies that must be true.",
    questionPromptPool: [
      { id: "assumption-dependency", labels: ["perspective:assumptions", "category:dependency"], kind: "prompt_variant", default_selection: true, text: "What unstated dependency must hold for this answer to be valid?" },
      { id: "assumption-boundary", labels: ["perspective:assumptions", "category:boundary"], kind: "prompt_variant", text: "What boundary condition could change this answer?" }
    ]
  },
  {
    id: "evidence",
    labels: ["perspective:evidence"],
    default_selection: true,
    instruction: "Examine evidence that could support, qualify, or overturn the answer.",
    questionPromptPool: [
      { id: "evidence-observation", labels: ["perspective:evidence", "category:observation"], kind: "prompt_variant", default_selection: true, text: "What observation could test the answer's central claim?" },
      { id: "evidence-source", labels: ["perspective:evidence", "category:source"], kind: "prompt_variant", text: "What source would most change confidence in the answer?" }
    ]
  },
  {
    id: "alternatives",
    labels: ["perspective:alternatives"],
    default_selection: true,
    instruction: "Examine alternative explanations or approaches.",
    questionPromptPool: [
      { id: "alternative-explanation", labels: ["perspective:alternatives", "category:explanation"], kind: "prompt_variant", default_selection: true, text: "What other explanation could fit the same information?" },
      { id: "alternative-approach", labels: ["perspective:alternatives", "category:approach"], kind: "prompt_variant", text: "What different approach could address the same parent question?" }
    ]
  },
  {
    id: "failure_cases",
    labels: ["perspective:failure_cases"],
    default_selection: true,
    instruction: "Examine conditions that could produce an undesired result.",
    questionPromptPool: [
      { id: "failure-boundary", labels: ["perspective:failure_cases", "category:boundary"], kind: "prompt_variant", default_selection: true, text: "Under what concrete condition could this answer lead to an undesired result?" },
      { id: "failure-interaction", labels: ["perspective:failure_cases", "category:interaction"], kind: "prompt_variant", text: "What interaction could make this answer fail in practice?" }
    ]
  }
];

export const perspectiveQuestionConfig = {
  perspectiveCount,
  questionsPerPerspective,
  questionCountByPerspective,
  perspectivePool: perspectiveGeneratorPool,
  taskInstruction: "Generate a tailored question for each active perspective and parent Q&A.",
  questionStyle: "concrete, concise, perspective-specific, and open to discovery",
  questionPoolRule: "Use each selected prompt variant to generate a tailored question for its parent; do not answer yet",
  lineageRule: "preserve each parent Q&A ID and its source anchors",
  returnRule: "return every labeled question slot as one array",
  selectionPolicy: {
    perspectiveMode: "configured_default",
    questionMode: "configured_default",
    scope: "batch",
    replacement: "without",
    seed: null
  }
};

export const finalQuestionConfig = {
  taskInstruction: "Given the parent Q&A and its synthesis of perspective answers, generate exactly one concrete final question that best extends the exploration.",
  questionStyle: "focused, concrete, and anchored in the supplied parent records",
  returnRule: "return exactly one final question per parent Q&A in one array"
};

export const defaultMaxDepth = 1;
export const legacyInquiryDefaults = {
  root_question_count: 3,
  root_instruction: "Given this request and the available context, what questions would help you fulfill it?",
  questions_per_case: 1,
  max_depth: 2
};
