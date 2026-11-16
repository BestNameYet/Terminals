export async function iterate(steps, returnSchemas) {
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
    e[i] = await steps[i](e, i, read)

    if (e[i].valid) {
      i += 1
    }
  }

  return e
}
