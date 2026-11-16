export function initializeIterator(steps, returnSchemas, checkpoint) {
  if (!checkpoint || typeof checkpoint !== "object") {
    throw new TypeError("checkpoint")
  }

  const e = checkpoint.main_array
  const keywordIndexes = new Map(checkpoint.keyword_map)
  const i = checkpoint.step_index
  const stateObject = checkpoint.state_object

  if (!Array.isArray(e) || e.length !== steps.length) {
    throw new TypeError("main_array")
  }
  if (!Number.isInteger(i) || i < 0 || i >= steps.length) {
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
  if (!stateObject || typeof stateObject !== "object" || Array.isArray(stateObject)) {
    throw new TypeError("state_object")
  }

  if (Object.hasOwn(checkpoint, "pending_error")) {
    e.error = checkpoint.pending_error
  }

  return { e, keywordIndexes, i, stateObject }
}

export async function iterate(steps, returnSchemas, render, initialize) {
  if (typeof initialize !== "function") {
    throw new TypeError("initialize")
  }

  const { stateObject } = initialize()
  return render(stateObject)
}
