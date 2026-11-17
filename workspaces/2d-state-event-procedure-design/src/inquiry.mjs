import { readFileSync } from 'node:fs';
import { validateReturnSchema } from './validate_return_schema.mjs';

const specification = JSON.parse(readFileSync(new URL('../inquiry-definitions.json', import.meta.url), 'utf8'));
export const inquiryDefinitions = Object.fromEntries(specification.states.map(state => [state.keyword, state]));

export function createInquiry() {
  for (const key of ['root_question_count', 'max_depth', 'questions_per_case']) {
    if (!Number.isSafeInteger(specification.config[key]) || specification.config[key] < 1) {
      throw new TypeError(`Inquiry configuration requires a positive integer: ${key}`);
    }
  }
  return { version: 1, config: structuredClone(specification.config), pairs: [], rounds: [], depth: 1, caseIndex: 0, questionIndex: 0 };
}

function frontier(inquiry) {
  return inquiry.pairs.filter(pair => pair.depth === inquiry.depth - 1);
}

function currentRound(inquiry) {
  return inquiry.rounds.at(-1);
}

function currentCase(inquiry) {
  return currentRound(inquiry).cases[inquiry.caseIndex];
}

function currentQuestion(inquiry) {
  return currentCase(inquiry).questions[inquiry.questionIndex];
}

function ancestry(inquiry, pair) {
  const parents = [];
  while (pair.parent_pair_id) {
    pair = inquiry.pairs.find(item => item.id === pair.parent_pair_id);
    parents.unshift(pair);
  }
  return parents;
}

function fixedList(schema, items) {
  schema.minItems = items.length;
  schema.maxItems = items.length;
  schema.prefixItems = items;
  schema.items = false;
}

function pinSources(schema, available, required) {
  schema.items.enum = available.map(pair => pair.id);
  schema.contains = { const: required };
  schema.minContains = 1;
}

function project(keyword, read) {
  const inquiry = read('inquiry');
  const definition = inquiryDefinitions[keyword];
  const schema = structuredClone(definition.return_schema);
  const value = schema.properties[keyword];
  const context = { verbatim_request: read('verbatim_request'), user_intent: read('user_intent'), depth: inquiry.depth };
  if (read('current_state') !== undefined) context.current_state = read('current_state');
  switch (keyword) {
    case 'inquiry_perspectives': {
      const pairs = frontier(inquiry);
      context.pairs = pairs;
      context.ancestry = pairs.map(pair => ({ pair_id: pair.id, pairs: ancestry(inquiry, pair) }));
      context.fixed_perspectives = inquiry.config.perspectives;
      const item = value.items;
      fixedList(value, pairs.map(pair => {
        const result = structuredClone(item);
        result.properties.pair_id.const = pair.id;
        return result;
      }));
      break;
    }
    case 'inquiry_questions': {
      const item = currentCase(inquiry);
      const available = inquiry.pairs.filter(pair => pair.depth < inquiry.depth);
      const parent = available.find(pair => pair.id === item.parent_pair_id);
      context.case = item;
      context.source_pair = parent;
      context.ancestry = ancestry(inquiry, parent);
      context.available_source_pairs = available;
      context.prior_questions_for_pair = currentRound(inquiry).cases
        .filter(previous => previous.parent_pair_id === parent.id)
        .flatMap(previous => previous.questions.map(question => ({
          question: question.question, perspective: previous.perspective.name
        })));
      context.question_count = inquiry.config.questions_per_case;
      value.properties.case_id.const = item.id;
      const questions = value.properties.questions;
      questions.minItems = inquiry.config.questions_per_case;
      questions.maxItems = inquiry.config.questions_per_case;
      pinSources(questions.items.properties.source_pair_ids, available, parent.id);
      break;
    }
    case 'inquiry_answers': {
      const item = currentCase(inquiry);
      const question = currentQuestion(inquiry);
      const parent = inquiry.pairs.find(pair => pair.id === item.parent_pair_id);
      context.case = { id: item.id, parent_pair_id: item.parent_pair_id, perspective: item.perspective };
      context.question_id = question.id;
      context.primary_question = question.question;
      context.source_pairs = question.source_pair_ids.map(id => inquiry.pairs.find(pair => pair.id === id));
      context.ancestry = ancestry(inquiry, parent);
      value.properties.question_id.const = question.id;
      break;
    }
    case 'inquiry_synthesis': {
      context.inquiry = inquiry;
      const item = value.items;
      fixedList(value, inquiry.pairs.filter(pair => pair.depth === 0).map(pair => {
        const result = structuredClone(item);
        result.properties.root_pair_id.const = pair.id;
        pinSources(result.properties.pair_ids, inquiry.pairs, pair.id);
        return result;
      }));
      break;
    }
  }
  return { keyword, instruction: definition.instruction, final_schema: schema, context };
}

function makeHandler(keyword) {
  return async (_error, _index, read, input, projection) => {
    if (input === undefined) return project(keyword, read);
    let { valid, errors } = validateReturnSchema(input, projection.final_schema);
    if (valid && keyword === 'inquiry_perspectives') {
      const fixed = read('inquiry').config.perspectives.map(p => p.name.toLowerCase());
      for (const item of input[keyword]) {
        const names = [...fixed, ...item.additional.map(p => p.name.trim().toLowerCase())];
        if (new Set(names).size !== names.length) {
          valid = false;
          errors = { duplicate_perspective_for: item.pair_id };
          break;
        }
      }
    }
    return { valid, input: valid ? input : null, error: valid ? null : {
      error: true, errortype: `${keyword}.input_error`, diagnostic_data: errors
    } };
  };
}

export const inquiryHandlers = Object.fromEntries(Object.keys(inquiryDefinitions).map(key => [key, makeHandler(key)]));

function startInquiry(record) {
  const inquiry = record.inputs.inquiry;
  inquiry.pairs = record.inputs.question_answers.map((answer, i) => ({
    id: `r0.p${i + 1}`, depth: 0, parent_pair_id: null,
    question_id: answer.question_id, question: answer.question,
    answer: answer.answer, unresolved: answer.unresolved
  }));
}

function freezeCases(record) {
  const inquiry = record.inputs.inquiry;
  const nominations = structuredClone(record.inputs.inquiry_perspectives);
  const cases = [];
  for (const item of nominations) {
    const perspectives = [
      ...inquiry.config.perspectives,
      ...item.additional.map((domain, i) => ({ id: `${item.pair_id}.domain${i + 1}`, ...domain }))
    ];
    for (const perspective of perspectives) {
      cases.push({ id: `r${inquiry.depth}.c${cases.length + 1}`, parent_pair_id: item.pair_id, perspective, questions: [] });
    }
  }
  inquiry.rounds.push({ depth: inquiry.depth, nominations, cases });
  inquiry.caseIndex = 0;
  inquiry.questionIndex = 0;
}

function saveQuestions(record) {
  const inquiry = record.inputs.inquiry;
  const item = currentCase(inquiry);
  item.questions = record.inputs.inquiry_questions.questions.map((question, i) => ({
    id: `${item.id}.q${i + 1}`, ...structuredClone(question)
  }));
  inquiry.questionIndex = 0;
}

function answerRoute(_value, record) {
  const inquiry = record.inputs.inquiry;
  if (inquiry.questionIndex + 1 < currentCase(inquiry).questions.length) return 'answer';
  if (inquiry.caseIndex + 1 < currentRound(inquiry).cases.length) return 'question';
  return inquiry.depth < inquiry.config.max_depth ? 'round' : 'synthesis';
}

function saveAnswer(record) {
  const inquiry = record.inputs.inquiry;
  const item = currentCase(inquiry);
  const question = currentQuestion(inquiry);
  const pair = {
    id: question.id, depth: inquiry.depth, parent_pair_id: item.parent_pair_id,
    case_id: item.id, perspective: structuredClone(item.perspective),
    ...structuredClone(question), ...structuredClone(record.inputs.inquiry_answers)
  };
  inquiry.pairs.push(pair);
  question.answer_pair_id = pair.id;
}

export const answerTransition = {
  selectRoute: (_value, record) => record.inputs.inquiry ? 'inquiry' : 'legacy',
  routes: {
    legacy: { next: 'desired_state' },
    inquiry: { next: 'inquiry_perspectives', apply: startInquiry }
  }
};

export const inquiryTransitions = {
  inquiry_perspectives: { routes: { default: { next: 'inquiry_questions', apply: freezeCases } } },
  inquiry_questions: { routes: { default: { next: 'inquiry_answers', apply: saveQuestions } } },
  inquiry_answers: {
    selectRoute: answerRoute,
    routes: {
      answer: { next: 'inquiry_answers', apply(record) { saveAnswer(record); record.inputs.inquiry.questionIndex += 1; } },
      question: { next: 'inquiry_questions', apply(record) { saveAnswer(record); record.inputs.inquiry.caseIndex += 1; } },
      round: { next: 'inquiry_perspectives', apply(record) { saveAnswer(record); record.inputs.inquiry.depth += 1; } },
      synthesis: { next: 'inquiry_synthesis', apply: saveAnswer }
    }
  },
  inquiry_synthesis: 'desired_state'
};

// Saved legacy projections remain authoritative. Only new inquiry records use
// the configured root count. Completed rounds remain in the accepted inputs.
export function includeInquiry(projection, inputs) {
  const inquiry = inputs.inquiry;
  if (!inquiry) return;
  if (projection.keyword === 'clarifying_questions') {
    projection.instruction = inquiry.config.root_instruction;
    projection.context.question_count = inquiry.config.root_question_count;
    const schema = projection.final_schema.properties.clarifying_questions;
    schema.minItems = inquiry.config.root_question_count;
    schema.maxItems = inquiry.config.root_question_count;
    schema.description = inquiry.config.root_instruction;
    for (const key of ['id', 'question']) {
      Object.assign(schema.items.properties[key], { minLength: 1, pattern: '\\S' });
    }
  }
  if (projection.keyword === 'question_answers') {
    for (const item of projection.final_schema.properties.question_answers.prefixItems) {
      Object.assign(item.properties.answer, { minLength: 1, pattern: '\\S' });
    }
  }
  if (inputs.inquiry_synthesis) {
    projection.context.inquiry = structuredClone(inquiry);
    projection.context.inquiry_synthesis = structuredClone(inputs.inquiry_synthesis);
  }
}
