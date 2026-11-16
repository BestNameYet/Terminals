import { buildProjection } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"
const keyword = "post_execution_diagnostic"
export default function capturePostExecutionDiagnostic(e, _index, read, agentInput, projection) {
  const simulation_results = read("simulation_results")
  const execution_results = read("execution_results")
  if (!simulation_results || !execution_results) throw new ReferenceError("simulation_results or execution_results")
  const prior = simulation_results.checklist
  function deriveSchema(schema) {
    const checklist = schema.properties[keyword].properties.checklist
    checklist.minItems = prior.length
    checklist.maxItems = prior.length
    const item = checklist.items
    checklist.prefixItems = prior.map(entry => ({
      ...structuredClone(item),
      properties: {
        ...structuredClone(item.properties),
        condition_id: { ...item.properties.condition_id, const: entry.condition_id },
        expected: { ...item.properties.expected, const: entry.expected },
        simulated: { ...item.properties.simulated, const: entry.simulated },
        passed: { ...item.properties.passed, const: entry.passed }
      }
    }))
    checklist.items = false
    return schema
  }
  if (agentInput === undefined) return buildProjection(keyword, { simulation_results, execution_results }, e.error, deriveSchema)
  const shape = validateReturnSchema(agentInput, projection.final_schema)
  const errors = shape.valid ? [] : shape.errors
  if (shape.valid) {
    const checklist = agentInput[keyword].checklist
    const hasFailure = checklist.some(x => x.status === "fail")
    const hasUnknown = checklist.some(x => x.status === "unverified")
    const expected = hasFailure ? "fail" : hasUnknown ? "incomplete" : "pass"
    if (agentInput[keyword].overall_result !== expected) errors.push({ expected_overall_result: expected })
    checklist.forEach((item, index) => {
      if (item.status === "pass" && item.discrepancy !== "") errors.push({ index, inconsistent_pass_discrepancy: true })
      if (item.status === "fail" && !item.discrepancy.trim()) errors.push({ index, missing_failure_discrepancy: true })
    })
  }
  const valid = shape.valid && errors.length === 0
  e.error = valid ? null : { error: true, errortype: keyword + ".input_error", diagnostic_data: errors }
  return { valid, input: valid ? agentInput : null, error: e.error }
}
