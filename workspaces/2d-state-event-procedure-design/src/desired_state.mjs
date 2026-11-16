import { renderState } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "desired_state"

export default async function captureDesiredState(e, _index, read, render, undefined, record) {
  const context = {
    verbatim_request: read("verbatim_request"),
    user_intent: read("user_intent"),
    question_answers: read("question_answers")
  }
  const missing = Object.keys(context).find(key => context[key] === undefined)
  if (missing !== undefined) {
    throw new ReferenceError(missing)
  }

  const record = e[_index] ?? (e[_index] = {})
  const previousError = e.error
  e.error = null
  const { input } = await renderState(keyword, context, previousError, render, undefined, record)
  let { valid, errors } = validateReturnSchema(input, record.issuedSchema)
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
  return { ...record, valid, input: valid ? input : null, error: e.error }
}
