import { renderState } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "required_changes"

export default async function captureRequiredChanges(e, _index, read, exchange) {
  const context = {
    desired_state: read("desired_state"),
    current_state: read("current_state")
  }
  const missing = Object.keys(context).find(key => context[key] === undefined)
  if (missing !== undefined) {
    throw new ReferenceError(missing)
  }

  function deriveSchema(schema) {
    const conditionIds = context.desired_state.conditions.map(condition => condition.id)
    const references = schema.properties[keyword].items.properties.condition_ids
    references.items = conditionIds.length > 0
      ? { ...references.items, enum: conditionIds }
      : false
    return schema
  }

  const previousError = e.error
  e.error = null
  const { input, issuedSchema } = await renderState(keyword, context, previousError, exchange, deriveSchema)
  let { valid, errors } = validateReturnSchema(input, issuedSchema)
  if (valid) {
    const ids = new Set()
    for (const { id } of input[keyword]) {
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
