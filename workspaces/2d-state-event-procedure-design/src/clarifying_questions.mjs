export const keyword = "clarifying_questions"

const source = new URL("../state-instructions-and-return-schemas.json", import.meta.url).href

export function buildState(e, read) {
  const verbatim_request = read("verbatim_request")
  const user_intent = read("user_intent")
  if (verbatim_request === undefined || user_intent === undefined) {
    throw new ReferenceError(verbatim_request === undefined ? "verbatim_request" : "user_intent")
  }

  const state = {
    keyword,
    mode: "normal",
    instruction: { source, keyword, field: "compact_instruction_projection" },
    return_schema: { source, keyword, field: "return_schema" },
    context: { verbatim_request, user_intent }
  }
  if (e.error?.error === true) {
    state.mode = "error"
    state.error_message = structuredClone(e.error)
    e.error = null
  }
  return state
}

function reject(e, diagnostic_data) {
  e.error = { error: true, errortype: `${keyword}.input_error`, diagnostic_data }
  return [e, false]
}

export async function validateReturn(e, input, issuedSchema, validate) {
  const result = await validate(input, issuedSchema)
  if (typeof result?.valid !== "boolean") {
    throw new TypeError("valid")
  }
  if (!result.valid) {
    return reject(e, result.errors)
  }

  const questions = input[keyword]
  const ids = new Set()
  for (const { id } of questions) {
    if (ids.has(id)) {
      return reject(e, { duplicate_id: id })
    }
    ids.add(id)
  }

  e[keyword] = questions
  return [e, true]
}
