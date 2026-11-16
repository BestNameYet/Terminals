import { buildProjection } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "verbatim_request"

export default async function captureVerbatimRequest(e, _index, _read, agentInput, projection) {
  if (agentInput === undefined) {
    return buildProjection(keyword, {}, e.error, undefined)
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
