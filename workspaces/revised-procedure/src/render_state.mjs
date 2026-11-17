import { inquiryDefinitions } from "../../2d-state-event-procedure-design/src/inquiry.mjs"
import { readFileSync } from "node:fs"

const { states, completion_message } = JSON.parse(readFileSync(
  new URL("../state-instructions-and-return-schemas.json", import.meta.url), "utf8"
))
const definitions = Object.fromEntries(states.map(s => [s.keyword, s]))
const bindings = JSON.parse(readFileSync(
  new URL("../projection-bindings.json", import.meta.url), "utf8"
))

export function getDefinition(keyword) {
  if (inquiryDefinitions[keyword]) return inquiryDefinitions[keyword]
  const definition = definitions[keyword]
  if (!definition) throw new ReferenceError(keyword)
  const binding = bindings[keyword]
  if (!binding) throw new ReferenceError(`binding: ${keyword}`)
  return { ...definition, next: binding.next, process: binding.process, derive_schema: binding.derive_schema }
}

export function renderCompletion(nonce, inputs) {
  return { completed: true, message: completion_message, nonce, inputs }
}

export function withDiagnostic(keyword, projection, error) {
  const next = structuredClone(projection)
  const diagnostic = structuredClone(error)
  const message = getDefinition(keyword).diagnostics?.[error.errortype]
  if (message !== undefined) diagnostic.message = message
  next.error_message = diagnostic
  return next
}

export function buildProjection(keyword, context, previousError, deriveSchema) {
  const definition = getDefinition(keyword)
  const final_schema = deriveSchema
    ? deriveSchema(structuredClone(definition.return_schema))
    : structuredClone(definition.return_schema)
  const projection = {
    keyword,
    instruction: definition.compact_instruction_projection,
    final_schema,
    context: structuredClone(context)
  }
  return previousError?.error === true
    ? withDiagnostic(keyword, projection, previousError)
    : projection
}
