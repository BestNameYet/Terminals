import { createProcedureStep } from "./steps.mjs"

export function captureVerbatimRequest(services) {
  return createProcedureStep("verbatim_request", services)
}
