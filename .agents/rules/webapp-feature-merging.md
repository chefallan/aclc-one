---
name: webapp-feature-merging
description: Guidelines and invariants for merging features between webapps
trigger: always_on
---

# Webapp Feature Merging & Architectural Invariants

When merging features or "God Nodes" from a source app into a target app:

### 1. Zero Deletion / Non-Destructive Source
- Never delete, modify, or corrupt source project files. All extractions must be copy-only.
- Verify source repository cleanliness and push to remote git prior to work.

### 2. Follow Target App's Existing Architecture
- **Database**: Use the target app's existing database architecture (e.g. Prisma + PostgreSQL) instead of the source app's backend (e.g. Supabase).
- **UI & Design**: Reuse existing UI primitives (`Card`, `Button`, `Input`, `Badge`) and port exact styling/animations into `globals.css`.
- **Zero-New-Dependency Priority**: Implement pure TypeScript utilities (e.g., pure Levenshtein distance for fuzzy matching, seeded shuffling, regex CSV parsers) rather than installing third-party npm packages.

### 3. Package Manager: Always Use `pnpm`
- Never execute `npm install`, `npm run`, or `npx`.
- Use `pnpm install`, `pnpm run <cmd>`, `pnpm exec <cmd>`.
- Configure `.npmrc` with `only-built-dependencies` when native packages require postinstall builds.

### 4. Mandatory Python Bulk Automation (Never Analyze Files One-by-One)
- **NEVER inspect, analyze, or port files one by one manually**.
- Always write and run a dedicated Python script that batch-reads Graphify output (`graph.json`), batch-extracts all referenced source files and AST nodes, transforms imports, synchronizes code, and executes syntax diagnostics in a single automated step.

### 5. Mandatory Python Verification & Debug Script
- For every major feature integration, create a standalone Python verification script (e.g., `verify_<feature>_integration.py`).
- The script must:
  1. Inspect all newly added and modified files (verifying existence, line counts, and UTF-8 encoding).
  2. Test core logic/algorithms (CSV parsing, Levenshtein distance, math evaluations, rate limiting).
  3. Output a structured debug report with clear pass/fail diagnostics.
