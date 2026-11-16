import { renderState } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "execution_procedure"

export default async function captureExecutionProcedure(e, _index, read, render, undefined, record) {
  const context = {
    required_changes: read("required_changes"),
    agent_actions: read("agent_actions"),
    change_action_mapping: read("change_action_mapping")
  }
  const missing = Object.keys(context).find(key => context[key] === undefined)
  if (missing !== undefined) {
    throw new ReferenceError(missing)
  }

  const changeIds = context.required_changes.map(change => change.id)
  const actionIds = context.agent_actions.map(action => action.id)
  const associations = new Map(context.change_action_mapping.mappings.map(
    mapping => [mapping.change_id, new Set(mapping.action_ids)]
  ))

  function deriveSchema(schema) {
    const step = schema.properties[keyword].properties.steps.items
    step.properties.change_ids.items = changeIds.length
      ? { ...step.properties.change_ids.items, enum: changeIds }
      : false
    step.properties.action_ids.items = actionIds.length
      ? { ...step.properties.action_ids.items, enum: actionIds }
      : false
    return schema
  }

  const record = e[_index] ?? (e[_index] = {})
  const previousError = e.error
  e.error = null
  const { input } = await renderState(
    keyword, context, previousError, render, deriveSchema, record)
  let { valid, errors } = validateReturnSchema(input, record.issuedSchema)

  if (valid) {
    const seenSteps = new Set()
    const coveredPairs = new Set()
    const expectedPairs = new Set()
    for (const [changeId, associatedActions] of associations) {
      for (const actionId of associatedActions) {
        expectedPairs.add(JSON.stringify([changeId, actionId]))
      }
    }

    for (const step of input[keyword].steps) {
      if (seenSteps.has(step.id)) {
        errors = { duplicate_step_id: step.id }
        valid = false
        break
      }
      seenSteps.add(step.id)
      if (new Set(step.change_ids).size !== step.change_ids.length ||
          new Set(step.action_ids).size !== step.action_ids.length) {
        errors = { duplicate_references_in_step: step.id }
        valid = false
        break
      }
      if (step.change_ids.length === 0 || step.action_ids.length === 0) {
        errors = { missing_change_or_action_reference: step.id }
        valid = false
        break
      }
      for (const changeId of step.change_ids) {
        for (const actionId of step.action_ids) {
          const pair = JSON.stringify([changeId, actionId])
          if (!associations.get(changeId)?.has(actionId)) {
            errors = { unmapped_action_change_pair: { step_id: step.id, change_id: changeId, action_id: actionId } }
            valid = false
            break
          }
          coveredPairs.add(pair)
        }
        if (!valid) break
      }
      if (!valid) break
    }
    if (valid) {
      const uncovered = [...expectedPairs].filter(pair => !coveredPairs.has(pair))
      if (uncovered.length) {
        valid = false
        errors = { uncovered_mapped_pairs: uncovered.map(pair => JSON.parse(pair)) }
      }
    }
  }

  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { ...record, valid, input: valid ? input : null, error: e.error }
}
