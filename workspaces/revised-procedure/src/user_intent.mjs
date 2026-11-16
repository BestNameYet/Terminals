import { buildProjection } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "user_intent"

export default async function captureUserIntent(e, _index, read, agentInput, projection) {
  const verbatim_request = read("verbatim_request")
  if (verbatim_request === undefined) {
    throw new ReferenceError("verbatim_request")
  }
  if (agentInput === undefined) {
    return buildProjection(keyword, { verbatim_request }, e.error, undefined)
  }
  const input = agentInput
  const { valid, errors } = validateReturnSchema(input, projection.final_schema)
  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { valid, input: valid ? input : null, error: e.error }
}
