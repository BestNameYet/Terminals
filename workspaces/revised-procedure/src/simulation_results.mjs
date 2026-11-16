import { buildProjection } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "simulation_results"

export default async function captureSimulationResults(e, _index, read, agentInput, projection) {
  const context = {
    execution_procedure: read("execution_procedure"),
    desired_state: read("desired_state")
  }
  const missing = Object.keys(context).find(key => context[key] === undefined)
  if (missing !== undefined) {
    throw new ReferenceError(missing)
  }

  const stepIds = context.execution_procedure.steps.map(step => step.id)
  const conditionIds = context.desired_state.conditions.map(condition => condition.id)

  // Prerequisite identifier uniqueness is an upstream invariant, not an input error.
  if (new Set(stepIds).size !== stepIds.length) {
    throw new Error("execution_procedure contains duplicate step identifiers")
  }
  if (new Set(conditionIds).size !== conditionIds.length) {
    throw new Error("desired_state contains duplicate condition identifiers")
  }

  function deriveSchema(schema) {
    const properties = schema.properties[keyword].properties
    const steps = properties.steps
    steps.minItems = stepIds.length
    steps.maxItems = stepIds.length
    steps.items.properties.step_id = {
      ...steps.items.properties.step_id,
      ...(stepIds.length ? { enum: stepIds } : {})
    }
    if (stepIds.length === 0) {
      steps.items = false
    }

    const checklist = properties.checklist
    checklist.minItems = conditionIds.length
    checklist.maxItems = conditionIds.length
    checklist.items.properties.condition_id = {
      ...checklist.items.properties.condition_id,
      ...(conditionIds.length ? { enum: conditionIds } : {})
    }
    if (conditionIds.length === 0) {
      checklist.items = false
    }
    return schema
  }

  if (agentInput === undefined) {
    return buildProjection(keyword, context, e.error, deriveSchema)
  }
  const input = agentInput
  const shape = validateReturnSchema(input, projection.final_schema)
  const errors = shape.valid
    ? checkSimulation(input[keyword], stepIds, conditionIds)
    : shape.errors
  const valid = shape.valid && errors.length === 0

  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { valid, input: valid ? input : null, error: e.error }
}

function checkSimulation(simulation, stepIds, conditionIds) {
  const errors = []

  // The simulation decorates the existing procedure and conditions in place.
  // Reject replacements, repeated identifiers, and reordered entries.
  for (let i = 0; i < stepIds.length; i += 1) {
    if (simulation.steps[i].step_id !== stepIds[i]) {
      errors.push({
        step_index: i,
        expected_step_id: stepIds[i],
        received_step_id: simulation.steps[i].step_id
      })
    }
  }
  for (let i = 0; i < conditionIds.length; i += 1) {
    const item = simulation.checklist[i]
    if (item.condition_id !== conditionIds[i]) {
      errors.push({
        checklist_index: i,
        expected_condition_id: conditionIds[i],
        received_condition_id: item.condition_id
      })
    }
    if (item.passed && item.discrepancy !== "") {
      errors.push({ condition_id: item.condition_id, inconsistent_discrepancy: "passed condition has a discrepancy" })
    }
    if (!item.passed && item.discrepancy.trim() === "") {
      errors.push({ condition_id: item.condition_id, missing_discrepancy: "failed condition requires a predicted difference" })
    }
  }

  const allConditionsPass = simulation.checklist.every(item => item.passed)
  if (simulation.matches_desired_state !== allConditionsPass) {
    errors.push({
      inconsistent_matches_desired_state: {
        expected: allConditionsPass,
        received: simulation.matches_desired_state
      }
    })
  }
  return errors
}
