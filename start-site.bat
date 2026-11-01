@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:8780/"
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8780 --directory site
) else (
  py -m http.server 8780 --directory site
)
if errorlevel 1 pause
