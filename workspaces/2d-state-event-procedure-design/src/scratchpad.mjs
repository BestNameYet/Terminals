import { readFileSync } from "node:fs"
import { validateReturnSchema } from "./validate_return_schema.mjs"

const schema = JSON.parse(readFileSync(new URL("../scratchpad-return-schema.json", import.meta.url), "utf8"))

/** Return the schema result, including all Ajv errors, for an append payload. */
export function validateScratchpadNote(input) {
  return validateReturnSchema(input, schema)
}

/**
 * Existing incomplete nonce records with historical "optional" mode are
 * automatically subject to the mandatory gate; completed records remain
 * readable without rewriting their historical mode or entries.
 */
export function scratchpadFor(record) {
  const scratchpad = record.scratchpad ?? { mode: "mandatory", revision: 1, entries: [] }
  if (!record.completed) scratchpad.mode = "mandatory"
  return scratchpad
}

export function scratchpadSummary(record) {
  const { mode, revision, entries } = scratchpadFor(record)
  return { mode, revision, entryCount: entries.length, recentEntries: entries.slice(-3) }
}

function diagnostic(errortype, revision, keyword, message, extra = {}) {
  return { error: true, errortype, diagnostic_data: { revision, keyword, message, ...extra } }
}

/**
 * Every accepted E_RETURN must have a fully validated, current-projection,
 * nonce-scoped and ready note. This is a second validation barrier: a
 * malformed persisted record or a legacy freeform note cannot bypass the
 * append-time JSON Schema validator.
 */
export function scratchpadDiagnostic(record) {
  if (record.completed) return
  const { revision, entries } = scratchpadFor(record)
  const keyword = record.state?.keyword
  const entry = entries.at(-1)
  if (!entry || entry.revision !== revision) {
    return diagnostic("scratchpad.note_required", revision, keyword,
      "Append a valid structured scratchpad note for this projection revision before advancing.")
  }
  if (entry.keyword !== keyword) {
    return diagnostic("scratchpad.note_state_mismatch", revision, keyword,
      "The latest note is associated with a different procedure state; append a note for the active state.",
      { note_keyword: entry.keyword })
  }
  const validation = validateScratchpadNote({ note: entry.note })
  if (!validation.valid) {
    return diagnostic("scratchpad.note_invalid", revision, keyword,
      "The current persisted note does not satisfy the structured scratchpad schema.",
      { errors: validation.errors })
  }
  if (entry.note.readiness !== "ready") {
    return diagnostic("scratchpad.note_blocked", revision, keyword,
      "The latest note declares this projection blocked. Resolve it and append a new ready note before advancing.",
      { unresolved: entry.note.unresolved })
  }
}

/** Server, not caller, owns sequence, timestamp, keyword and revision. */
export function appendNote(record, note) {
  if (record.completed) throw new Error("Completed procedure scratchpads are read-only")
  const validation = validateScratchpadNote({ note })
  if (!validation.valid) {
    const errors = validation.errors.map(x => (x.instancePath || "/") + " " + x.message).join("; ")
    throw new TypeError("Invalid scratchpad note: " + errors)
  }
  const scratchpad = record.scratchpad ??= scratchpadFor(record)
  scratchpad.mode = "mandatory"
  const entry = {
    sequence: scratchpad.entries.length + 1,
    timestamp: new Date().toISOString(),
    keyword: record.state.keyword,
    revision: scratchpad.revision,
    note: structuredClone(note)
  }
  scratchpad.entries.push(entry)
  return entry
}
