const aliases = new Map();
const validName = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function registerAlias(name, handler) {
  if (typeof name !== 'string' || !validName.test(name) || typeof handler !== 'function') {
    throw new TypeError('Alias registration requires a valid name and a function');
  }
  if (aliases.has(name)) throw new Error('Alias already registered: ' + name);
  aliases.set(name, handler);
}

export async function dispatchAliasReceipt(whatPrompt, registry = aliases) {
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
    if (!match[2]) throw new Error('Missing JSON arguments for alias: ' + match[1]);
    let args;
    try { args = JSON.parse(match[2]); }
    catch { throw new Error('Invalid JSON arguments for alias: ' + match[1]); }
    if (args === null || typeof args !== 'object' || Array.isArray(args)) {
      throw new Error('Alias arguments must be one JSON object');
    }
    receipt.outputThat = [JSON.stringify(await handler(args) ?? null)];
  } catch (error) {
    receipt.exitCode = 1;
    receipt.error = error.message;
    receipt.stderr = error.message;
  }
  return receipt;
}
