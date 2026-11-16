import { buildProjection } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "clarifying_questions"

export default async function captureClarifyingQuestions(e, _index, read, agentInput, projection) {
  const verbatim_request = read("verbatim_request")
  const user_intent = read("user_intent")
  if (verbatim_request === undefined || user_intent === undefined) {
    throw new ReferenceError(verbatim_request === undefined ? "verbatim_request" : "user_intent")
  }
  if (agentInput === undefined) {
    return buildProjection(keyword, { verbatim_request, user_intent, current_state: read("current_state") }, e.error, undefined)
  }
  const input = agentInput
  let { valid, errors } = validateReturnSchema(input, projection.final_schema)
  if (valid) {
    const ids = input[keyword].map(question => question.id)
    const duplicateId = ids.find((id, position) => ids.indexOf(id) !== position)
    if (duplicateId !== undefined) {
      valid = false
      errors = { duplicate_id: duplicateId }
    }
  }
  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { valid, input: valid ? input : null, error: e.error }
}
