# Git Log Tracking System

This project includes automated git log tracking to maintain a history of all changes for easy reference.

## Log Files

- **`git-changes.log`** - Basic git log with commit hashes and messages
- **`git-changes-detailed.log`** - Detailed git log with author names and timestamps

## How to Update Log Files

### Option 1: PowerShell Script (Recommended)
```powershell
.\update-git-log.ps1
```

### Option 2: Batch File
```cmd
update-git-log.bat
```

### Option 3: Manual Commands
```bash
# Basic log
git log --oneline --graph --all > git-changes.log

# Detailed log
git log --pretty=format:"%h - %an, %ar : %s" --graph --all > git-changes-detailed.log
```

## When to Update

Update the log files after:
- Making significant commits
- Before major releases
- When you want to document the current state of changes

## File Format

### Basic Log Format
```
* commit_hash - commit_message
```

### Detailed Log Format
```
* commit_hash - author_name, time_ago : commit_message
```

## Tips

- Run the update script after each major commit
- The log files include timestamps of when they were last updated
- Keep these files in version control to track the history of your project changes 