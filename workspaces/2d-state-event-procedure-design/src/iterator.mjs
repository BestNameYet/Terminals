import { COMPLETE, compileTable, createDispatcher, notify } from "./fsm2d.mjs"
import handler0 from "./verbatim_request.mjs"
import handler1 from "./user_intent.mjs"
import handler2 from "./clarifying_questions.mjs"
import handler3 from "./question_answers.mjs"
import handler4 from "./desired_state.mjs"
import handler5 from "./current_state.mjs"
import handler6 from "./required_changes.mjs"
import handler7 from "./agent_actions.mjs"
import handler8 from "./change_action_mapping.mjs"
import handler9 from "./execution_procedure.mjs"
import handler10 from "./simulation_results.mjs"
import handler11 from "./execution_results.mjs"
import handler12 from "./post_execution_diagnostic.mjs"
import { getDefinition, renderCompletion, withDiagnostic } from "./render_state.mjs"

const handlers = {
  "verbatim_request": handler0,
  "user_intent": handler1,
  "clarifying_questions": handler2,
  "question_answers": handler3,
  "desired_state": handler4,
  "current_state": handler5,
  "required_changes": handler6,
  "agent_actions": handler7,
  "change_action_mapping": handler8,
  "execution_procedure": handler9,
  "simulation_results": handler10,
  "execution_results": handler11,
  "post_execution_diagnostic": handler12
}

export async function buildState(keyword, inputs) {
  const definition = getDefinition(keyword)
  const read = key => inputs[key]
  for (const key of definition.read_keywords) {
    if (read(key) === undefined) throw new ReferenceError(key)
  }
  const projection = await handlers[keyword]({ error: null }, 0, read, undefined)
  if (!projection || !projection.final_schema) throw new TypeError("projection")
  return { keyword, next: definition.next, projection }
}

export async function create(nonce, { save, render, onTransition }, keyword = "verbatim_request") {
  const record = { state: await buildState(keyword, {}), inputs: {} }
  await save(nonce, record)
  notify(onTransition, { nonce, outcome: "started", after: keyword })
  return render(record.state.projection)
}


const transitions = {
  verbatim_request: "user_intent",
  user_intent: "clarifying_questions",
  clarifying_questions: "question_answers",
  question_answers: "desired_state",
  desired_state: "current_state",
  current_state: "required_changes",
  required_changes: "agent_actions",
  agent_actions: "change_action_mapping",
  change_action_mapping: "execution_procedure",
  execution_procedure: "simulation_results",
  simulation_results: "execution_results",
  execution_results: "post_execution_diagnostic",
  post_execution_diagnostic: COMPLETE
}

export const table = compileTable(handlers, transitions)
for (const keyword of Object.keys(handlers)) {
  const next = getDefinition(keyword).next ?? COMPLETE
  if (!Object.values(table[keyword].E_RETURN.routes).some(route => route.next === next)) {
    throw new Error(`Projection binding disagrees with the procedure table for ${keyword}`)
  }
}

export const f = createDispatcher({ table, buildState, renderCompletion, withDiagnostic })
