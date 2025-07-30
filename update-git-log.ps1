# Git Log Update Script
# This script updates the git log files with the latest changes

Write-Host "Updating git log files..." -ForegroundColor Green

# Update basic git log
git log --oneline --graph --all > git-changes.log

# Update detailed git log
git log --pretty=format:"%h - %an, %ar : %s" --graph --all > git-changes-detailed.log

# Add timestamp to the log files
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path "git-changes.log" -Value "`nLast updated: $timestamp"
Add-Content -Path "git-changes-detailed.log" -Value "`nLast updated: $timestamp"

Write-Host "Git log files updated successfully!" -ForegroundColor Green
Write-Host "Files updated:" -ForegroundColor Yellow
Write-Host "  - git-changes.log" -ForegroundColor White
Write-Host "  - git-changes-detailed.log" -ForegroundColor White 