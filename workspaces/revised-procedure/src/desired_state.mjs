import { buildProjection } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "desired_state"

export default async function captureDesiredState(e, _index, read, agentInput, projection) {
  const context = {
    verbatim_request: read("verbatim_request"),
    user_intent: read("user_intent"),
    current_state: read("current_state"),
    question_answers: read("question_answers")
  }
  const missing = Object.keys(context).find(key => context[key] === undefined)
  if (missing !== undefined) {
    throw new ReferenceError(missing)
  }

  if (agentInput === undefined) {
    return buildProjection(keyword, context, e.error, undefined)
  }
  const input = agentInput
  let { valid, errors } = validateReturnSchema(input, projection.final_schema)
  if (valid) {
    const ids = new Set()
    for (const { id } of input[keyword].conditions) {
      if (ids.has(id)) {
        valid = false
        errors = { duplicate_id: id }
        break
      }
      ids.add(id)
    }
  }
  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { valid, input: valid ? input : null, error: e.error }
}
