const aliases = new Map();
const validName = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function registerAlias(name, handler) {
  if (typeof name !== 'string' || !validName.test(name) || typeof handler !== 'function') {
    throw new TypeError('Alias registration requires a valid name and a function');
  }
  if (aliases.has(name)) throw new Error('Alias already registered: ' + name);
  aliases.set(name, handler);
}

export async function dispatchAliasReceipt(whatPrompt, registry = aliases, onProcedureTransition) {
  const receipt = {
    inputThis: '@:' + whatPrompt,
    outputThat: [],
    stderr: '',
    exitCode: 0,
    signal: null,
    timedOut: false,
    overflow: false
  };
  try {
    const match = /^([A-Za-z][A-Za-z0-9_-]*)(?:\s+([\s\S]+))?$/.exec(whatPrompt.trim());
    if (!match) throw new Error('Expected an alias name followed by a JSON object');
    const handler = registry.get(match[1]);
    if (!handler) throw new Error('Unknown alias: ' + match[1]);
    if (!match[2] && match[1] !== 'Procedure') throw new Error('Missing JSON arguments for alias: ' + match[1]);
    let args;
    const revised = match[1] === 'Procedure' && /^-r(?:\s|$)/.test(match[2] ?? '');
    try {
      args = revised ? parseRevisedProcedure(match[2]) : match[2] ? JSON.parse(match[2]) : {};
    } catch (error) {
      if (revised) throw error;
      throw new Error('Invalid JSON arguments for alias: ' + match[1]);
    }
    if (args === null || typeof args !== 'object' || Array.isArray(args)) {
      throw new Error('Alias arguments must be one JSON object');
    }
    const result = revised
      ? await handler(args, { revised: true, onTransition: onProcedureTransition })
      : match[1] === 'Procedure' && onProcedureTransition
        ? await handler(args, { onTransition: onProcedureTransition })
        : await handler(args);
    receipt.outputThat = [JSON.stringify(result ?? null)];
  } catch (error) {
    receipt.exitCode = 1;
    receipt.error = error.message;
    receipt.stderr = error.message;
  }
  return receipt;
}

function parseRevisedProcedure(suffix) {
  const rest = suffix.slice(2).trim();
  if (!rest) return {};
  const [, nonce, input] = /^(\S+)(?:\s+([\s\S]+))?$/.exec(rest);
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(nonce)) {
    throw new Error('Expected Procedure -r <nonce> [<JSON input object>]');
  }
  if (input === undefined) return { nonce };
  let value;
  try { value = JSON.parse(input); }
  catch { throw new Error('Invalid JSON input for Procedure -r'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Procedure -r input must be one JSON object');
  }
  return { nonce, input: value };
}
