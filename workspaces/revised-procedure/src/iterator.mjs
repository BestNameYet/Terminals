import { COMPLETE, compileTable, createDispatcher, notify } from "../../2d-state-event-procedure-design/src/fsm2d.mjs"
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

export async function create(nonce, { save, render, onTransition, scratchpadMode = "mandatory" }, keyword = "verbatim_request") {
  const record = { state: await buildState(keyword, {}), inputs: {}, scratchpad: { mode: scratchpadMode, revision: 1, entries: [] } }
  await save(nonce, record)
  notify(onTransition, { nonce, outcome: "started", after: keyword })
  return render(record.state.projection, record)
}


const transitions = {
  verbatim_request: "user_intent",
  user_intent: "current_state",
  current_state: "clarifying_questions",
  clarifying_questions: {
    selectRoute: questions => questions.length ? "answer" : "skip",
    routes: {
      answer: { next: "question_answers" },
      skip: {
        next: "desired_state",
        apply(record) {
          record.inputs.question_answers = []
        }
      }
    }
  },
  question_answers: "desired_state",
  desired_state: "required_changes",
  required_changes: "agent_actions",
  agent_actions: "execution_procedure",
  execution_procedure: "simulation_results",
  simulation_results: {
    selectRoute(simulation) {
      return simulation.steps.some(step => !step.passed) ||
        simulation.checklist.some(condition => !condition.passed) ||
        simulation.revisions.length > 0 ? "repair" : "execute"
    },
    routes: {
      repair: {
        next: "execution_procedure",
        apply(record) {
          const simulation = record.inputs.simulation_results
          record.planAttempts ??= []
          record.planAttempts.push({
            execution_procedure: record.inputs.execution_procedure,
            simulation_results: simulation
          })
          record.repair = {
            failedSteps: simulation.steps.filter(step => !step.passed),
            failedConditions: simulation.checklist.filter(condition => !condition.passed),
            revisions: simulation.revisions
          }
        }
      },
      execute: {
        next: "execution_results",
        apply(record) {
          delete record.repair
        }
      }
    }
  },
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
