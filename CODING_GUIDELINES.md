# Coding Guidelines

## File Naming

- **All files and directories must use `kebab-case`**.
- **Do not use** `camelCase`, `PascalCase`, or `snake_case` for filenames.
- Example: `dashboard-stats.tsx` instead of `DashboardStats.tsx`.

## Component Naming

- React components should use `PascalCase`.
- Example: `export function DashboardStats() { ... }`

## API Routes

- Follow Next.js App Router conventions (`route.ts`, `page.tsx`, `layout.tsx`) for frontend.
- For backend services, follow the existing controller/route pattern in `apps/server`.

## State Management

- **Always use TanStack Query** for data fetching in the frontend.
- Avoid `useEffect` for data fetching.

## General

- Use `kebab-case` for all file names.
- Use `PascalCase` for component names.

## Package manager

- Use `pnpm`.
