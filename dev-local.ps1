# Start all dev servers in parallel
# Usage: .\dev-local.ps1

Write-Host "Starting Penna dev servers..." -ForegroundColor Green
Write-Host ""

# Check if concurrently is installed
$concurrently = npm list concurrently -g --depth=0 2>$null
if ($null -eq $concurrently) {
    Write-Host "Installing concurrently..." -ForegroundColor Yellow
    npm install -g concurrently
}

# Run all dev servers in parallel
concurrently `
  --names "web,server,dashboard,docs" `
  --colors "blue,yellow,magenta,cyan" `
  "npm run dev --prefix apps/web" `
  "npm run dev --prefix apps/server" `
  "npm run dev --prefix apps/dashboard" `
  "npm run dev --prefix apps/docs"
