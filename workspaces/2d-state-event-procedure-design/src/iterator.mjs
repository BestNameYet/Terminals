export function createProcedureIterator({ states, handlers, render, resume } = {}) {
  if (!Array.isArray(states) || !Array.isArray(handlers) ||
      states.length !== handlers.length ||
      Array.from(states).some((state) => typeof state !== 'function') ||
      Array.from(handlers).some((handler) => typeof handler !== 'function')) {
    throw new TypeError('Each state needs a state function and an E_Return handler.');
  }
  if (typeof render !== 'function') {
    throw new TypeError('A state renderer is required.');
  }

  // The handler array is column 0 of the former dispatch table.
  const stateFunctions = [...states];
  const returnHandlers = [...handlers];
  const initial = resume === undefined ? { i: 0, e: {} } : resume;
  if (!initial || !Number.isInteger(initial.i) || initial.i < 0 ||
      initial.i > stateFunctions.length || !isContext(initial.e)) {
    throw new TypeError('Resume requires a valid zero-based index and context.');
  }

  let position = structuredClone(initial);
  let awaitingReturn = false;

  function next(e = position.e, i = position.i) {
    const context = structuredClone(e);
    const done = i === stateFunctions.length;
    const result = done ? { done } : { done, output: render(stateFunctions[i](context)) };
    position = { ...position, i, e: context };
    awaitingReturn = !done;
    return result;
  }

  function E_Return(e) {
    const { i } = position;
    if (i === stateFunctions.length) {
      throw new Error('The procedure is complete.');
    }
    if (!awaitingReturn) {
      throw new Error('Render the current state before submitting E_Return.');
    }
    if (!isContext(e)) {
      throw new TypeError('E_Return requires the complete context object.');
    }

    const result = returnHandlers[i](structuredClone(e));
    if (!Array.isArray(result) || result.length !== 2 ||
        !isContext(result[0]) || typeof result[1] !== 'boolean') {
      throw new TypeError('The handler must return [context, Boolean].');
    }

    const [updated, valid] = result;
    if (!valid && updated.error?.error !== true) {
      throw new TypeError('A rejected return requires a pending validation diagnostic.');
    }
    // A rejected submission cannot replace the previously accepted context.
    const context = valid ? updated : { ...position.e, error: updated.error };
    return next(context, i + Number(valid));
  }

  return {
    next: () => next(),
    E_Return,
    snapshot: () => structuredClone(position),
  };
}

function isContext(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
