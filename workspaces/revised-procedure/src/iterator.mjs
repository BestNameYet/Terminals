import handler0 from "./verbatim_request.mjs"
import handler1 from "./user_intent.mjs"
import handler2 from "./clarifying_questions.mjs"
import handler3 from "./question_answers.mjs"
import handler4 from "./desired_state.mjs"
import handler5 from "./current_state.mjs"
import handler6 from "./required_changes.mjs"
import handler7 from "./agent_actions.mjs"
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
  "execution_procedure": handler9,
  "simulation_results": handler10,
  "execution_results": handler11,
  "post_execution_diagnostic": handler12
}

export async function buildState(keyword, inputs, repair) {
  const definition = getDefinition(keyword)
  const read = key => key === "repair" ? repair : inputs[key]
  for (const key of definition.read_keywords) {
    if (read(key) === undefined) throw new ReferenceError(key)
  }
  const projection = await handlers[keyword]({ error: null }, 0, read, undefined)
  if (!projection || !projection.final_schema) throw new TypeError("projection")
  const intent = inputs.user_intent
  if (intent) {
    projection.context = { user_intent: intent, ...projection.context }
  }
  return { keyword, next: definition.next, projection }
}

export async function create(nonce, { save, render, onTransition }, keyword = "verbatim_request") {
  const record = { state: await buildState(keyword, {}), inputs: {} }
  await save(nonce, record)
  onTransition?.({ nonce, outcome: "started", after: keyword })
  return render(record.state.projection)
}

export async function f(agentInput, nonce, { load, save, render, onTransition }) {
  const record = await load(nonce)
  if (!record?.state?.projection || !record.inputs) throw new ReferenceError("nonce")
  const { state } = record
  if (record.completed) {
    onTransition?.({ nonce, outcome: "completion_replay", before: state.keyword })
    return record.completionReceipt ?? renderCompletion(nonce, record.inputs)
  }
  if (agentInput === undefined) {
    onTransition?.({ nonce, outcome: "replayed", before: state.keyword, after: state.keyword })
    return render(state.projection)
  }
  const read = key => record.inputs[key]
  const result = await handlers[state.keyword]({ error: null }, 0, read, agentInput, state.projection)
  if (!result.valid) {
    state.projection = withDiagnostic(state.keyword, state.projection, result.error)
    await save(nonce, record)
    onTransition?.({ nonce, outcome: "retry", before: state.keyword, after: state.keyword })
    return render(state.projection)
  }
  record.inputs[state.keyword] = result.input[state.keyword]
  if (state.next === null) {
    record.completed = true
    record.completionReceipt = renderCompletion(nonce, record.inputs)
    await save(nonce, record)
    onTransition?.({ nonce, outcome: "completed", before: state.keyword })
    return record.completionReceipt
  }
  let next = state.next
  if (state.keyword === "clarifying_questions" && record.inputs.clarifying_questions.length === 0) {
    record.inputs.question_answers = []
    next = "desired_state"
  }
  if (state.keyword === "simulation_results") {
    const simulation = record.inputs.simulation_results
    const failedSteps = simulation.steps.filter(step => !step.passed)
    const failedConditions = simulation.checklist.filter(condition => !condition.passed)
    if (failedSteps.length || failedConditions.length || simulation.revisions.length) {
      record.planAttempts ??= []
      record.planAttempts.push({
        execution_procedure: record.inputs.execution_procedure,
        simulation_results: simulation
      })
      record.repair = { failedSteps, failedConditions, revisions: simulation.revisions }
      next = "execution_procedure"
    } else {
      delete record.repair
    }
  }
  record.state = await buildState(next, record.inputs, record.repair)
  await save(nonce, record)
  onTransition?.({ nonce, outcome: "advanced", before: state.keyword, after: next })
  return render(record.state.projection)
}
