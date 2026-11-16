import { readFileSync } from "node:fs"

const { states } = JSON.parse(readFileSync(
  new URL("../state-instructions-and-return-schemas.json", import.meta.url), "utf8"
))
const definitions = new Map(states.map(state => [state.keyword, state]))

export async function renderState(keyword, context, previousError, exchange, deriveSchema) {
  const definition = definitions.get(keyword)
  if (!definition) {
    throw new ReferenceError(keyword)
  }
  const issuedSchema = deriveSchema
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
  const input = await exchange({
    ...diagnostic,
    keyword,
    instruction: definition.compact_instruction_projection,
    return_schema: structuredClone(issuedSchema),
    context: structuredClone(context)
  })
  return { input, issuedSchema }
}
