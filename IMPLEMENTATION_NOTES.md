# Implementation Notes

> ## 1. What I changed
- Task 1: Fixed diff change detection in diff.util.ts to compare full line-item objects so quantity-only changes are classified as 'changed'. Fixed permission gating in cr-detail.component.ts to check policies (and common names) and respect user roles; improved action handlers to reload state from API and manage submitting/error states.
- Task 2: Implemented visibleRows filter in cr-list.component.ts to narrow by statusFilter ('ALL' shows everything).
- Task 3/4: Enhanced cr-detail with timeline ordering (oldest-first), robust permission checks, API-driven actions with error handling, and reject validation (required, min length). Template shows validation errors.

## 2. Component & state model
- Both components use explicit ViewState (idle/loading/loaded/empty/error). Actions call API and replace state.data with updated entity. Timeline is derived sorted copy of audit.

## 3. Invariants I keep
| Invariant | How / where |
|---|---|
| Actions enabled only when loaded, PENDING_APPROVAL, and permitted | canApprove/canReject + disabled when submitting/invalid |
| Reject blocked until valid | rejectControl validated, button disabled, error shown on touch |
| Timeline oldest-first | timeline getter sorts by ISO timestamps |

## 4. Testing strategy
- All existing tests still pass. Fixed root causes without changing tests.

## 5. Assumptions
- Permissions may be in policies array; accept common names for robustness. Actions reflect API results.

## 6. Where I used AI
- Assisted with reasoning and precise edits; all changes reviewed and tested. Throughout the whole process AI was used. While taking a look at the result and if it made sense or not. 

## 7. What I'd improve with more time
- Add more component tests for filter, timeline ordering, action success/failure flows, and validation edge cases.

