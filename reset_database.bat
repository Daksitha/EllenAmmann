@echo off
echo ===================================================
echo Resetting Ellen Ammann Databases
echo ===================================================
echo.

echo WARNING: This will move your current Knowledge Base and Questionnaire 
echo files into an archive folder and start fresh with empty files.
echo.
set /p Continue=Are you sure you want to start from scratch? (Y/N): 
if /I "%Continue%" neq "Y" goto Cancel

:: Create timestamp for the archive folder
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,4%%datetime:~4,2%%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%%datetime:~12,2%

set "archive_dir=data\archive_%timestamp%"

echo.
echo Creating archive folder: %archive_dir%
mkdir "%archive_dir%"

echo Moving current database files...
if exist "ellen_ammann_kb.jsonl" move "ellen_ammann_kb.jsonl" "%archive_dir%\ellen_ammann_kb_old.jsonl" >nul
if exist "ellen_ammann_eval_qa.jsonl" move "ellen_ammann_eval_qa.jsonl" "%archive_dir%\ellen_ammann_eval_qa_old.jsonl" >nul

echo Creating fresh, empty databases...
type nul > "ellen_ammann_kb.jsonl"
type nul > "ellen_ammann_eval_qa.jsonl"

echo.
echo Reset Complete! 
echo Your old files are safely stored in the %archive_dir% directory.
echo If you made a mistake, you can copy them back from there.
echo.
pause
exit

:Cancel
echo.
echo Operation cancelled. No files were moved.
pause
