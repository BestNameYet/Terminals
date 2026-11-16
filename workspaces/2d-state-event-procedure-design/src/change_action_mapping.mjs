import { renderState } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "change_action_mapping"

export default async function captureChangeActionMapping(e, _index, read, render, undefined, record) {
  const context = {
    desired_state: read("desired_state"),
    current_state: read("current_state"),
    required_changes: read("required_changes"),
    agent_actions: read("agent_actions")
  }
  const missing = Object.keys(context).find(key => context[key] === undefined)
  if (missing !== undefined) {
    throw new ReferenceError(missing)
  }

  const changeIds = context.required_changes.map(change => change.id)
  const actionIds = context.agent_actions.map(action => action.id)
  const expectedActionsByChange = new Map(changeIds.map(id => [id, new Set()]))
  const unmatchedActionIds = []

  for (const { id, change_ids } of context.agent_actions) {
    const knownChanges = change_ids.filter(changeId => expectedActionsByChange.has(changeId))
    if (knownChanges.length === 0) {
      unmatchedActionIds.push(id)
    }
    for (const changeId of knownChanges) {
      expectedActionsByChange.get(changeId).add(id)
    }
  }

  const uncoveredChangeIds = changeIds.filter(id => expectedActionsByChange.get(id).size === 0)

  function deriveSchema(schema) {
    const { mappings, gaps } = schema.properties[keyword].properties
    const properties = mappings.items.properties
    mappings.minItems = changeIds.length
    mappings.maxItems = changeIds.length
    if (changeIds.length > 0) {
      properties.change_id.enum = changeIds
    }
    properties.action_ids.uniqueItems = true
    properties.action_ids.items = actionIds.length > 0
      ? { ...properties.action_ids.items, enum: actionIds }
      : false
    if (uncoveredChangeIds.length > 0 || unmatchedActionIds.length > 0) {
      gaps.minItems = 1
    }
    return schema
  }

  const record = e[_index] ?? (e[_index] = {})
  const previousError = e.error
  e.error = null
  const { input } = await renderState(keyword, context, previousError, render, deriveSchema, record)
  const shape = validateReturnSchema(input, record.issuedSchema)
  const errors = shape.valid
    ? checkMappings(input[keyword].mappings, expectedActionsByChange)
    : shape.errors
  const valid = shape.valid && errors.length === 0

  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { ...record, valid, input: valid ? input : null, error: e.error }
}

function checkMappings(mappings, expectedActionsByChange) {
  const errors = []
  const mappedChanges = new Set()
  for (const { change_id, action_ids } of mappings) {
    if (mappedChanges.has(change_id)) {
      errors.push({ duplicate_change_id: change_id })
      continue
    }
    mappedChanges.add(change_id)

    const expected = expectedActionsByChange.get(change_id)
    const submitted = new Set(action_ids)
    const missing = [...expected].filter(id => !submitted.has(id))
    const unrelated = action_ids.filter(id => !expected.has(id))
    if (missing.length > 0 || unrelated.length > 0) {
      errors.push({ change_id, missing_action_ids: missing, unrelated_action_ids: unrelated })
    }
  }

  const missingChangeIds = [...expectedActionsByChange.keys()].filter(id => !mappedChanges.has(id))
  if (missingChangeIds.length > 0) {
    errors.push({ missing_change_ids: missingChangeIds })
  }
  return errors
}
