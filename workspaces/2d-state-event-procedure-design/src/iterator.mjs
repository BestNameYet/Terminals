export async function iterate(steps, returnSchemas, exchange) {
  const e = Array(steps.length).fill(null)
  const keywordIndexes = new Map()

  for (let i = 0; i < steps.length; i += 1) {
    const keyword = Object.keys(returnSchemas[i])[0]
    keywordIndexes.set(keyword, i)
  }

  function read(keyword) {
    const index = keywordIndexes.get(keyword)
    const record = e[index]

    if (record?.valid === true) {
      return record.input[keyword]
    }
  }

  let i = 0
  while (i < steps.length) {
    const result = await steps[i](e, i, read, exchange)
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
