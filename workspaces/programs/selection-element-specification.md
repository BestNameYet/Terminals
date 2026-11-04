# Programs — Selection Element Specification

**Status:** Working draft; not an approved implementation contract.  
**Specification version:** 0.2.0  
**Version created:** 2026-11-04T10:24:33-08:00  
**Scope:** The reusable, agent-facing selection interaction element for the Programs subsystem.

## Purpose

The `selection` element is a reusable interaction source template that is compiled into a JSON interface. It presents a set of explicitly identified alternatives and communicates the operation that an agent must perform to select one. This specification defines the latest agreed template shape. It does **not** prescribe program-specific choices or the mechanism by which choices will be populated.

Programs uses Node.js on GitHub Actions, and bot-authored GitHub Issue comments carry its JSON interactions. Program execution is outside the interaction state.

## Template

The following is the generic selection **source** template, not an instantiated program menu. The source is intentionally not valid JSON until compiled and serialized.

```text
{
  "comment": {
    "version": "0.2.0",
    "createdAt": "2026-11-04T10:24:33-08:00",
    "spec": "https://github.com/BestNameYet/Terminals/blob/main/workspaces/programs/selection-element-specification.md"
  },
  "selection": {
    "shortTitle": <shortTitle>,
    "title": <title>,
    "options": [
      {
        "id": 0,
        "option": <option>
      },
      {
        "id": 1,
        "option": <option>
      }
    ],
    "instruction": {
      "SELECT": {
        "by": "id",
        "use": "single-select",
        "as": $id
      },
      "RETURN": $options[$id].id
    }
  }
}
```

The root `comment` object is metadata and is not part of the `selection` element. The unquoted `<shortTitle>`, `<title>` and `<option>` tokens are typed template placeholders, not string literals. Each occurrence must be resolved in its own template location. The number of `options` is not fixed by the example.

## Template language and compilation (v0.2.0)

| Source syntax | Meaning | Resolution stage |
| --- | --- | --- |
| `<name>` | Unquoted placeholder whose value is populated with a JSON-compatible value | Template instantiation |
| `$name` | Unquoted runtime variable, used for declaration/binding or reference | Runtime evaluation |
| `$options[$id].id` | Unquoted runtime expression with a variable array index and property access | Runtime evaluation |
| `"name"` | Quoted literal string, preserved as data | Neither; literal |
| `0`, `true`, `null` | Literal JSON scalar values | Neither; literal |

- The `.tmpl` file is a Programs source artifact and MUST NOT be passed directly to `JSON.parse`.
- Angle-bracket placeholders represent typed substitution sites. The template compiler must serialize supplied values safely; it must not concatenate untrusted text into executable source.
- Runtime expressions beginning with `# Programs — Selection Element Specification

**Status:** Working draft; not an approved implementation contract.  
**Specification version:** 0.2.0  
**Version created:** 2026-11-04T10:24:33-08:00  
**Scope:** The reusable, agent-facing selection interaction element for the Programs subsystem.

## Purpose

The `selection` element is a reusable interaction source template that is compiled into a JSON interface. It presents a set of explicitly identified alternatives and communicates the operation that an agent must perform to select one. This specification defines the latest agreed template shape. It does **not** prescribe program-specific choices or the mechanism by which choices will be populated.

Programs uses Node.js on GitHub Actions, and bot-authored GitHub Issue comments carry its JSON interactions. Program execution is outside the interaction state.

## Template

The following is the generic selection **source** template, not an instantiated program menu. The source is intentionally not valid JSON until compiled and serialized.

```text
{
  "comment": {
    "version": "0.2.0",
    "createdAt": "2026-11-04T10:24:33-08:00",
    "spec": "https://github.com/BestNameYet/Terminals/blob/main/workspaces/programs/selection-element-specification.md"
  },
  "selection": {
    "shortTitle": <shortTitle>,
    "title": <title>,
    "options": [
      {
        "id": 0,
        "option": <option>
      },
      {
        "id": 1,
        "option": <option>
      }
    ],
    "instruction": {
      "SELECT": {
        "by": "id",
        "use": "single-select",
        "as": $id
      },
      "RETURN": $options[$id].id
    }
  }
}
```

The root `comment` object is metadata and is not part of the `selection` element. The unquoted `<shortTitle>`, `<title>` and `<option>` tokens are typed template placeholders, not string literals. Each occurrence must be resolved in its own template location. The number of `options` is not fixed by the example.

 remain semantically distinct from literal strings. A compiler must encode them into a valid JSON interaction envelope before delivery; the exact encoded expression representation remains an open interface decision.
- `$id` denotes the same runtime variable in `SELECT.as` and the index of `RETURN`.
- `SELECT` defaults to `selection.options`; the `where` field is removed in this version.
- The template shown here specifies a source language; it is not a claim that a compiler has been implemented or tested.

## Version retention

- **Active source:** [`selection-template.tmpl`](selection-template.tmpl) and [`selection-element-specification.md`](selection-element-specification.md).
- **Superseded releases:** store both artifacts in `versions/vX.Y.Z/` with their original bytes and original file extensions.
- **v0.1.0 archive:** [template](versions/v0.1.0/selection-template.json) and [specification](versions/v0.1.0/selection-element-specification.md).
- Previous versions remain reachable through Git history as well.
- The v0.1.0 archive intentionally preserves the historical mismatch: its specification had been flattened to `selection.options`, while its standalone JSON source still included `selection.menu`. Neither file is silently rewritten to harmonize them.

## Structural contract

| Field | Meaning |
| --- | --- |
| `comment.version` | Version of the published template artifact. |
| `comment.createdAt` | Creation date and time of that artifact, in an ISO 8601 representation. |
| `comment.spec` | URL of the specification document defining this template. |
| `selection.shortTitle` | Short menu title to be provided when the template is instantiated. |
| `selection.title` | Menu title to be provided when instantiated. |
| `selection.options` | Ordered array of selectable option objects. |
| `selection.options[].id` | Explicit integer selection identifier. |
| `selection.options[].option` | Descriptive text for the selectable alternative. |
| `selection.instruction.SELECT` | Structured selection operation, not explanatory prose. |
| `selection.instruction.SELECT.by` | Property by which an option is selected; currently `id`. |
| `selection.instruction.SELECT.use` | Selection mode; currently `single-select`. |
| `selection.instruction.SELECT.as` | Runtime variable binding for the selection; currently `$id`. |
| `selection.instruction.RETURN` | Runtime expression evaluated for the return value; currently `$options[$id].id`. |

## Semantics and invariants

1. The `shortTitle`, `title`, and `options` fields belong directly to the `selection` element. The `instruction` follows these fields.
2. Every option has an explicitly labeled integer `id`. The current convention is zero-based, consecutive IDs aligned with the array indexes; menu meaning is determined by the actual option objects.
3. `SELECT` operates on the enclosing `selection.options` array by default, using the property specified by `by`; no `where` field is needed. The `as` variable `$id` is bound locally for runtime evaluation.
4. `RETURN: $options[$id].id` evaluates the runtime expression and retrieves the `id` member of the selected option under the current index-aligned convention. Both `$options` and `$id` are runtime references. This expression is part of the Programs template language, not JSON syntax.
5. Menu options describe alternatives; they do not embed individual response commands.
6. The menu's concrete labels, option set, and selection-state mapping belong to each interaction occurrence. The generic template must not be overwritten with example-specific menu data.
7. A selection interaction is one input-requiring step in a narrow, stateful program. Program state is maintained outside GitHub Actions runs and is distinct from the external Node.js program effect.

## Open decisions — not yet specified

- Exact agent response serialization (an object, array, primitive, or multiple permitted representations) is not settled.
- Source and timing of option population have deliberately been deferred.
- The exact compiled JSON encoding of runtime expressions, as distinct from their source-language spelling, has not yet been ratified.
- The numeric identifier/index equivalence is the *current template convention*, not a general law of JSON; any future nonconsecutive identifiers require corresponding changes to lookup semantics.
- No additional interaction-element types are defined by this document.

## Scope of this specification

This document defines the current **selection** template only. It does not implement the interaction controller, workflow trigger, JavaScript executor, state-persistence mechanism, or a complete Programs SRS.
