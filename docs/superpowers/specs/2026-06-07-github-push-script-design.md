# GitHub Push Script Design

## Goal

Provide a reusable Windows-friendly script that can add changes, create a commit, and push the current branch to GitHub even when the local Git credential flow is inconvenient.

## Scope

This design covers:

- A PowerShell script as the main implementation
- A batch wrapper for double-click or simple terminal use
- A dry-run mode for safe verification
- Token handling that does not persist credentials into the repo config

This design does not cover:

- Automatic deployment to the server
- SSH-based GitHub auth setup
- Cross-platform shell wrappers beyond Windows

## Approach

Use `scripts/push-github.ps1` as the source of truth. The script will:

1. Verify that the current directory is a Git worktree
2. Resolve the current branch and remote URL
3. Optionally stage tracked changes and optionally include untracked files
4. Optionally create a commit
5. Read a GitHub token from `GITHUB_TOKEN` or prompt for one
6. Push via a temporary authenticated HTTPS URL without changing `origin`

Add a root-level `push-github.bat` that forwards arguments into the PowerShell script with `ExecutionPolicy Bypass`.

## Safety Notes

- Dry-run mode must show what would happen without creating a commit or pushing
- The token must be masked in user-facing output
- The token must not be written into Git remote config
- The script should support push-only usage when the user has already staged or committed work

## Verification

Verification will use a small smoke test that checks the script can:

- Resolve the current repo and branch
- Run in `-DryRun` mode without a token
- Print the expected dry-run summary
