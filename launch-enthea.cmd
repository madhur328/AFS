@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "EXE="

if exist "%~dp0enthea-rs.exe" set "EXE=%~dp0enthea-rs.exe"
if not defined EXE if exist "%~dp0videos\afs\addons\enthea-rs.exe" (
  set "EXE=%~dp0videos\afs\addons\enthea-rs.exe"
)

REM Walk up a few levels (e.g. cmd copied to Downloads but HTML tree nearby)
if not defined EXE call :walk_up "%~dp0" 4

if defined EXE (
  start "" "%EXE%"
  exit /b 0
)

echo ENTHEA not found. Place enthea-rs.exe beside the static HTML, or under videos\afs\addons\
echo Searched from: %~dp0
pause
exit /b 1

:walk_up
set "DIR=%~1"
set "LEFT=%~2"
if "%LEFT%"=="0" exit /b
if exist "%DIR%enthea-rs.exe" (
  set "EXE=%DIR%enthea-rs.exe"
  exit /b
)
if exist "%DIR%videos\afs\addons\enthea-rs.exe" (
  set "EXE=%DIR%videos\afs\addons\enthea-rs.exe"
  exit /b
)
if exist "%DIR%afs-platform-static.html" goto :found_marker
if exist "%DIR%afs-platform-static-mobile.html" goto :found_marker
set /a NEXT=%LEFT%-1
pushd "%DIR%.." 2>nul || exit /b
set "DIR=%CD%\"
popd
call :walk_up "%DIR%" %NEXT%
exit /b

:found_marker
if exist "%DIR%enthea-rs.exe" set "EXE=%DIR%enthea-rs.exe"
if not defined EXE if exist "%DIR%videos\afs\addons\enthea-rs.exe" (
  set "EXE=%DIR%videos\afs\addons\enthea-rs.exe"
)
exit /b