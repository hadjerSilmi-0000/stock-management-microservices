@echo off
:: =================================================================
:: Stop All Services
:: Gracefully stops all microservices and infrastructure
:: =================================================================

color 0C
echo.
echo ========================================
echo   STOPPING ALL SERVICES
echo ========================================
echo.

echo [1/5] Stopping Node.js microservices...
taskkill /F /IM node.exe /T >nul 2>&1
if %errorLevel% equ 0 (
    echo    All Node.js services stopped
) else (
    echo    No Node.js services were running
)
echo.

echo [2/5] Stopping Traefik...
taskkill /F /IM traefik.exe /T >nul 2>&1
if %errorLevel% equ 0 (
    echo    Traefik stopped
) else (
    echo    Traefik was not running
)
echo.

echo [3/5] Stopping Consul...
taskkill /F /IM consul.exe /T >nul 2>&1
if %errorLevel% equ 0 (
    echo    Consul stopped
) else (
    echo    Consul was not running
)
echo.

echo [4/5] Stopping RabbitMQ...
net stop RabbitMQ >nul 2>&1
if %errorLevel% equ 0 (
    echo    RabbitMQ stopped
) else (
    echo    RabbitMQ was not running or failed to stop
)
echo.

echo [5/5] Cleaning up...
:: Clean up any zombie processes
taskkill /F /FI "WINDOWTITLE eq Users Service*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Products Service*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Stock Service*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Suppliers Service*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Consul*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Traefik*" >nul 2>&1
echo    Cleanup complete
echo.

echo ========================================
echo   ALL SERVICES STOPPED
echo ========================================
echo.
echo All microservices and infrastructure services have been stopped.
echo.

:: Optional: Clean up log files
echo Do you want to clean up log files? (Y/N)
choice /C YN /N /M "Clean logs? [Y/N]: "
if %errorLevel% equ 1 (
    echo.
    echo Cleaning log files...
    del /Q "C:\traefik\logs\*.log" 2>nul
    del /Q "C:\consul\logs\*.log" 2>nul
    echo Log files cleaned
)

echo.
pause