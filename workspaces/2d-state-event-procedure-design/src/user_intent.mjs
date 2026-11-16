async function captureUserIntent(e, i, read) {
  const keyword = "user_intent"
  const schema = await returnSchema(keyword)

  const state = {
    instruction: await instruction(keyword),
    return_schema: schema,
    context: { verbatim_request: read("verbatim_request") }
  }

  const previousError = e[i]?.error
  if (previousError) {
    state.error_message = previousError
  }

  const input = await render(state)
  return validate(input, schema)
}
