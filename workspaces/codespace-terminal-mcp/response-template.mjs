import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const templateURL = new URL('./response-template.json', import.meta.url);
const templateSchema = 'terminals.mcp.tool-response-template.v1';

async function getTemplate() {
  const template = JSON.parse(await readFile(templateURL, 'utf8'));
  if (template.schema !== templateSchema || !Array.isArray(template.content) || !template.content.length) {
    throw new Error('Invalid MCP response template');
  }
  const textBlocks = template.content.filter(block => block.type === 'text');
  if (textBlocks.length !== 1 || textBlocks[0].source !== 'tool_result_text') {
    throw new Error('MCP response template must contain one tool_result_text block');
  }
  const seen = new Set();
  for (const block of template.content) {
    if (block.type === 'text' && block.source === 'tool_result_text') continue;
    if (block.type !== 'resource' ||
        typeof block.uri !== 'string' || !block.uri ||
        typeof block.name !== 'string' || !block.name ||
        typeof block.mimeType !== 'string' || !block.mimeType ||
        typeof block.sourcePath !== 'string' || !block.sourcePath ||
        seen.has(block.uri)) {
      throw new Error('Invalid MCP embedded resource definition');
    }
    seen.add(block.uri);
  }
  return template.content;
}

function filePath(sourcePath) {
  const absolute = resolve(root, sourcePath);
  if (!absolute.startsWith(root.endsWith(sep) ? root : root + sep)) {
    throw new Error('Embedded resource path outside repository');
  }
  return absolute;
}

async function resourceContents(block) {
  const text = await readFile(filePath(block.sourcePath), 'utf8');
  return { uri: block.uri, mimeType: block.mimeType, text };
}

// Strip only the presentation wrapper; do not change block placement.
function stripResourceIdentifiers(resource) {
  return resource.text;
}

export async function renderResponseContent(text) {
  const blocks = await getTemplate();
  const envelope = JSON.parse(text);
  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) {
    throw new Error('MCP command result must be a JSON object');
  }
  const parts = [];
  for (const block of blocks) {
    if (block.type === 'resource') {
      parts.push(stripResourceIdentifiers(await resourceContents(block)));
    } else if (block.type === 'text' && block.source === 'tool_result_text') {
      parts.push(text);
    }
  }
  return [{ type: 'text', text: parts.join('\n') }];
}

export async function listResponseResources() {
  const blocks = await getTemplate();
  return blocks.filter(block => block.type === 'resource').map(block => ({
    uri: block.uri, name: block.name, mimeType: block.mimeType
  }));
}

export async function readResponseResource(uri) {
  const blocks = await getTemplate();
  const block = blocks.find(item => item.type === 'resource' && item.uri === uri);
  if (!block) throw new Error('Unknown resource');
  return resourceContents(block);
}
