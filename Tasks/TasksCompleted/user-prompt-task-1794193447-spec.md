# Account custom-instruction wrapper — Task 1794193447

## Structure
The wrapper is the outermost JSON **array**, not an object. Every outer element preceding the last is either an individual standalone rule or an array containing a single subject group. The last **outer** element gives interpretation instructions for the outer array.

In each grouped array, index **0** has the same interpretation function locally that the last outer index has globally: it specifies that group's single subject, its scope, and how the remaining group indices are interpreted. Group rule entries occupy indices **1** onward. A group does **not** reserve its final index for interpretation.

## Order and insertion
Standalone ad hoc rules are ordered newest-to-oldest. Insert each newly adopted standalone rule at **outer index 0** (or index 0 of its applicable ad hoc array); previous indices shift by **+1**. The outermost interpretation element remains last. A group's index 0 remains its subject/scope/interpretation entry when rules are inserted after it.

## Nested interpretation
A nested group's index 0 controls interpretation inside that group. Where it explicitly overrides the outermost interpretation, the local interpretation takes precedence **within that group only**.

## Instantiated account instructions
The accompanying `Tasks/TasksCompleted/user-prompt-task-1794193447-wrapper.json` contains the existing full user-defined-scope instruction, preserving its wording and behavioral scope, presented as one subject group. No unrelated or invented account instruction was added. Future standalone ad hoc instructions may be inserted as outer elements without changing the single-subject group.

## Clarification of the earlier R6 wording
Only the **outermost array's last index** is reserved for outer interpretation. The equivalent index in a **grouped array is its first index**, not its last. This reflects the user's correction; it is not a further rule.

## Validation criteria
- Top-level JSON value is an array.
- Its last element provides outer interpretation instructions.
- Every grouped-rule array has a single subject/scope/interpretation element at index 0; all later elements belong to that subject.
- A group's final element may be a rule and is not reserved for interpretation.
- Standalone rules are representable at outer indices before the last and insertion places the newest at index 0.
- Existing indices shift after insertion without replacing the final outer interpretation.
- Local interpretation overrides outer interpretation only for its nested group when explicitly stated.
- The source account instruction's substantive rules and scope are preserved without omission or new obligations.

## Source and change boundaries
Source task: `Tasks/User Prompt Task Queue/user-prompt-task-1794193447.json`.
This deliverable is a wrapper design and example. It does not activate account settings, alter the original task, or implement any other queued task.
