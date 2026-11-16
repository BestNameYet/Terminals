import { renderState } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "agent_actions"

export default async function captureAgentActions(e, _index, read, render, undefined, record) {
  const required_changes = read("required_changes")
  if (required_changes === undefined) {
    throw new ReferenceError("required_changes")
  }

  const changeIds = required_changes.map(change => change.id)

  function deriveSchema(schema) {
    const actions = schema.properties[keyword]
    const references = actions.items.properties.change_ids
    references.minItems = 1
    references.uniqueItems = true
    references.items = changeIds.length > 0 ? { ...references.items, enum: changeIds } : false
    return schema
  }

  const record = e[_index] ?? (e[_index] = {})
  const previousError = e.error
  e.error = null
  const { input } = await renderState(
    keyword, { required_changes }, previousError, render, deriveSchema, record)
  const shape = validateReturnSchema(input, record.issuedSchema)
  const errors = shape.valid ? checkActions(input[keyword], changeIds) : shape.errors
  const valid = shape.valid && errors.length === 0

  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { ...record, valid, input: valid ? input : null, error: e.error }
}

function checkActions(actions, changeIds) {
  const errors = []
  const actionIds = new Set()
  const coveredChangeIds = new Set()

  for (const { id, change_ids } of actions) {
    if (actionIds.has(id)) {
      errors.push({ duplicate_id: id })
    }
    actionIds.add(id)
    for (const changeId of change_ids) {
      coveredChangeIds.add(changeId)
    }
  }

  const uncoveredChangeIds = changeIds.filter(id => !coveredChangeIds.has(id))
  if (uncoveredChangeIds.length > 0) {
    errors.push({ uncovered_change_ids: uncoveredChangeIds })
  }
  return errors
}
