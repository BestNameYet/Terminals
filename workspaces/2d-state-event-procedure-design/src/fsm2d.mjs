import { scratchpadDiagnostic } from "./scratchpad.mjs"

export const COMPLETE = "COMPLETE"

function replayStored() {
  return { kind: "REPLAY" }
}

function replayCompletion() {
  return { kind: "REPLAY_COMPLETE" }
}

function returnCell(validate, routes, selectRoute = () => "default") {
  return Object.freeze({
    routes,
    async handle({ record, read }, event) {
      const { keyword, projection } = record.state
      const result = await validate({ error: null }, 0, read, event.input, projection)
      if (!result.valid) return { kind: "REJECT", diagnostic: result.error }
      const value = result.input[keyword]
      return { kind: "ACCEPT", value, route: selectRoute(value) }
    }
  })
}

export function compileTable(handlers, transitions) {
  const table = Object.create(null)
  const keywords = Object.keys(handlers)
  if (keywords.length !== Object.keys(transitions).length || Object.hasOwn(handlers, COMPLETE)) {
    throw new Error("Procedure table and validators must define the same nonterminal states")
  }
  for (const keyword of keywords) {
    const transition = transitions[keyword]
    if (!transition || typeof handlers[keyword] !== "function") {
      throw new Error(`Missing handler or transition for ${keyword}`)
    }
    const { routes, selectRoute } = typeof transition === "string"
      ? { routes: { default: { next: transition } } }
      : transition
    const compiledRoutes = Object.fromEntries(Object.entries(routes).map(([name, route]) => {
      if (route.next !== COMPLETE && !Object.hasOwn(handlers, route.next)) {
        throw new Error(`Unknown successor ${route.next} for ${keyword}`)
      }
      if (route.apply !== undefined && typeof route.apply !== "function") {
        throw new Error(`Invalid transition effect for ${keyword}.${name}`)
      }
      return [name, Object.freeze({ ...route })]
    }))
    if (!Object.keys(compiledRoutes).length ||
        (selectRoute === undefined && !Object.hasOwn(compiledRoutes, "default")) ||
        (selectRoute !== undefined && typeof selectRoute !== "function")) {
      throw new Error(`Invalid route declaration for ${keyword}`)
    }
    table[keyword] = Object.freeze({
      E_RETURN: returnCell(handlers[keyword], Object.freeze(compiledRoutes), selectRoute),
      E_REPLAY: Object.freeze({ handle: replayStored })
    })
  }
  const terminal = Object.freeze({ handle: replayCompletion })
  table[COMPLETE] = Object.freeze({ E_RETURN: terminal, E_REPLAY: terminal })
  return Object.freeze(table)
}

// Observers are outside the transition contract. Even an asynchronous failure
// must not change the result of a committed event.
export function notify(onTransition, event) {
  try {
    const pending = onTransition?.(event)
    if (pending !== undefined) Promise.resolve(pending).catch(() => {})
  } catch {
    // A monitor cannot invalidate a committed or replayed event.
  }
}

export function createDispatcher({ table, buildState, renderCompletion, withDiagnostic }) {
  return async function dispatch(agentInput, nonce, { load, save, render, onTransition }) {
    const saved = await load(nonce)
    if (!saved?.state?.projection || !saved.inputs) throw new ReferenceError("nonce")
    const before = saved.state.keyword
    const state = saved.completed ? COMPLETE : before
    const event = agentInput === undefined
      ? { type: "E_REPLAY" }
      : { type: "E_RETURN", input: agentInput }
    const cell = table[state]?.[event.type]
    if (!cell) throw new Error(`Undefined procedure cell: ${state}.${event.type}`)

    const record = event.type === "E_RETURN" && !saved.completed ? structuredClone(saved) : saved
    const read = key => record.inputs[key]
    let decision = await cell.handle({ record, read }, event)
    if (decision.kind === "ACCEPT") {
      const diagnostic = scratchpadDiagnostic(record)
      if (diagnostic) decision = { kind: "REJECT", diagnostic }
    }
    switch (decision.kind) {
      case "REPLAY":
        notify(onTransition, { nonce, outcome: "replayed", before, after: before })
        return render(record.state.projection, record)
      case "REPLAY_COMPLETE":
        notify(onTransition, { nonce, outcome: "completion_replay", before })
        return record.completionReceipt ?? renderCompletion(nonce, record.inputs)
      case "REJECT":
        record.state.projection = withDiagnostic(before, record.state.projection, decision.diagnostic)
        await save(nonce, record)
        notify(onTransition, { nonce, outcome: "retry", before, after: before })
        return render(record.state.projection, record)
      case "ACCEPT": {
        if (!cell.routes || !Object.hasOwn(cell.routes, decision.route)) {
          throw new Error(`Undeclared route for ${before}: ${decision.route}`)
        }
        const { next, apply } = cell.routes[decision.route]
        record.inputs[before] = decision.value
        apply?.(record)
        if (next === COMPLETE) {
          record.completed = true
          record.completionReceipt = renderCompletion(nonce, record.inputs)
          await save(nonce, record)
          notify(onTransition, { nonce, outcome: "completed", before })
          return record.completionReceipt
        }
        record.state = await buildState(next, record.inputs, record.repair)
        if (record.scratchpad) record.scratchpad.revision += 1
        await save(nonce, record)
        notify(onTransition, { nonce, outcome: "advanced", before, after: next })
        return render(record.state.projection, record)
      }
      default:
        throw new Error(`Invalid procedure decision: ${decision.kind}`)
    }
  }
}
