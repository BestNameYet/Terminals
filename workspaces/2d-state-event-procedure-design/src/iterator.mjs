// Each step owns e[i] and can read the pending diagnostic with e.at(-1).
export function createProcedureIterator({ steps, resume } = {}) {
  if (!Array.isArray(steps) || [...steps].some((step) => typeof step !== 'function')) {
    throw new TypeError('Steps must be an array of functions.');
  }

  const stepFunctions = [...steps];
  const diagnosticIndex = stepFunctions.length;
  let position = structuredClone(resume ?? { i: 0, e: Array(diagnosticIndex + 1).fill(null) });
  if (!Number.isInteger(position.i) || position.i < 0 || position.i > diagnosticIndex ||
      !Array.isArray(position.e) || position.e.length !== diagnosticIndex + 1) {
    throw new TypeError('Resume requires a valid index and context array.');
  }

  let running = false;

  async function run() {
    if (running) {
      throw new Error('The procedure is already running.');
    }

    running = true;
    try {
      while (position.i < diagnosticIndex) {
        const { i, e } = position;
        const result = await stepFunctions[i](structuredClone(e));
        if (typeof result?.valid !== 'boolean' ||
            !Array.isArray(result.e) || result.e.length !== e.length) {
          throw new TypeError('A step must return { valid, e } with a Boolean and a context array.');
        }

        const { valid, e: updated } = result;
        if (!valid && (updated[diagnosticIndex]?.error !== true ||
            typeof updated[diagnosticIndex].errortype !== 'string' ||
            !updated[diagnosticIndex].errortype.trim())) {
          throw new TypeError('A rejected reply requires a typed diagnostic in the last slot.');
        }

        // Only the active reply slot and the diagnostic slot can change in a step.
        if (valid) {
          e[i] = structuredClone(updated[i]);
        }
        e[diagnosticIndex] = valid ? null : structuredClone(updated[diagnosticIndex]);
        position = { ...position, i: i + Number(valid) };
      }
      return structuredClone(position.e);
    } finally {
      running = false;
    }
  }

  return { run, snapshot: () => structuredClone(position) };
}
