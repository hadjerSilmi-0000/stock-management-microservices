@echo off
:: =================================================================
:: Test Infrastructure and Services
:: Verify that everything is working correctly
:: =================================================================

color 0E
echo.
echo ========================================
echo   TESTING INFRASTRUCTURE
echo ========================================
echo.

:: Test if curl is available
curl --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: curl is not installed or not in PATH
    echo Please install curl to run this test script
    echo Download from: https://curl.se/windows/
    echo.
    pause
    exit /b 1
)

:: Test Consul
echo Testing Consul...
curl -s http://localhost:8500/v1/status/leader >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Consul is running on port 8500
    echo        UI: http://localhost:8500/ui
) else (
    echo [FAIL] Consul is not running
    echo        Start it with: start-infrastructure.bat
)
echo.

:: Test RabbitMQ
echo Testing RabbitMQ...
curl -s -u guest:guest http://localhost:15672/api/overview >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] RabbitMQ is running on ports 5672 (AMQP) and 15672 (HTTP)
    echo        UI: http://localhost:15672 (guest/guest)
) else (
    echo [FAIL] RabbitMQ is not running or credentials are incorrect
)
echo.

:: Test Traefik
echo Testing Traefik...
curl -s http://localhost:8080/ping >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Traefik is running on port 80 (proxy) and 8080 (dashboard)
    echo        Dashboard: http://localhost:8080/dashboard/
) else (
    echo [FAIL] Traefik is not running
)
echo.

echo ========================================
echo   TESTING MICROSERVICES
echo ========================================
echo.

:: Test Users Service (direct)
echo Testing Users Service (direct)...
curl -s http://localhost:5001/api/users/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Users Service is running on port 5001
    for /f "delims=" %%i in ('curl -s http://localhost:5001/api/users/health') do set RESPONSE=%%i
    echo        Response: %RESPONSE%
) else (
    echo [FAIL] Users Service is not responding
)
echo.

:: Test Products Service (direct)
echo Testing Products Service (direct)...
curl -s http://localhost:5002/api/products/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Products Service is running on port 5002
) else (
    echo [FAIL] Products Service is not responding
)
echo.

:: Test Stock Service (direct)
echo Testing Stock Service (direct)...
curl -s http://localhost:5003/api/stock/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Stock Service is running on port 5003
) else (
    echo [FAIL] Stock Service is not responding
)
echo.

:: Test Suppliers Service (direct)
echo Testing Suppliers Service (direct)...
curl -s http://localhost:5004/api/suppliers/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Suppliers Service is running on port 5004
) else (
    echo [FAIL] Suppliers Service is not responding
)
echo.

echo ========================================
echo   TESTING API GATEWAY (TRAEFIK)
echo ========================================
echo.

:: Test services through Traefik
echo Testing Users Service through Traefik...
curl -s http://localhost/api/users/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Users Service accessible via API Gateway
) else (
    echo [FAIL] Users Service not accessible via API Gateway
)
echo.

echo Testing Products Service through Traefik...
curl -s http://localhost/api/products/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Products Service accessible via API Gateway
) else (
    echo [FAIL] Products Service not accessible via API Gateway
)
echo.

echo Testing Stock Service through Traefik...
curl -s http://localhost/api/stock/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Stock Service accessible via API Gateway
) else (
    echo [FAIL] Stock Service not accessible via API Gateway
)
echo.

echo Testing Suppliers Service through Traefik...
curl -s http://localhost/api/suppliers/health >nul 2>&1
if %errorLevel% equ 0 (
    echo [PASS] Suppliers Service accessible via API Gateway
) else (
    echo [FAIL] Suppliers Service not accessible via API Gateway
)
echo.

echo ========================================
echo   TESTING SERVICE DISCOVERY
echo ========================================
echo.

:: Check Consul service registrations
echo Checking service registrations in Consul...
for /f %%i in ('curl -s http://localhost:8500/v1/catalog/services ^| findstr /i "users products stock suppliers"') do (
    echo [INFO] Services registered: %%i
)
echo.

echo ========================================
echo   TEST SUMMARY
echo ========================================
echo.
echo Infrastructure URLs:
echo   - Consul UI:   http://localhost:8500/ui
echo   - RabbitMQ UI: http://localhost:15672 (guest/guest)
echo   - Traefik UI:  http://localhost:8080/dashboard/
echo.
echo Service URLs (Direct):
echo   - Users:     http://localhost:5001/api/users/health
echo   - Products:  http://localhost:5002/api/products/health
echo   - Stock:     http://localhost:5003/api/stock/health
echo   - Suppliers: http://localhost:5004/api/suppliers/health
echo.
echo Service URLs (Via API Gateway):
echo   - Users:     http://localhost/api/users/health
echo   - Products:  http://localhost/api/products/health
echo   - Stock:     http://localhost/api/stock/health
echo   - Suppliers: http://localhost/api/suppliers/health
echo.
echo ========================================
echo.
echo Use Postman with these base URLs:
echo   Direct: http://localhost:500X/api/...
echo   Gateway: http://localhost/api/...
echo.
pause