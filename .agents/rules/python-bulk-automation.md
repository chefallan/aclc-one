---
name: python-bulk-automation
description: Rule requiring Python scripts for bulk Graphify analysis and code synchronization
trigger: always_on
---

# Python Bulk Automation Rule

### Core Directive:
Whenever analyzing a codebase, querying Graphify, porting features, or performing multi-file merges:
- **DO NOT analyze, read, or copy files one by one interactively**.
- **ALWAYS write and execute a Python script** that:
  1. Loads Graphify's `graph.json` or scans the codebase in bulk.
  2. Extracts all related AST nodes, source files, and community dependencies simultaneously.
  3. Synchronizes, transforms, and validates the entire set of files programmatically.
  4. Runs comprehensive automated diagnostics on line counts, syntax, and types.
