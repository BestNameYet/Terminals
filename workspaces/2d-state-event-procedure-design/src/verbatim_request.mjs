import { renderState } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "verbatim_request"

export default async function captureVerbatimRequest(e, _index, _read, exchange) {
  const previousError = e.error
  e.error = null
  const { input, issuedSchema } = await renderState(keyword, {}, previousError, exchange)
  const { valid, errors } = validateReturnSchema(input, issuedSchema)
  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { valid, input: valid ? input : null, error: e.error }
}
