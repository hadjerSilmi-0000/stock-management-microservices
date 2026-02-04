@echo off
:: =================================================================
:: Start Infrastructure Services
:: Run this BEFORE starting your microservices
:: =================================================================

color 0A
echo.
echo ========================================
echo   STOCK MANAGEMENT INFRASTRUCTURE
echo ========================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Not running as administrator
    echo Some services may fail to start
    echo.
    timeout /t 3 /nobreak >nul
)

echo [1/4] Creating required directories...
if not exist "C:\traefik\logs" mkdir "C:\traefik\logs"
if not exist "C:\consul\data" mkdir "C:\consul\data"
if not exist "C:\consul\logs" mkdir "C:\consul\logs"
echo    Done.
echo.

echo [2/4] Starting Consul (Service Discovery)...
start "Consul" /MIN consul agent -config-file="C:\consul\consul.json" > C:\consul\logs\consul.log 2>&1
timeout /t 5 /nobreak >nul
echo    Consul started on http://localhost:8500
echo.

echo [3/4] Starting RabbitMQ (Message Broker)...
net start RabbitMQ 2>nul
if %errorLevel% equ 0 (
    echo    RabbitMQ started successfully
) else (
    echo    RabbitMQ already running or failed to start
)
echo    Management UI: http://localhost:15672 (guest/guest)
echo.

echo [4/4] Starting Traefik (API Gateway)...
start "Traefik" /MIN C:\traefik\traefik.exe --configFile=C:\traefik\traefik.yml
timeout /t 5 /nobreak >nul
echo    Traefik started on http://localhost:80
echo    Dashboard: http://localhost:8080/dashboard/
echo.

echo ========================================
echo   ALL INFRASTRUCTURE SERVICES STARTED
echo ========================================
echo.
echo Services running:
echo   - Consul:    http://localhost:8500
echo   - RabbitMQ:  http://localhost:15672 (guest/guest)
echo   - Traefik:   http://localhost:8080/dashboard/
echo.
echo To check service status, visit Consul UI at:
echo   http://localhost:8500/ui
echo.
echo Press any key to verify services are running...
pause >nul

echo.
echo Verifying services...
echo.

:: Check Consul
curl -s http://localhost:8500/v1/agent/self >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Consul is running
) else (
    echo [FAIL] Consul is not responding
)

:: Check RabbitMQ
curl -s http://localhost:15672 >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] RabbitMQ is running
) else (
    echo [FAIL] RabbitMQ is not responding
)

:: Check Traefik
curl -s http://localhost:8080/ping >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Traefik is running
) else (
    echo [FAIL] Traefik is not responding
)

echo.
echo ========================================
echo.
echo You can now start your microservices:
echo   start-microservices.bat
echo.
pause