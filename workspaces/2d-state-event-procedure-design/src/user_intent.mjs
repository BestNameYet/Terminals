import { createProcedureStep } from "./steps.mjs"

export function captureUserIntent(services) {
  return createProcedureStep("user_intent", services)
}
