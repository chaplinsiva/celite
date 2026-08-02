<!-- agent-notes: { ctx: "ADR for Next.js Todo App state & component architecture", deps: [docs/plans/todo-app-plan.md], state: canonical, last: "archie@2026-07-22" } -->

# ADR-0001: Next.js App Router Structure & Local Todo State Architecture

**Status:** Approved
**Date:** 2026-07-22
**Deciders:** Archie (Architect), Wei (Principal Architect), Sato (Dev)

## Context
We are building a modern Next.js Todo application with high-aesthetic UI (Glassmorphism & Dark mode) and full CRUD capabilities. We need to decide on:
1. Directory layout and Next.js App Router component boundary strategy.
2. State management strategy for task items (CRUD operations, completion toggling, filter states).

## Decision
1. **Next.js App Router Structure:**
   - Use App Router with `src/app` directory layout.
   - Separate UI components into `src/components/` and custom hooks / models into `src/hooks/` and `src/types/`.
   - Maintain client component boundaries cleanly using `'use client'` on interactive components (`TaskInput`, `TaskList`, `TaskItem`).

2. **State Management Strategy:**
   - Use a custom React hook (`useTodo`) backed by local React state and optional LocalStorage synchronization.
   - Keep state immutable and pure to simplify component testing via React Testing Library.

## Consequences
- **Positive:** Zero third-party state library overhead, high performance, clean testability with Jest & React Testing Library.
- **Negative:** For multi-page state sharing in the future, we will need to wrap state in a React Context or lightweight store.
