---
name: package-manager
description: Enforce pnpm for all package management and script commands
trigger: always_on
---

# Package Manager Convention: Always Use pnpm

In this workspace, ALWAYS use `pnpm` instead of `npm` or `yarn`.

### Invariants:
1. **Dependency Installation**: Use `pnpm install`, `pnpm add <pkg>`, `pnpm add -D <pkg>`.
   - Never run `npm install` or `npm i`.
2. **Running Scripts**: Use `pnpm run <script>` or `pnpm <script>` (e.g., `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm test`).
   - Never run `npm run <script>`.
3. **Executing Binaries**: Use `pnpm exec <cmd>` or `pnpm dlx <cmd>` instead of `npx`.
