import { buildProjection } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"
const keyword = "execution_results"
export default function captureExecutionResults(e, _index, read, agentInput, projection) {
  const execution_procedure = read("execution_procedure")
  const simulation_results = read("simulation_results")
  if (!execution_procedure || !simulation_results) throw new ReferenceError("execution_procedure or simulation_results")
  const stepIds = execution_procedure.steps.map(step => step.id)
  function deriveSchema(schema) {
    const steps = schema.properties[keyword].properties.steps
    steps.minItems = stepIds.length
    steps.maxItems = stepIds.length
    steps.items = stepIds.length ? { ...steps.items, properties: {
      ...steps.items.properties, step_id: { ...steps.items.properties.step_id, enum: stepIds }
    }} : false
    return schema
  }
  if (agentInput === undefined) return buildProjection(keyword, { execution_procedure, simulation_results }, e.error, deriveSchema)
  const shape = validateReturnSchema(agentInput, projection.final_schema)
  const errors = shape.valid ? [] : shape.errors
  if (shape.valid) agentInput[keyword].steps.forEach((step, index) => {
    if (step.step_id !== stepIds[index]) errors.push({ index, expected_step_id: stepIds[index] })
  })
  const valid = shape.valid && errors.length === 0
  e.error = valid ? null : { error: true, errortype: keyword + ".input_error", diagnostic_data: errors }
  return { valid, input: valid ? agentInput : null, error: e.error }
}
