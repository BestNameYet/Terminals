export function scratchpadFor(record) {
  return record.scratchpad ?? { mode: "optional", revision: 1, entries: [] }
}

export function scratchpadSummary(record) {
  const { mode, revision, entries } = scratchpadFor(record)
  return { mode, revision, entryCount: entries.length, recentEntries: entries.slice(-3) }
}

export function scratchpadDiagnostic(record) {
  const { mode, revision, entries } = scratchpadFor(record)
  if (mode === "mandatory" && entries.at(-1)?.revision !== revision) {
    return {
      error: true,
      errortype: "scratchpad.note_required",
      diagnostic_data: { revision, message: "Append a scratchpad note for this projection before advancing." }
    }
  }
}

export function appendNote(record, note) {
  if (record.completed) throw new Error("Completed procedure scratchpads are read-only")
  const scratchpad = record.scratchpad ??= scratchpadFor(record)
  const entry = {
    sequence: scratchpad.entries.length + 1,
    timestamp: new Date().toISOString(),
    keyword: record.state.keyword,
    revision: scratchpad.revision,
    note
  }
  scratchpad.entries.push(entry)
  return entry
}
