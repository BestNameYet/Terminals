async function captureVerbatimRequest(e, i) {
  const keyword = "verbatim_request"
  const schema = await returnSchema(keyword)

  const state = {
    instruction: await instruction(keyword),
    return_schema: schema
  }

  const previousError = e[i]?.error
  if (previousError) {
    state.error_message = previousError
  }

  const input = await render(state)
  return validate(input, schema)
}
