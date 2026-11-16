import { readFileSync } from "node:fs"

const { states } = JSON.parse(readFileSync(
  new URL("../state-instructions-and-return-schemas.json", import.meta.url), "utf8"
))
const definitions = new Map(states.map(state => [state.keyword, state]))

export async function renderState(keyword, context, previousError, render, deriveSchema, record) {
  const definition = definitions.get(keyword)
  if (!definition) {
    throw new ReferenceError(keyword)
  }
  if (!record || typeof record !== "object") {
    throw new TypeError("step_record")
  }
  record.keyword = keyword
  record.read_keywords = definition.read_keywords ?? []
  record.issuedSchema ??= deriveSchema
    ? deriveSchema(structuredClone(definition.return_schema))
    : definition.return_schema
  const diagnostic = {}
  if (previousError?.error === true) {
    diagnostic.error_message = structuredClone(previousError)
    const message = definition.diagnostics?.[previousError.errortype]
    if (message !== undefined) {
      diagnostic.error_message.message = message
    }
  }
  const input = await render({
    ...diagnostic,
    keyword,
    instruction: definition.compact_instruction_projection,
    return_schema: record.issuedSchema,
    context: structuredClone(context)
  })
  return { input }
}
