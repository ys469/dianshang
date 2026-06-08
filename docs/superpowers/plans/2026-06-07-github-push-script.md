# GitHub Push Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable Windows script that can safely commit and push the current branch to GitHub with a temporary token-based HTTPS push flow.

**Architecture:** Keep the logic in one PowerShell script and expose a root batch wrapper for convenience. Use dry-run output and temporary authenticated URLs so the repo config stays unchanged.

**Tech Stack:** PowerShell, Windows batch, Git CLI

---

### Task 1: Add a smoke test first

**Files:**
- Create: `.codex-temp/test-push-github.ps1`
- Test: `.codex-temp/test-push-github.ps1`

- [ ] **Step 1: Write the failing smoke test**
- [ ] **Step 2: Run it and confirm it fails because the script does not exist yet**

### Task 2: Implement the script and wrapper

**Files:**
- Create: `scripts/push-github.ps1`
- Create: `push-github.bat`
- Modify: `.gitignore`
- Create: `docs/deployment/github-push-script.md`

- [ ] **Step 1: Implement the main PowerShell script**
- [ ] **Step 2: Add the batch wrapper**
- [ ] **Step 3: Ignore local temp artifacts that should never be pushed**
- [ ] **Step 4: Write a short usage guide**

### Task 3: Verify behavior

**Files:**
- Test: `.codex-temp/test-push-github.ps1`
- Test: `scripts/push-github.ps1`

- [ ] **Step 1: Re-run the smoke test and confirm it passes**
- [ ] **Step 2: Run the script against the current repo in `-DryRun` mode**
- [ ] **Step 3: Confirm the output shows branch, remote, and masked push target**
