import { readFileSync } from "node:fs"

const { states } = JSON.parse(readFileSync(
  new URL("../state-instructions-and-return-schemas.json", import.meta.url), "utf8"
))

function bindStep(definition, { render, validate, deriveSchema }) {
  const { keyword, read_keywords, schema_derivation } = definition

  async function buildState(read, previousError) {
    const context = Object.fromEntries(read_keywords.map(key => {
      const value = read(key)
      if (value === undefined) {
        throw new ReferenceError(key)
      }
      return [key, structuredClone(value)]
    }))
    let schema = structuredClone(definition.return_schema)
    if (deriveSchema && schema_derivation.mode === "context_derived_constraints_on_base_schema") {
      schema = await deriveSchema(schema, context, structuredClone(schema_derivation))
    }

    const state = {
      instruction: definition.compact_instruction_projection,
      return_schema: schema
    }
    if (read_keywords.length) {
      state.context = context
    }
    if (previousError) {
      state.error_message = structuredClone(previousError)
    }
    return state
  }

  return async function step(e, i, read) {
    const state = await buildState(read, e[i]?.error)
    const input = await render(state)
    return validate(input, state.return_schema, {
      keyword,
      context: state.context ?? {},
      schemaDerivation: structuredClone(schema_derivation)
    })
  }
}

export function createProcedureStep(keyword, services) {
  const definition = states.find(state => state.keyword === keyword)
  if (!definition) {
    throw new RangeError(keyword)
  }
  return bindStep(definition, services)
}

export function createProcedureSteps(services) {
  return {
    steps: states.map(state => bindStep(state, services)),
    returnSchemas: states.map(({ keyword, return_schema }) => ({
      [keyword]: structuredClone(return_schema)
    }))
  }
}
