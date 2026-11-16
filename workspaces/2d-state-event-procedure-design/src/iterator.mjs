export function initializeIterator(steps, returnSchemas, checkpoint = null) {
  const e = checkpoint
    ? checkpoint.main_array
    : Array(steps.length).fill(null)
  const keywordIndexes = checkpoint
    ? new Map(checkpoint.keyword_map)
    : new Map(returnSchemas.map((schema, index) => [
        Object.keys(schema)[0],
        index
      ]))
  const i = checkpoint ? checkpoint.step_index : 0

  if (!Array.isArray(e) || e.length !== steps.length) {
    throw new TypeError("main_array")
  }
  if (!Number.isInteger(i) || i < 0 || i > steps.length) {
    throw new RangeError("step_index")
  }
  if (keywordIndexes.size !== steps.length) {
    throw new TypeError("keyword_map")
  }
  for (let index = 0; index < steps.length; index += 1) {
    const keyword = Object.keys(returnSchemas[index])[0]
    if (keywordIndexes.get(keyword) !== index) {
      throw new TypeError("keyword_map")
    }
  }

  if (checkpoint && Object.hasOwn(checkpoint, "pending_error")) {
    e.error = checkpoint.pending_error
  }

  return { e, keywordIndexes, i }
}

export async function iterate(
  steps,
  returnSchemas,
  render,
  initialize = () => initializeIterator(steps, returnSchemas)
) {
  const { e, keywordIndexes, i: initialIndex } = initialize()

  function read(keyword) {
    const index = keywordIndexes.get(keyword)
    const record = e[index]

    if (record?.valid === true) {
      return record.input[keyword]
    }
  }

  let i = initialIndex
  while (i < steps.length) {
    const result = await steps[i](e, i, read, render)
    if (typeof result?.valid !== "boolean") {
      throw new TypeError("valid")
    }
    e[i] = result

    if (result.valid) {
      i += 1
    }
  }

  return e
}
