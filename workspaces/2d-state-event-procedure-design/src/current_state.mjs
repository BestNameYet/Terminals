import { renderState } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "current_state"

export default async function captureCurrentState(e, _index, read, exchange) {
  const desired_state = read("desired_state")
  if (desired_state === undefined) {
    throw new ReferenceError("desired_state")
  }

  const previousError = e.error
  e.error = null
  const { input, issuedSchema } = await renderState(keyword, { desired_state }, previousError, exchange)
  let { valid, errors } = validateReturnSchema(input, issuedSchema)
  if (valid) {
    const ids = new Set()
    for (const { id } of input[keyword].observations) {
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
