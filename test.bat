@echo off
setlocal

echo ======================================================================
echo VALICORA — Automated Test Suite Execution
echo ======================================================================
echo.

python -m pytest tests/ -v
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FAIL] Automated tests failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [PASS] All automated validation and arithmetic tests passed!
exit /b 0
