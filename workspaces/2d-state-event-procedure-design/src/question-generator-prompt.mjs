function nonblank(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(label + " must be a nonblank string");
}

function rowQuestionCount(config, row) {
  const override = (config.questionCountByPerspective ?? []).find(item => item.perspective_id === row.id);
  const count = override?.count ?? row.questionsPerParent ?? config.questionsPerPerspective ?? config.questionsPerParentPerRow;
  if (!Number.isSafeInteger(count) || count < 1) throw new TypeError("A positive question count is required for generator row " + row.id);
  return count;
}

function formatPrompt(item) {
  const labels = item.labels?.length ? " [" + item.labels.join(", ") + "]" : "";
  return "  - " + item.id + labels + " (" + item.kind + "): " + item.text;
}

export function buildQuestionGeneratorPrompt(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError("Question generator config must be an object");
  }
  nonblank(config.taskInstruction, "taskInstruction");
  nonblank(config.questionStyle, "questionStyle");
  nonblank(config.returnRule, "returnRule");

  const rows = config.generatorRows ?? [];
  if (!Array.isArray(rows)) throw new TypeError("generatorRows must be an array");

  let countInstruction;
  let rowCounts = "";
  if (config.questionCount !== undefined) {
    if (!Number.isSafeInteger(config.questionCount) || config.questionCount < 1) {
      throw new TypeError("questionCount must be a positive integer");
    }
    countInstruction = "Generate exactly " + config.questionCount + " question(s), one for each labeled slot.";
  } else {
    const counts = rows.map(row => row.id + ": " + rowQuestionCount(config, row) + " question(s) per parent");
    rowCounts = counts.join("; ");
    countInstruction = "Generate the configured number of questions for each active row" +
      (rowCounts ? " (" + rowCounts + ")." : ".");
  }

  const rowInstructions = rows.map(row => {
    nonblank(row.id, "generator row id");
    nonblank(row.instruction, "generator row instruction");
    const rowLabels = row.labels?.length ? " [" + row.labels.join(", ") + "]" : "";
    const prompts = (row.selectedQuestionPrompts ?? []).map(formatPrompt).join("\n");
    const parentSelections = (row.parentSelections ?? []).map(selection => {
      const promptText = (selection.selectedQuestionPrompts ?? [])
        .map(item => item.id + " [" + (item.labels ?? []).join(", ") + "]: " + item.text)
        .join("; ");
      return "  - parent " + selection.parent_qa_id + ": " + promptText;
    }).join("\n");
    return "- " + row.id + rowLabels + ": " + row.instruction +
      (prompts ? "\n" + prompts : "") +
      (parentSelections ? "\n" + parentSelections : "");
  }).join("\n");

  return [
    config.taskInstruction,
    config.perspectiveCount === undefined
      ? null
      : "Use exactly " + config.perspectiveCount + " active perspective row(s) for each applicable parent.",
    countInstruction,
    "Question style: " + config.questionStyle + ".",
    rowInstructions ? "Active generator instructions:\n" + rowInstructions : null,
    config.questionPoolRule ? "Question-pool rule: " + config.questionPoolRule + "." : null,
    config.lineageRule ? "Lineage rule: " + config.lineageRule + "." : null,
    "Return rule: " + config.returnRule
  ].filter(Boolean).join("\n\n");
}
