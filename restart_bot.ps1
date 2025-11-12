# Скрипт для перезапуска бота
Write-Host "Останавливаю старые процессы Python..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Запускаю бота..." -ForegroundColor Green
Set-Location "c:\Users\shbsd\OneDrive\Рабочий стол\manicure-miniapp"
Start-Process python -ArgumentList "bot.py" -WindowStyle Normal

Write-Host "Бот перезапущен!" -ForegroundColor Green

