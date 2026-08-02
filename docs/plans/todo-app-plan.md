<!-- agent-notes: { ctx: "implementation plan for Modern Next.js Todo App", deps: [AGENTS.md, docs/plans/quickstart-backlog.md], state: active, last: "pat@2026-07-22" } -->

# Implementation Plan: Modern Next.js Todo App

## Goal
Build a modern, high-aesthetic web-based Todo application for personal task management using Next.js, React, TypeScript, and modern styling (Glassmorphism & Dark Mode). The initial release will focus on core CRUD operations (Create, Read, Update, Delete) with interactive state management and visual excellence.

## Constraints
- Web application built with Next.js (App Router), React, and TypeScript.
- Rich modern aesthetics (glassmorphism, vibrant dark palette, smooth micro-animations, Google Fonts typography).
- Unit/component test coverage via Jest / React Testing Library (TDD workflow).

## Architecture Gate Items
The following item requires the **Architecture Decision Gate** (ADR + Wei debate before implementation):
- **Item #1: Next.js App Router Structure & State Management Strategy**
  - *Reason:* Setting up the core app directory layout, component hierarchy, client vs server component boundaries, and state management pattern (React state vs Context vs Zustand/Redux) forms the foundation of the codebase layout.
  - *Action:* Write ADR in `docs/adrs/` and engage Wei to review architecture before scaffolding implementation code.

## Personas Involved
- **Cam:** Discovery & Product Requirements Alignment
- **Archie:** Architecture & ADR drafting (Next.js App Router & State strategy)
- **Wei:** Principal Architect / Security & Gatekeeper review
- **Tara:** Test-Driven Development lead (failing unit/component tests)
- **Sato:** Core Implementation developer (passing code)
- **Vik:** Code quality & standard reviewer

## Proposed Steps & Approach

### Phase 1: Architecture & Scaffold (Gated)
1. **ADR Creation (Archie & Wei):**
   - Document ADR-0001: Next.js App Router & Local State Architecture.
   - Run Architecture Gate debate.
2. **Next.js App Scaffolding:**
   - Scaffold Next.js project setup (`create-next-app` or equivalent App Router structure in TypeScript).
   - Configure Jest & React Testing Library for component unit testing.

### Phase 2: Core Task State & Creation/Listing (Sprint 1 - Item #1)
1. **Tests First (Tara):** Write unit tests for task data structure, task addition, task listing, and task completion toggle.
2. **Implementation (Sato):** Implement core `useTodoState` hook / provider and basic UI components (`TaskInput`, `TaskList`, `TaskItem`).
3. **Verification:** All tests pass green.

### Phase 3: Task Editing & Deletion (Sprint 1 - Item #2)
1. **Tests First (Tara):** Write unit tests for task inline editing (title/description change), deletion, and clearing completed tasks.
2. **Implementation (Sato):** Add inline editing state, delete action, and confirm modal / quick delete animations.
3. **Verification:** All CRUD unit tests pass green.

### Phase 4: Modern Design & Polish (Sprint 1 - Item #3)
1. **Design System & Layout:**
   - Dark glassmorphic background container with blurred backdrop filters and gradient accents.
   - Smooth CSS transitions for check/uncheck, hover states, filter pills, and delete actions.
   - Accessible contrast and Google Font typography (Inter / Outfit).
2. **Review & Done Gate:** Code review (Vik) and Done Gate checklist.

## Open Questions
- None at present (confirmed Next.js, personal scope, and CRUD focus).

## Acceptance Criteria
- [ ] Next.js app running locally with zero build/type errors.
- [ ] Users can add new tasks with titles.
- [ ] Users can list all tasks and toggle completed status.
- [ ] Users can edit task titles and delete tasks.
- [ ] UI features modern dark glassmorphism design with responsive layout.
- [ ] Suite of unit tests passing via TDD workflow.
