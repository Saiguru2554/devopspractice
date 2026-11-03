@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto no_node
where npm >nul 2>nul
if errorlevel 1 goto no_node
if not exist node_modules (
  echo Installing frontend packages for the first time...
  call npm install
  if errorlevel 1 goto install_failed
)
echo Starting TaskFlow frontend...
echo When Vite starts, open the local URL it prints, normally http://localhost:5173
call npm run dev
pause
goto end
:no_node
echo Node.js and npm were not found.
echo Install the Node.js LTS release from https://nodejs.org/
echo Then close and reopen this window and double-click start.bat again.
pause
goto end
:install_failed
echo Package installation failed. Check your internet connection and Node.js installation.
pause
goto end
:end
endlocal
