# Account custom-instruction wrapper — Task 1794193447

## Structure
The wrapper is a JSON array. Each outer element except the final element is either a standalone ad hoc rule or a single-subject grouped array. The final outer element specifies interpretation rules for that outer array.

Each grouped array has an index-0 entry defining its one subject and scope, rule entries at indexes 1 through length-2, and an interpretation entry at its final index. A group final element is reserved and is never an ordinary rule.

## Ordering and insertion
Standalone ad hoc rules are newest-first: insert a new rule at index 0 of its applicable ad hoc array, shifting preexisting indices by +1 without displacing reserved structural entries. Insert subject-group rules before the reserved final local interpretation element.

## Local precedence
The group index-0 scope and final local interpretation govern only that subject. Explicit local interpretation wins over conflicting outer interpretation only within that group.

## Artifacts
Tasks/TasksCompleted/user-prompt-task-1794193447-wrapper.json contains the full prior scope instruction and the conversation-analytics rule as separate single-subject groups. Tasks/TasksCompleted/user-prompt-task-1794193968-rule.json is the standalone analytics group. Tasks/TasksCompleted/user-prompt-task-1794192853-revision.json contains the proposed compact scope instruction.

## Validation
- Root and each nested group are valid JSON arrays.
- The root final index and every group final index contain interpretation instructions.
- Each group index 0 specifies exactly one subject and scope; rule elements are between first and last.
- New standalone ad hoc rules are inserted at their applicable array index 0, preserving interpretation positions.
- Group-local overrides are confined to the group.
- Source account scope instructions remain substantively preserved.
- The analytics rule references terminals.conversation-record v1.0.0 at conversations/conversation-record.template.json.
- These artifacts do not claim account setting activation or an installed end-of-turn callback.

## Source
Tasks/TasksCompleted/user-prompt-task-1794193447.json. This document corrects the previous contradiction concerning nested final-index semantics.
