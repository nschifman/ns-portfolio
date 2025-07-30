@echo off
echo Updating git log files...

REM Update basic git log
git log --oneline --graph --all > git-changes.log

REM Update detailed git log
git log --pretty=format:"%%h - %%an, %%ar : %%s" --graph --all > git-changes-detailed.log

REM Add timestamp
echo. >> git-changes.log
echo Last updated: %date% %time% >> git-changes.log
echo. >> git-changes-detailed.log
echo Last updated: %date% %time% >> git-changes-detailed.log

echo Git log files updated successfully!
echo Files updated:
echo   - git-changes.log
echo   - git-changes-detailed.log
pause 