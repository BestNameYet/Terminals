# Programs — Selection Element Specification

**Status:** Working draft; not an approved implementation contract.  
**Specification version:** 0.1.0  
**Created:** 2026-11-04T03:54:52-08:00  
**Scope:** The reusable, agent-facing selection interaction element for the Programs subsystem.

## Purpose

The `selection` element is a reusable JSON interaction template. It presents a set of explicitly identified alternatives and communicates the operation that an agent must perform to select one. This specification defines the latest agreed template shape. It does **not** prescribe program-specific choices or the mechanism by which choices will be populated.

Programs uses Node.js on GitHub Actions, and bot-authored GitHub Issue comments carry its JSON interactions. Program execution is outside the interaction state.

## Template

The following is the generic selection template, not an instantiated program menu:

```json
{
  "comment": {
    "version": "0.1.0",
    "createdAt": "2026-11-04T03:54:52-08:00"
  },
  "selection": {
    "menu": {
      "shortTitle": "shortTitle",
      "title": "title",
      "options": [
        {"id": 0, "option": "option"},
        {"id": 1, "option": "option"}
      ]
    },
    "instruction": {
      "SELECT": {
        "by": "id",
        "use": "single-select",
        "as": "id",
        "where": [
          "menu.options"
        ]
      },
      "RETURN": "options[id].id"
    }
  }
}
```

The root `comment` object is metadata and is not part of the `selection` element. The values `shortTitle`, `title`, and `option` in the example are literal metatemplate placeholders (the same spelling as their keys), not final menu content. The number of `options` is not fixed by the example.

## Structural contract

| Field | Meaning |
| --- | --- |
| `comment.version` | Version of the published template artifact. |
| `comment.createdAt` | Creation date and time of that artifact, in an ISO 8601 representation. |
| `selection.menu.shortTitle` | Short menu title to be provided when the template is instantiated. |
| `selection.menu.title` | Menu title to be provided when instantiated. |
| `selection.menu.options` | Ordered array of selectable option objects. |
| `selection.menu.options[].id` | Explicit integer selection identifier. |
| `selection.menu.options[].option` | Descriptive text for the selectable alternative. |
| `selection.instruction.SELECT` | Structured selection operation, not explanatory prose. |
| `selection.instruction.SELECT.by` | Property by which an option is selected; currently `id`. |
| `selection.instruction.SELECT.use` | Selection mode; currently `single-select`. |
| `selection.instruction.SELECT.as` | Local binding name for the selection; currently `id`. |
| `selection.instruction.SELECT.where` | Array of expressions specifying the selection collection; currently `menu.options`. |
| `selection.instruction.RETURN` | Expression evaluated for the return value; currently `options[id].id`. |

## Semantics and invariants

1. The menu belongs to a `selection` element. The `instruction` follows the `menu`.
2. Every option has an explicitly labeled integer `id`. The current convention is zero-based, consecutive IDs aligned with the array indexes; menu meaning is determined by the actual option objects.
3. `SELECT` operates on the options specified by `where`, using the property specified by `by`. The `as` binding is local to the instruction.
4. `RETURN: "options[id].id"` retrieves the `id` member value from the selected option under the current index-aligned convention. The expression is a Programs instruction expression, not JSON syntax; JSON itself defines neither property access nor evaluation.
5. Menu options describe alternatives; they do not embed individual response commands.
6. The menu's concrete labels, option set, and selection-state mapping belong to each interaction occurrence. The generic template must not be overwritten with example-specific menu data.
7. A selection interaction is one input-requiring step in a narrow, stateful program. Program state is maintained outside GitHub Actions runs and is distinct from the external Node.js program effect.

## Open decisions — not yet specified

- Exact agent response serialization (an object, array, primitive, or multiple permitted representations) is not settled.
- Source and timing of option population have deliberately been deferred.
- A standard for `where` expression evaluation and resolution scope has not yet been ratified.
- The numeric identifier/index equivalence is the *current template convention*, not a general law of JSON; any future nonconsecutive identifiers require corresponding changes to lookup semantics.
- No additional interaction-element types are defined by this document.

## Scope of this specification

This document defines the current **selection** template only. It does not implement the interaction controller, workflow trigger, JavaScript executor, state-persistence mechanism, or a complete Programs SRS.
