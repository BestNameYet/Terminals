import Ajv2020 from "ajv/dist/2020.js"

const ajv = new Ajv2020({ allErrors: true, ownProperties: true })
const compiledSchemas = new WeakMap()

export function validateReturnSchema(input, schema) {
  const cacheable = schema !== null && typeof schema === "object"
  let check = compiledSchemas.get(schema)
  if (!check) {
    check = ajv.compile(schema)
    if (cacheable) {
      // Keep derived schemas cached only for as long as the caller retains them.
      ajv.removeSchema(schema)
      compiledSchemas.set(schema, check)
    }
  }
  const valid = check(input)
  return { valid, errors: structuredClone(check.errors ?? []) }
}
