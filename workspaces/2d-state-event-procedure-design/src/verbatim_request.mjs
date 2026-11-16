import { renderState } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "verbatim_request"

export default async function captureVerbatimRequest(e, _index, _read, render, undefined, record) {
  const record = e[_index] ?? (e[_index] = {})
  const previousError = e.error
  e.error = null
  const { input } = await renderState(keyword, {}, previousError, render, undefined, record)
  const { valid, errors } = validateReturnSchema(input, record.issuedSchema)
  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { ...record, valid, input: valid ? input : null, error: e.error }
}
