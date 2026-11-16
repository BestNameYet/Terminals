import { renderState } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "user_intent"

export default async function captureUserIntent(e, _index, read, render, undefined, record) {
  const verbatim_request = read("verbatim_request")
  if (verbatim_request === undefined) {
    throw new ReferenceError("verbatim_request")
  }
  const record = e[_index] ?? (e[_index] = {})
  const previousError = e.error
  e.error = null
  const { input } = await renderState(keyword, { verbatim_request }, previousError, render, undefined, record)
  const { valid, errors } = validateReturnSchema(input, record.issuedSchema)
  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { ...record, valid, input: valid ? input : null, error: e.error }
}
