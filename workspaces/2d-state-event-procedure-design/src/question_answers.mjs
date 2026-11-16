import { buildProjection } from "./render_state.mjs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const keyword = "question_answers"

export default async function captureQuestionAnswers(e, _index, read, agentInput, projection) {
  const clarifying_questions = read("clarifying_questions")
  if (!Array.isArray(clarifying_questions) || clarifying_questions.length === 0) {
    throw new ReferenceError("clarifying_questions")
  }

  function deriveSchema(schema) {
    const answers = schema.properties[keyword]
    const answer = answers.items
    answers.minItems = clarifying_questions.length
    answers.maxItems = clarifying_questions.length
    answers.prefixItems = clarifying_questions.map(({ id, question }) => ({
      ...answer,
      properties: {
        ...answer.properties,
        question_id: { ...answer.properties.question_id, const: id },
        question: { ...answer.properties.question, const: question }
      }
    }))
    answers.items = false
    return schema
  }

  if (agentInput === undefined) {
    return buildProjection(keyword, { clarifying_questions }, e.error, deriveSchema)
  }
  const input = agentInput
  const { valid, errors } = validateReturnSchema(input, projection.final_schema)
  e.error = valid ? null : {
    error: true,
    errortype: `${keyword}.input_error`,
    diagnostic_data: errors
  }
  return { valid, input: valid ? input : null, error: e.error }
}
