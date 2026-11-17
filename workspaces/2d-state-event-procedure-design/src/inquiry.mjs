import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as legacy from "./inquiry-v1.mjs";
import {
  baseQuestionConfig,
  defaultMaxDepth,
  finalQuestionConfig,
  generatedBaseQuestionRange,
  legacyInquiryDefaults,
  perspectiveQuestionConfig
} from "./inquiry-catalog.mjs";
import { buildQuestionGeneratorPrompt } from "./question-generator-prompt.mjs";
import { validateReturnSchema } from "./validate_return_schema.mjs";

const specification = JSON.parse(readFileSync(new URL("../inquiry-definitions.json", import.meta.url), "utf8"));
export const inquiryDefinitions = Object.fromEntries(specification.states.map(state => [state.keyword, state]));

const batchKeywords = [
  "inquiry_base_questions",
  "inquiry_base_answers",
  "inquiry_perspective_questions",
  "inquiry_perspective_answers",
  "inquiry_perspective_synthesis",
  "inquiry_final_questions",
  "inquiry_final_answers"
];

const clone = value => structuredClone(value);
const nonblank = value => typeof value === "string" && value.trim().length > 0;

function mergeConfig(base, overrides) {
  const output = clone(base);
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return output;
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value) &&
        output[key] && typeof output[key] === "object" && !Array.isArray(output[key])) {
      output[key] = mergeConfig(output[key], value);
    } else {
      output[key] = clone(value);
    }
  }
  return output;
}

function stableId(...parts) {
  return parts.map(part => encodeURIComponent(String(part))).join(":");
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(label + " must be a positive integer");
  return value;
}

function deterministicIndex(seed, salt, limit) {
  const digest = createHash("sha256").update(String(seed) + "|" + String(salt)).digest("hex");
  return Number.parseInt(digest.slice(0, 12), 16) % limit;
}

function selectEntries(pool, count, mode, seed, salt, replacement = "without") {
  if (!Array.isArray(pool) || pool.length === 0) throw new TypeError("Selection pool must be a non-empty array");
  positiveInteger(count, "selection count");
  if (replacement !== "with" && replacement !== "without") throw new TypeError("replacement must be with or without");

  if (mode === "configured_default") {
    const selected = pool.filter(item => item.default_selection === true);
    if (selected.length !== count) {
      throw new TypeError("Configured default selection contains " + selected.length + " entries; expected " + count);
    }
    return selected.map(item => ({ ...clone(item), slot_id: item.slot_id ?? item.id }));
  }
  if (mode !== "sample") throw new TypeError("Unsupported pool selection mode: " + mode);
  if (replacement === "without" && pool.length < count) {
    throw new TypeError("Selection pool has " + pool.length + " entries but " + count + " are required");
  }

  const available = [...pool];
  const seen = new Map();
  const selected = [];
  for (let index = 0; index < count; index += 1) {
    const candidates = replacement === "with" ? pool : available;
    const chosenIndex = deterministicIndex(seed, salt + "|" + index, candidates.length);
    const item = candidates[chosenIndex];
    const key = String(item.id ?? item.slot_id);
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    const baseSlot = item.slot_id ?? item.id;
    const slot_id = occurrence === 1 ? baseSlot : String(baseSlot) + ":copy:" + occurrence;
    selected.push({ ...clone(item), slot_id });
    if (replacement === "without") available.splice(chosenIndex, 1);
  }
  return selected;
}

function validateConfiguration(config) {
  const base = config.baseQuestionConfig;
  if (!base || !["supplied", "generated"].includes(base.mode)) {
    throw new TypeError("Base question mode must be supplied or generated");
  }
  positiveInteger(base.count, "baseQuestionConfig.count");
  if (base.mode === "supplied") {
    if (!Array.isArray(base.questions) || base.questions.length !== base.count) {
      throw new TypeError("Supplied Base-0 count must equal the configured question array length");
    }
    const slots = base.questions.map(question => question.slot_id);
    if (slots.some(slot => !nonblank(slot)) || new Set(slots).size !== slots.length ||
        base.questions.some(question => !nonblank(question.text))) {
      throw new TypeError("Supplied Base-0 questions need unique slot IDs and nonblank text");
    }
  } else {
    const range = base.generatedQuestionRange ?? generatedBaseQuestionRange;
    if (!Number.isSafeInteger(range.min) || !Number.isSafeInteger(range.max) ||
        base.count < range.min || base.count > range.max) {
      throw new TypeError("Generated Base-0 count must be within the configured five-to-seven range");
    }
    if (!Array.isArray(base.generatedTopicRows) || base.generatedTopicRows.length < base.count) {
      throw new TypeError("Generated Base-0 topic pool must contain the configured question count");
    }
    const ids = base.generatedTopicRows.map(topic => topic.id);
    if (ids.some(id => !nonblank(id)) || new Set(ids).size !== ids.length ||
        base.generatedTopicRows.some(topic => !nonblank(topic.instruction))) {
      throw new TypeError("Generated Base-0 topics need unique IDs and nonblank instructions");
    }
  }

  const perspectives = config.perspectiveQuestionConfig;
  positiveInteger(perspectives.perspectiveCount, "perspectiveCount");
  positiveInteger(perspectives.questionsPerPerspective, "questionsPerPerspective");
  positiveInteger(config.maxDepth, "maxDepth");
  if (!Array.isArray(perspectives.perspectivePool) || perspectives.perspectivePool.length === 0) {
    throw new TypeError("perspectivePool must be a non-empty array");
  }
  const policy = perspectives.selectionPolicy ?? {};
  if (policy.scope !== undefined && !["batch", "per_parent"].includes(policy.scope)) {
    throw new TypeError("Perspective sampling scope must be batch or per_parent");
  }
  const counts = perspectives.questionCountByPerspective ?? [];
  const perspectiveIds = perspectives.perspectivePool.map(row => row.id);
  if (perspectiveIds.some(id => !nonblank(id)) || new Set(perspectiveIds).size !== perspectiveIds.length) {
    throw new TypeError("Perspective IDs must be nonblank and unique");
  }
  const countIds = counts.map(item => item.perspective_id);
  if (countIds.some(id => !perspectiveIds.includes(id)) || new Set(countIds).size !== countIds.length) {
    throw new TypeError("Question-count overrides must identify distinct configured perspectives");
  }
  for (const entry of counts) positiveInteger(entry.count, "questionCountByPerspective.count");
  for (const row of perspectives.perspectivePool) {
    if (!nonblank(row.instruction) || !Array.isArray(row.questionPromptPool) || row.questionPromptPool.length === 0) {
      throw new TypeError("Every perspective needs an instruction and a non-empty question prompt pool");
    }
    const promptIds = row.questionPromptPool.map(prompt => prompt.id);
    if (promptIds.some(id => !nonblank(id)) || new Set(promptIds).size !== promptIds.length ||
        row.questionPromptPool.some(prompt => !nonblank(prompt.text) || !nonblank(prompt.kind))) {
      throw new TypeError("Perspective question prompts need unique IDs, nonblank text, and a kind");
    }
  }
  if (!nonblank(config.finalQuestionConfig.taskInstruction) ||
      !nonblank(config.finalQuestionConfig.questionStyle) ||
      !nonblank(config.finalQuestionConfig.returnRule)) {
    throw new TypeError("Final-question generation requires task, style, and return instructions");
  }
}
function buildInitialBaseQuestions(inquiry) {
  const base = inquiry.config.baseQuestionConfig;
  const seed = inquiry.seed;
  if (base.mode === "supplied") {
    inquiry.base_questions = base.questions.map(item => ({
      question_id: stableId(inquiry.run_id, "base", item.slot_id),
      slot_id: item.slot_id,
      labels: clone(item.labels ?? []),
      question: item.text
    }));
    inquiry.base_question_slots = [];
    return;
  }
  const policy = base.selectionPolicy ?? { mode: "configured_default", replacement: "without" };
  const selected = selectEntries(
    base.generatedTopicRows,
    base.count,
    policy.mode,
    policy.seed ?? seed,
    "base-topics",
    policy.replacement ?? "without"
  );
  inquiry.base_question_slots = selected.map(topic => ({
    question_id: stableId(inquiry.run_id, "base", topic.slot_id),
    slot_id: topic.slot_id,
    labels: clone(topic.labels ?? []),
    instruction: topic.instruction
  }));
  inquiry.base_questions = [];
}

export function createInquiry(runId, overrides = {}) {
  if (runId === undefined) return legacy.createInquiry();
  if (!nonblank(String(runId))) throw new TypeError("A procedure nonce is required for version-2 inquiry");
  const config = mergeConfig({
    ...legacyInquiryDefaults,
    baseQuestionConfig,
    perspectiveQuestionConfig,
    finalQuestionConfig,
    maxDepth: defaultMaxDepth
  }, overrides);
  validateConfiguration(config);
  const inquiry = {
    version: 2,
    run_id: String(runId),
    seed: config.perspectiveQuestionConfig.selectionPolicy?.seed ?? String(runId),
    config,
    base_questions: [],
    base_question_slots: [],
    pairs: [],
    rounds: [],
    frontier_qa_ids: [],
    current_depth: 0,
    completed: false
  };
  buildInitialBaseQuestions(inquiry);
  return inquiry;
}

function arrayProperty(schema, keyword) {
  const arraySchema = schema.properties?.[keyword];
  if (!arraySchema || arraySchema.type !== "array" || !arraySchema.items || arraySchema.items === false) {
    throw new TypeError("Missing base array schema for " + keyword);
  }
  return arraySchema;
}

function pinArray(schema, keyword, rows, fields) {
  const arraySchema = arrayProperty(schema, keyword);
  const baseItem = clone(arraySchema.items);
  arraySchema.minItems = rows.length;
  arraySchema.maxItems = rows.length;
  arraySchema.prefixItems = rows.map(row => {
    const item = clone(baseItem);
    for (const field of fields) {
      if (!Object.hasOwn(row, field)) throw new TypeError("Cannot pin missing " + field + " for " + keyword);
      item.properties[field] = { ...item.properties[field], const: clone(row[field]) };
    }
    return item;
  });
  arraySchema.items = false;
}

function parentsFor(inquiry) {
  return inquiry.frontier_qa_ids.map(id => inquiry.pairs.find(pair => pair.qa_id === id))
    .filter(Boolean);
}

function questionCountFor(config, row) {
  const override = (config.questionCountByPerspective ?? []).find(item => item.perspective_id === row.id);
  const count = override?.count ?? row.questionsPerParent ?? config.questionsPerPerspective;
  return positiveInteger(count, "questions per perspective");
}

function ensureRound(inquiry) {
  if (inquiry.current_depth < 1) throw new TypeError("The Base-0 answer stage must complete before perspective inquiry");
  let round = inquiry.rounds.find(item => item.depth === inquiry.current_depth);
  if (!round) {
    round = {
      depth: inquiry.current_depth,
      parent_qa_ids: [...inquiry.frontier_qa_ids],
      manifest: null,
      perspective_questions: [],
      perspective_answers: [],
      syntheses: [],
      final_questions: [],
      final_answers: []
    };
    inquiry.rounds.push(round);
  }
  if (!round.manifest) freezeRoundManifest(inquiry, round);
  return round;
}

function freezeRoundManifest(inquiry, round) {
  const config = inquiry.config.perspectiveQuestionConfig;
  const policy = config.selectionPolicy ?? {};
  const selectionSeed = policy.seed ?? inquiry.seed;
  const parents = round.parent_qa_ids.map(id => inquiry.pairs.find(pair => pair.qa_id === id));
  if (parents.some(parent => !parent)) throw new TypeError("The stage manifest refers to an unknown parent Q&A ID");

  const batchPerspectives = policy.scope === "per_parent"
    ? null
    : selectEntries(config.perspectivePool, config.perspectiveCount,
        policy.perspectiveMode ?? "configured_default", selectionSeed, "perspectives:batch",
        policy.replacement ?? "without");

  const rowsByParent = [];
  const questionSlots = [];
  for (const parent of parents) {
    const perspectives = batchPerspectives ?? selectEntries(
      config.perspectivePool,
      config.perspectiveCount,
      policy.perspectiveMode ?? "configured_default",
      selectionSeed,
      "perspectives:" + parent.qa_id,
      policy.replacement ?? "without"
    );
    const selectedRows = [];
    for (const perspective of perspectives) {
      const count = questionCountFor(config, perspective);
      const prompts = selectEntries(
        perspective.questionPromptPool,
        count,
        policy.questionMode ?? "configured_default",
        selectionSeed,
        "prompts:" + round.depth + ":" +
          (policy.scope === "per_parent" ? parent.qa_id : "batch") + ":" + perspective.id,
        policy.replacement ?? "without"
      );
      const slots = prompts.map(prompt => {
        const slot_id = prompt.slot_id ?? prompt.id;
        const question_id = stableId(inquiry.run_id, "depth", round.depth, "parent", parent.qa_id,
          "perspective", perspective.id, "slot", slot_id);
        const slot = {
          question_id,
          slot_id,
          parent_qa_id: parent.qa_id,
          perspective_id: perspective.id,
          labels: [...(perspective.labels ?? []), ...(prompt.labels ?? [])],
          prompt_id: prompt.id,
          source_anchor_ids: clone(parent.source_anchor_ids ?? []),
          prompt_text: prompt.text
        };
        questionSlots.push(slot);
        return { ...clone(prompt), slot_id };
      });
      selectedRows.push({
        id: perspective.id,
        labels: clone(perspective.labels ?? []),
        instruction: perspective.instruction,
        questionsPerParent: count,
        selectedQuestionPrompts: slots,
        parent_qa_id: parent.qa_id
      });
    }
    rowsByParent.push({ parent_qa_id: parent.qa_id, rows: selectedRows });
  }

  const mergedRows = new Map();
  for (const parentSelection of rowsByParent) {
    for (const row of parentSelection.rows) {
      let merged = mergedRows.get(row.id);
      if (!merged) {
        merged = {
          id: row.id,
          labels: row.labels,
          instruction: row.instruction,
          questionsPerParent: row.questionsPerParent,
          parentSelections: []
        };
        mergedRows.set(row.id, merged);
      }
      merged.parentSelections.push({
        parent_qa_id: parentSelection.parent_qa_id,
        selectedQuestionPrompts: clone(row.selectedQuestionPrompts)
      });
    }
  }

  round.manifest = {
    seed: selectionSeed,
    depth: round.depth,
    parent_qa_ids: [...round.parent_qa_ids],
    perspective_count: config.perspectiveCount,
    question_count_by_perspective: clone(config.questionCountByPerspective ?? []),
    selection_policy: clone(policy),
    rows_by_parent: rowsByParent,
    selected_generator_rows: [...mergedRows.values()],
    question_slots: questionSlots
  };
}

function synthesisTargets(inquiry, round) {
  return round.parent_qa_ids.map(parentId => {
    const questions = round.perspective_questions.filter(question => question.parent_qa_id === parentId);
    return {
      parent_qa_id: parentId,
      synthesis_id: stableId(inquiry.run_id, "depth", round.depth, "synthesis", parentId),
      supporting_question_ids: questions.map(question => question.question_id)
    };
  });
}

function finalQuestionTargets(inquiry, round) {
  const targets = synthesisTargets(inquiry, round).map(target => {
    const parent = inquiry.pairs.find(pair => pair.qa_id === target.parent_qa_id);
    const synthesis = round.syntheses.find(item => item.parent_qa_id === target.parent_qa_id);
    const question_id = stableId(inquiry.run_id, "depth", round.depth, "parent", target.parent_qa_id, "final");
    const source_anchor_ids = [...new Set([
      ...(parent?.source_anchor_ids ?? []),
      ...round.perspective_answers
        .filter(answer => answer.parent_qa_id === target.parent_qa_id)
        .flatMap(answer => answer.source_anchor_ids ?? [])
    ])];
    return {
      question_id,
      parent_qa_id: target.parent_qa_id,
      synthesis_id: synthesis?.synthesis_id ?? target.synthesis_id,
      labels: ["stage:final"],
      source_anchor_ids
    };
  });
  round.final_question_slots = targets;
  return targets;
}

function questionGenerationPrompt(inquiry, keyword, round) {
  if (keyword === "inquiry_base_questions") {
    const base = inquiry.config.baseQuestionConfig;
    const rows = inquiry.base_question_slots.map(slot => ({
      id: slot.slot_id,
      labels: slot.labels,
      instruction: slot.instruction
    }));
    return buildQuestionGeneratorPrompt({
      taskInstruction: base.taskInstruction,
      questionStyle: base.questionStyle,
      questionCount: inquiry.base_question_slots.length,
      generatorRows: rows,
      lineageRule: "preserve each preassigned slot ID and category label",
      returnRule: "fill each preassigned question slot and return the complete array"
    });
  }

  if (keyword === "inquiry_perspective_questions") {
    const config = inquiry.config.perspectiveQuestionConfig;
    return buildQuestionGeneratorPrompt({
      taskInstruction: config.taskInstruction,
      questionStyle: config.questionStyle,
      perspectiveCount: config.perspectiveCount,
      questionsPerPerspective: config.questionsPerPerspective,
      questionCountByPerspective: clone(config.questionCountByPerspective ?? []),
      generatorRows: clone(round.manifest.selected_generator_rows),
      questionPoolRule: config.questionPoolRule,
      lineageRule: config.lineageRule,
      returnRule: config.returnRule
    });
  }

  if (keyword === "inquiry_final_questions") {
    const config = inquiry.config.finalQuestionConfig;
    const parents = round.parent_qa_ids.map(id => inquiry.pairs.find(pair => pair.qa_id === id));
    const targets = finalQuestionTargets(inquiry, round);
    const generatorRows = parents.map(parent => {
      const synthesis = round.syntheses.find(item => item.parent_qa_id === parent.qa_id);
      const target = targets.find(item => item.parent_qa_id === parent.qa_id);
      return {
        id: parent.qa_id,
        labels: ["stage:final"],
        instruction: "Extend this parent's inquiry using its synthesis.",
        selectedQuestionPrompts: [{
          id: target.synthesis_id,
          labels: ["stage:synthesis"],
          kind: "synthesis",
          text: synthesis.statement
        }]
      };
    });
    return buildQuestionGeneratorPrompt({
      taskInstruction: config.taskInstruction,
      questionStyle: config.questionStyle,
      questionCount: parents.length,
      generatorRows,
      lineageRule: "preserve each parent Q&A ID, synthesis ID, labels, and source anchors",
      returnRule: config.returnRule
    });
  }
  throw new TypeError("No question-generation prompt is defined for " + keyword);
}

function projectBatch(keyword, read) {
  const inquiry = read("inquiry");
  if (!inquiry || inquiry.version !== 2) throw new TypeError("A version-2 inquiry record is required for " + keyword);
  const definition = inquiryDefinitions[keyword];
  if (!definition) throw new ReferenceError(keyword);
  const schema = clone(definition.return_schema);
  const context = {
    verbatim_request: read("verbatim_request"),
    user_intent: read("user_intent"),
    inquiry_version: inquiry.version
  };

  if (keyword === "inquiry_base_questions") {
    context.topic_slots = clone(inquiry.base_question_slots);
    context.question_count = inquiry.base_question_slots.length;
    pinArray(schema, keyword, inquiry.base_question_slots, ["question_id", "slot_id", "labels"]);
    return {
      keyword,
      instruction: definition.instruction + "\n\n" + questionGenerationPrompt(inquiry, keyword),
      final_schema: schema,
      context
    };
  }

  if (keyword === "inquiry_base_answers") {
    const questions = clone(inquiry.base_questions);
    context.questions = questions;
    pinArray(schema, keyword, questions, ["question_id", "slot_id", "labels", "question"]);
    return { keyword, instruction: definition.instruction, final_schema: schema, context };
  }

  const round = ensureRound(inquiry);
  context.depth = round.depth;
  context.parent_qa_ids = [...round.parent_qa_ids];

  if (keyword === "inquiry_perspective_questions") {
    const parents = round.parent_qa_ids.map(id => inquiry.pairs.find(pair => pair.qa_id === id));
    context.parent_qas = clone(parents);
    context.stage_manifest = clone(round.manifest);
    context.question_slots = clone(round.manifest.question_slots);
    pinArray(schema, keyword, round.manifest.question_slots, [
      "question_id", "slot_id", "parent_qa_id", "perspective_id", "labels", "prompt_id", "source_anchor_ids"
    ]);
    return {
      keyword,
      instruction: definition.instruction + "\n\n" + questionGenerationPrompt(inquiry, keyword, round),
      final_schema: schema,
      context
    };
  }

  if (keyword === "inquiry_perspective_answers") {
    const questions = clone(round.perspective_questions);
    context.questions = questions;
    pinArray(schema, keyword, questions, [
      "question_id", "slot_id", "parent_qa_id", "perspective_id", "labels", "prompt_id", "source_anchor_ids", "question"
    ]);
    return { keyword, instruction: definition.instruction, final_schema: schema, context };
  }

  if (keyword === "inquiry_perspective_synthesis") {
    const parents = round.parent_qa_ids.map(id => inquiry.pairs.find(pair => pair.qa_id === id));
    const targets = synthesisTargets(inquiry, round);
    context.parent_qas = clone(parents);
    context.perspective_questions = clone(round.perspective_questions);
    context.perspective_answers = clone(round.perspective_answers);
    context.synthesis_targets = clone(targets);
    pinArray(schema, keyword, targets, ["parent_qa_id", "synthesis_id", "supporting_question_ids"]);
    return { keyword, instruction: definition.instruction, final_schema: schema, context };
  }

  if (keyword === "inquiry_final_questions") {
    const parents = round.parent_qa_ids.map(id => inquiry.pairs.find(pair => pair.qa_id === id));
    const targets = finalQuestionTargets(inquiry, round);
    context.parent_qas = clone(parents);
    context.syntheses = clone(round.syntheses);
    context.perspective_answers = clone(round.perspective_answers);
    context.question_slots = clone(targets);
    pinArray(schema, keyword, targets, ["question_id", "parent_qa_id", "synthesis_id", "labels", "source_anchor_ids"]);
    return {
      keyword,
      instruction: definition.instruction + "\n\n" + questionGenerationPrompt(inquiry, keyword, round),
      final_schema: schema,
      context
    };
  }

  if (keyword === "inquiry_final_answers") {
    const questions = clone(round.final_questions);
    context.questions = questions;
    context.syntheses = clone(round.syntheses);
    pinArray(schema, keyword, questions, [
      "question_id", "parent_qa_id", "synthesis_id", "labels", "source_anchor_ids", "question"
    ]);
    return { keyword, instruction: definition.instruction, final_schema: schema, context };
  }

  throw new TypeError("Unsupported batch inquiry state: " + keyword);
}

function expectedQuestionIds(rows) {
  return rows.map(item => item.question_id);
}

function duplicateIdentity(rows, keyword) {
  const field = keyword === "inquiry_perspective_synthesis" ? "parent_qa_id" : "question_id";
  const ids = rows.map(item => item[field]);
  return ids.find((id, index) => ids.indexOf(id) !== index);
}

function duplicateQuestionText(rows, keyword) {
  const seen = new Set();
  for (const row of rows) {
    const parent = row.parent_qa_id ?? "base";
    const text = row.question.normalize("NFKC").trim().toLocaleLowerCase();
    const key = parent + "|" + text;
    if (seen.has(key)) return { parent_qa_id: parent, question: row.question };
    seen.add(key);
  }
  return null;
}

function batchHandler(keyword) {
  return async (_error, _index, read, input, projection) => {
    if (input === undefined) return projectBatch(keyword, read);
    let { valid, errors } = validateReturnSchema(input, projection.final_schema);
    if (valid) {
      const rows = input[keyword];
      const duplicate = duplicateIdentity(rows, keyword);
      if (duplicate !== undefined) {
        valid = false;
        errors = { duplicate_question_id: duplicate };
      } else if (["inquiry_base_questions", "inquiry_perspective_questions", "inquiry_final_questions"].includes(keyword)) {
        const duplicateText = duplicateQuestionText(rows, keyword);
        if (duplicateText) {
          valid = false;
          errors = { duplicate_question_text: duplicateText };
        }
      }
    }
    return {
      valid,
      input: valid ? input : null,
      error: valid ? null : {
        error: true,
        errortype: keyword + ".input_error",
        diagnostic_data: errors
      }
    };
  };
}

const batchHandlers = Object.fromEntries(batchKeywords.map(keyword => [keyword, batchHandler(keyword)]));
export const inquiryHandlers = { ...legacy.inquiryHandlers, ...batchHandlers };

function currentRoundFor(record) {
  const inquiry = record.inputs.inquiry;
  return inquiry.rounds.find(item => item.depth === inquiry.current_depth);
}

function rowsById(rows) {
  return new Map(rows.map(row => [row.question_id, row]));
}

function saveGeneratedBaseQuestions(record) {
  const inquiry = record.inputs.inquiry;
  const rows = record.inputs.inquiry_base_questions;
  const expected = inquiry.base_question_slots;
  const byId = rowsById(rows);
  inquiry.base_questions = expected.map(slot => {
    const generated = byId.get(slot.question_id);
    if (!generated) throw new TypeError("Missing generated Base-0 question ID: " + slot.question_id);
    return { ...clone(slot), question: generated.question };
  });
}

function saveBaseAnswers(record) {
  const inquiry = record.inputs.inquiry;
  const answers = rowsById(record.inputs.inquiry_base_answers);
  const roots = inquiry.base_questions.map(question => {
    const answer = answers.get(question.question_id);
    if (!answer) throw new TypeError("Missing Base-0 answer for question ID: " + question.question_id);
    const qa_id = stableId("qa", question.question_id);
    const pair = {
      id: qa_id,
      qa_id,
      question_id: question.question_id,
      slot_id: question.slot_id,
      labels: clone(question.labels),
      depth: 0,
      parent_qa_id: null,
      question: question.question,
      answer: answer.answer,
      source_anchor_ids: clone(answer.source_anchor_ids),
      evidence: clone(answer.evidence ?? []),
      unresolved: answer.unresolved
    };
    return pair;
  });
  inquiry.pairs = [...inquiry.pairs, ...roots];
  inquiry.frontier_qa_ids = roots.map(pair => pair.qa_id);
  inquiry.current_depth = 1;
}

function savePerspectiveQuestions(record) {
  const inquiry = record.inputs.inquiry;
  const round = currentRoundFor(record);
  const expected = round.manifest.question_slots;
  const returned = rowsById(record.inputs.inquiry_perspective_questions);
  round.perspective_questions = expected.map(slot => {
    const question = returned.get(slot.question_id);
    if (!question) throw new TypeError("Missing perspective question ID: " + slot.question_id);
    return clone(question);
  });
}

function savePerspectiveAnswers(record) {
  const inquiry = record.inputs.inquiry;
  const round = currentRoundFor(record);
  const answers = rowsById(record.inputs.inquiry_perspective_answers);
  round.perspective_answers = round.perspective_questions.map(question => {
    const answer = answers.get(question.question_id);
    if (!answer) throw new TypeError("Missing perspective answer ID: " + question.question_id);
    return clone(answer);
  });
  const pairs = round.perspective_answers.map(answer => {
    const qa_id = stableId("qa", answer.question_id);
    return {
      id: qa_id,
      qa_id,
      question_id: answer.question_id,
      depth: round.depth,
      parent_qa_id: answer.parent_qa_id,
      perspective_id: answer.perspective_id,
      labels: clone(answer.labels),
      prompt_id: answer.prompt_id,
      question: answer.question,
      answer: answer.answer,
      source_anchor_ids: clone(answer.source_anchor_ids),
      evidence: clone(answer.evidence ?? []),
      unresolved: answer.unresolved
    };
  });
  inquiry.pairs.push(...pairs);
}

function saveSynthesis(record) {
  const inquiry = record.inputs.inquiry;
  const round = currentRoundFor(record);
  const returned = new Map(record.inputs.inquiry_perspective_synthesis.map(item => [item.parent_qa_id, item]));
  const targets = synthesisTargets(inquiry, round);
  round.syntheses = targets.map(target => {
    const synthesis = returned.get(target.parent_qa_id);
    if (!synthesis) throw new TypeError("Missing synthesis for parent Q&A ID: " + target.parent_qa_id);
    return clone(synthesis);
  });
}

function saveFinalQuestions(record) {
  const inquiry = record.inputs.inquiry;
  const round = currentRoundFor(record);
  const returned = rowsById(record.inputs.inquiry_final_questions);
  const targets = finalQuestionTargets(inquiry, round);
  round.final_questions = targets.map(target => {
    const question = returned.get(target.question_id);
    if (!question) throw new TypeError("Missing final question ID: " + target.question_id);
    return clone(question);
  });
}

function saveFinalAnswersAndAdvance(record) {
  const inquiry = record.inputs.inquiry;
  const round = currentRoundFor(record);
  const answers = rowsById(record.inputs.inquiry_final_answers);
  round.final_answers = round.final_questions.map(question => {
    const answer = answers.get(question.question_id);
    if (!answer) throw new TypeError("Missing final answer ID: " + question.question_id);
    return clone(answer);
  });
  const pairs = round.final_answers.map(answer => {
    const qa_id = stableId("qa", answer.question_id);
    return {
      id: qa_id,
      qa_id,
      question_id: answer.question_id,
      depth: round.depth,
      parent_qa_id: answer.parent_qa_id,
      synthesis_id: answer.synthesis_id,
      labels: clone(answer.labels),
      question: answer.question,
      answer: answer.answer,
      source_anchor_ids: clone(answer.source_anchor_ids),
      evidence: clone(answer.evidence ?? []),
      unresolved: answer.unresolved,
      stage: "final"
    };
  });
  inquiry.pairs.push(...pairs);
  if (round.depth < inquiry.config.maxDepth) {
    inquiry.frontier_qa_ids = pairs.map(pair => pair.qa_id);
    inquiry.current_depth += 1;
  } else {
    inquiry.completed = true;
    inquiry.completed_depth = round.depth;
  }
}

function routeAfterFinalAnswers(_value, record) {
  const inquiry = record.inputs.inquiry;
  return inquiry.current_depth < inquiry.config.maxDepth ? "next_depth" : "complete";
}

export const answerTransition = {
  selectRoute(_value, record) {
    const inquiry = record.inputs.inquiry;
    if (!inquiry) return "legacy";
    if (inquiry.version !== 2) return "legacy_inquiry";
    return inquiry.config.baseQuestionConfig.mode === "generated" ? "base_generated" : "base_supplied";
  },
  routes: {
    legacy: { next: "desired_state" },
    legacy_inquiry: legacy.answerTransition.routes.inquiry,
    base_generated: { next: "inquiry_base_questions" },
    base_supplied: { next: "inquiry_base_answers" }
  }
};

const batchTransitions = {
  inquiry_base_questions: {
    routes: { default: { next: "inquiry_base_answers", apply: saveGeneratedBaseQuestions } }
  },
  inquiry_base_answers: {
    routes: { default: { next: "inquiry_perspective_questions", apply: saveBaseAnswers } }
  },
  inquiry_perspective_questions: {
    routes: { default: { next: "inquiry_perspective_answers", apply: savePerspectiveQuestions } }
  },
  inquiry_perspective_answers: {
    routes: { default: { next: "inquiry_perspective_synthesis", apply: savePerspectiveAnswers } }
  },
  inquiry_perspective_synthesis: {
    routes: { default: { next: "inquiry_final_questions", apply: saveSynthesis } }
  },
  inquiry_final_questions: {
    routes: { default: { next: "inquiry_final_answers", apply: saveFinalQuestions } }
  },
  inquiry_final_answers: {
    selectRoute: routeAfterFinalAnswers,
    routes: {
      next_depth: { next: "inquiry_perspective_questions", apply: saveFinalAnswersAndAdvance },
      complete: { next: "desired_state", apply: saveFinalAnswersAndAdvance }
    }
  }
};

export const inquiryTransitions = { ...legacy.inquiryTransitions, ...batchTransitions };

export function includeInquiry(projection, inputs) {
  const inquiry = inputs.inquiry;
  if (!inquiry || inquiry.version !== 2) {
    legacy.includeInquiry(projection, inputs);
    return;
  }
  legacy.includeInquiry(projection, inputs);
  if (inquiry.completed && [
    "desired_state",
    "required_changes",
    "agent_actions",
    "change_action_mapping",
    "execution_procedure",
    "simulation_results",
    "execution_results",
    "post_execution_diagnostic"
  ].includes(projection.keyword)) {
    projection.context.inquiry = clone(inquiry);
  }
}

// Exposed for callers that need to preserve an old unversioned creation route
// while all current Procedure profiles use version 2 for new executions.
export const createLegacyInquiry = legacy.createInquiry;
