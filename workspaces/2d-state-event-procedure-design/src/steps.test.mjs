import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { iterate } from "./iterator.mjs"

const { states } = JSON.parse(readFileSync(
  new URL("../state-instructions-and-return-schemas.json", import.meta.url), "utf8"
))

test("the iterator runs every configured step in order and retries with its diagnostic", async () => {
  const { createProcedureSteps } = await import("./steps.mjs")
  const accepted = new Map()
  const rendered = []
  let retried = false
  const { steps, returnSchemas } = createProcedureSteps({
    render(state) {
      rendered.push(state)
      return state
    },
    validate(input, schema, { keyword, context }) {
      const definition = states[accepted.size]
      assert.equal(keyword, definition.keyword)
      assert.equal(input.instruction, definition.compact_instruction_projection)
      assert.deepEqual(schema, definition.return_schema)
      assert.strictEqual(input.return_schema, schema)
      assert.deepEqual(context, Object.fromEntries(
        definition.read_keywords.map(key => [key, accepted.get(key)])
      ))
      assert.deepEqual(input.context ?? {}, context)

      if (keyword === "user_intent" && !retried) {
        retried = true
        assert.equal(input.error_message, undefined)
        return { valid: false, error: { errortype: "retry" } }
      }
      assert.deepEqual(input.error_message,
        keyword === "user_intent" ? { errortype: "retry" } : undefined)
      const value = { keyword }
      accepted.set(keyword, value)
      return { valid: true, input: { [keyword]: value } }
    }
  })

  assert.deepEqual(returnSchemas, states.map(({ keyword, return_schema }) => ({
    [keyword]: return_schema
  })))
  const records = await iterate(steps, returnSchemas)
  assert.equal(records.length, 13)
  assert.equal(rendered.length, 14)
  assert.deepEqual(records.map(record => Object.keys(record.input)[0]),
    states.map(state => state.keyword))
})

test("a derived schema uses prior accepted values and is shared with validation", async () => {
  const { createProcedureSteps } = await import("./steps.mjs")
  const definition = states.find(state => state.keyword === "question_answers")
  const questions = [{ id: "Q7", question: "What changed?" }]
  const diagnostic = { errortype: "incorrect_id" }
  const record = { valid: true, input: { question_answers: [] } }

  const { steps } = createProcedureSteps({
    deriveSchema(schema, context, derivation) {
      assert.deepEqual(context, { clarifying_questions: questions })
      assert.deepEqual(derivation, definition.schema_derivation)
      const answers = schema.properties.question_answers
      answers.minItems = context.clarifying_questions.length
      answers.items.properties.question_id.enum = context.clarifying_questions.map(q => q.id)
      return schema
    },
    render(state) {
      assert.deepEqual(state.error_message, diagnostic)
      return state
    },
    validate(state, schema, { keyword, context }) {
      assert.equal(keyword, definition.keyword)
      assert.deepEqual(context.clarifying_questions, questions)
      assert.strictEqual(state.return_schema, schema)
      assert.equal(schema.properties.question_answers.minItems, 1)
      assert.deepEqual(schema.properties.question_answers.items.properties.question_id.enum, ["Q7"])
      return record
    }
  })

  const index = states.indexOf(definition)
  const history = []
  history[index] = { valid: false, error: diagnostic }
  assert.strictEqual(await steps[index](history, index, key => {
    assert.equal(key, "clarifying_questions")
    return questions
  }), record)
})

test("a missing configured prior input fails before rendering", async () => {
  const { createProcedureStep } = await import("./steps.mjs")
  const step = createProcedureStep("user_intent", {
    render() {
      assert.fail("render called without accepted prior input")
    },
    validate() {
      assert.fail("validate called without accepted prior input")
    }
  })

  await assert.rejects(step([], 1, () => undefined), {
    name: "ReferenceError",
    message: "verbatim_request"
  })
})
