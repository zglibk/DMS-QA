---
name: "frontend-design"
description: "Designs and refines frontend UI/UX structure, visual hierarchy, and interaction patterns. Invoke when users request page design, component layout, styling strategy, or UX improvements."
---

# Frontend Design

This skill helps produce practical, implementation-ready frontend design guidance for web applications.

## Language Policy (Chinese First)

- Default output language is Simplified Chinese.
- If the user explicitly requests another language, follow the user's requested language.
- Keep technical terms bilingual when helpful on first mention, then use concise Chinese wording.
- Keep UI copy examples in Chinese by default unless the project language standard requires otherwise.

## Invoke When

- User asks to design a new page, form, dashboard, or workflow.
- User asks to optimize UI layout, visual hierarchy, spacing, or readability.
- User asks for component architecture, design system alignment, or reusable UI patterns.
- User asks for UX improvements such as interaction feedback, validation flow, error states, and accessibility.
- User provides screenshots and asks for redesign suggestions.

## Scope Boundary (vs ui-ux-pro-max)

- Use `frontend-design` for single page/component level design tasks with clear scope.
- Use `frontend-design` for fast, practical layout/styling suggestions and direct implementation guidance.
- Do not use this skill as primary for cross-module flow redesign, KPI/转化目标驱动优化, or system-level UX strategy.
- If request includes organization-wide design consistency governance, prefer `ui-ux-pro-max`.
- If request complexity escalates during execution, hand off to `ui-ux-pro-max`.

## Objectives

- Convert product requirements into clear page structure and interaction flow.
- Provide design decisions that are easy to implement in code.
- Balance usability, consistency, and maintainability.

## Working Method

1. Clarify context: user role, task goals, and critical actions.
2. Define information architecture: sections, priority, and navigation.
3. Design layout system: grid, spacing rhythm, responsive breakpoints.
4. Specify components: variants, states, and composition rules.
5. Define interaction details: loading, empty, error, success, and disabled states.
6. Add accessibility checks: keyboard flow, contrast, labels, focus visibility.
7. Deliver implementation notes aligned with existing tech stack and component library.

## Output Template

- Page goal and target users
- Core user flow
- Wireframe-level layout (textual)
- Component list and state matrix
- Visual rules (typography, spacing, color usage)
- Interaction and feedback behaviors
- Responsive strategy
- Accessibility checklist
- Engineering handoff notes

## Constraints

- Prefer existing project UI components before introducing new ones.
- Keep design tokens and naming consistent with the codebase.
- Avoid over-design; prioritize business clarity and task completion speed.

## Routing Rules

- Default choice for normal UI tweaks: `frontend-design`.
- If user asks for “重构流程/改版整站/体验策略/转化提升方案”, route to `ui-ux-pro-max`.
- If unsure, start with `frontend-design` and escalate only when scope exceeds page/component level.
