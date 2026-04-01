---
name: "ui-ux-pro-max"
description: "Delivers advanced UI/UX strategy and implementation-ready design outputs. Invoke for complex page redesign, interaction optimization, design-system alignment, or usability upgrades."
---

# UI UX Pro Max

This skill provides high-standard, implementation-ready UI/UX solutions for complex product interfaces.

## Language Policy (Chinese First)

- Default output language is Simplified Chinese.
- If the user explicitly requests another language, follow the user's requested language.
- Keep key terms bilingual on first mention when helpful, then prioritize concise Chinese.
- Use Chinese UI copy examples by default unless product language standards require otherwise.

## Invoke When

- User requests full-page redesign, workflow redesign, or multi-module UI optimization.
- User requests improved visual hierarchy, information density control, or readability.
- User requests conversion optimization for forms, approvals, dashboards, or operations pages.
- User requests interaction polish including loading, empty, error, success, and disabled states.
- User requests accessibility, responsive behavior, and cross-device consistency improvements.

## Scope Boundary (vs frontend-design)

- Use `ui-ux-pro-max` for complex, cross-page or cross-module redesign with strategic impact.
- Use `ui-ux-pro-max` when goals include conversion, task efficiency, or consistency at system scale.
- Do not use this skill as primary for lightweight UI polishing that stays within a single page/component.
- For local UI tuning and direct coding guidance, prefer `frontend-design`.
- Accept handoff from `frontend-design` when complexity grows beyond component/page scope.

## Core Deliverables

- Information architecture and page section priority.
- Wireframe-level layout (textual) and component composition.
- Interaction specification with state transitions and feedback patterns.
- Visual rule set (spacing, typography, color usage, emphasis hierarchy).
- Accessibility and responsive strategy.
- Engineering handoff guidance mapped to existing component library.

## Workflow

1. Clarify user goals, key tasks, and business constraints.
2. Diagnose usability bottlenecks in current UI.
3. Reconstruct page structure and task flow.
4. Define component system and behavior states.
5. Specify responsive and accessibility requirements.
6. Produce implementation-oriented handoff notes.

## Constraints

- Reuse existing project UI components first.
- Keep naming, tokens, and design patterns consistent with the codebase.
- Avoid visual over-design; prioritize task completion efficiency and clarity.

## Routing Rules

- Choose `ui-ux-pro-max` when user asks for “整体改版/流程再造/多页面一致性治理/可用性系统升级”.
- If request can be solved by minor layout and component adjustments, route to `frontend-design`.
- When uncertain, evaluate scope breadth first: multi-module = `ui-ux-pro-max`, single module = `frontend-design`.
