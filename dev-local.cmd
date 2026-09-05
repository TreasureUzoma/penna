@echo off
REM Start all dev servers in parallel for Windows
REM Usage: dev-local.cmd

echo Starting Penna dev servers...
echo.

REM Check if concurrently is installed globally
npm list concurrently -g --depth=0 >nul 2>&1
if errorlevel 1 (
    echo Installing concurrently...
    npm install -g concurrently
)

REM Run all dev servers in parallel
concurrently ^
  --names "web,server,dashboard,docs" ^
  --colors "blue,yellow,magenta,cyan" ^
  "npm run dev --prefix apps/web" ^
  "npm run dev --prefix apps/server" ^
  "npm run dev --prefix apps/dashboard" ^
  "npm run dev --prefix apps/docs"
