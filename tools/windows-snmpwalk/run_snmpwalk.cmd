@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set BASE_DIR=%~dp0
set SNMPWALK=%BASE_DIR%bin\snmpwalk.exe
set OUT_DIR=%BASE_DIR%output

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

if not exist "%SNMPWALK%" (
  echo [ERROR] 未找到 %SNMPWALK%
  echo 请把 Windows 版 snmpwalk.exe 和相关 DLL 放到 bin 目录。
  echo.
  pause
  exit /b 1
)

echo ================================
echo SNMPWALK 一键采集工具
echo ================================
echo.
echo 本工具会采集三类输出：
echo  1. standard.walk.txt   标准 MIB 树 1.3.6.1.2.1
echo  2. enterprise.walk.txt 厂商私有 MIB 树 1.3.6.1.4.1
echo  3. system.walk.txt     系统信息 1.3.6.1.2.1.1
echo.

set /p TARGET=请输入设备 IP：
if "%TARGET%"=="" (
  echo [ERROR] 设备 IP 不能为空
  pause
  exit /b 1
)

set /p VERSION=请输入 SNMP 版本 [2c/3]，默认 2c：
if "%VERSION%"=="" set VERSION=2c

for /f "tokens=1-4 delims=/-. " %%a in ("%date%") do set TODAY=%%a%%b%%c
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set NOW=%%a%%b%%c
set NOW=%NOW: =0%

set PREFIX=%OUT_DIR%\%TARGET%_%TODAY%_%NOW%

if /i "%VERSION%"=="3" goto SNMPV3
goto SNMPV2C

:SNMPV2C
set /p COMMUNITY=请输入 Community：
if "%COMMUNITY%"=="" (
  echo [ERROR] Community 不能为空
  pause
  exit /b 1
)

echo.
echo [1/3] 采集标准 MIB 树 1.3.6.1.2.1 ...
"%SNMPWALK%" -v2c -c "%COMMUNITY%" -On -Cc -t 5 -r 1 %TARGET% 1.3.6.1.2.1 > "%PREFIX%_standard.walk.txt"

echo [2/3] 采集厂商私有 MIB 树 1.3.6.1.4.1 ...
"%SNMPWALK%" -v2c -c "%COMMUNITY%" -On -Cc -t 5 -r 1 %TARGET% 1.3.6.1.4.1 > "%PREFIX%_enterprise.walk.txt"

echo [3/3] 采集系统信息 1.3.6.1.2.1.1 ...
"%SNMPWALK%" -v2c -c "%COMMUNITY%" -On -Cc -t 5 -r 1 %TARGET% 1.3.6.1.2.1.1 > "%PREFIX%_system.walk.txt"

goto DONE

:SNMPV3
set /p USER=请输入 SNMPv3 用户名：
if "%USER%"=="" (
  echo [ERROR] SNMPv3 用户名不能为空
  pause
  exit /b 1
)

set /p AUTH_PROTO=认证协议 [MD5/SHA]，默认 SHA：
if "%AUTH_PROTO%"=="" set AUTH_PROTO=SHA

set /p AUTH_PASS=认证密码：
if "%AUTH_PASS%"=="" (
  echo [ERROR] 认证密码不能为空
  pause
  exit /b 1
)

set /p PRIV_PROTO=加密协议 [DES/AES]，默认 AES：
if "%PRIV_PROTO%"=="" set PRIV_PROTO=AES

set /p PRIV_PASS=加密密码：
if "%PRIV_PASS%"=="" (
  echo [ERROR] 加密密码不能为空
  pause
  exit /b 1
)

echo.
echo [1/3] 采集标准 MIB 树 1.3.6.1.2.1 ...
"%SNMPWALK%" -v3 -l authPriv -u "%USER%" -a %AUTH_PROTO% -A "%AUTH_PASS%" -x %PRIV_PROTO% -X "%PRIV_PASS%" -On -Cc -t 5 -r 1 %TARGET% 1.3.6.1.2.1 > "%PREFIX%_standard.walk.txt"

echo [2/3] 采集厂商私有 MIB 树 1.3.6.1.4.1 ...
"%SNMPWALK%" -v3 -l authPriv -u "%USER%" -a %AUTH_PROTO% -A "%AUTH_PASS%" -x %PRIV_PROTO% -X "%PRIV_PASS%" -On -Cc -t 5 -r 1 %TARGET% 1.3.6.1.4.1 > "%PREFIX%_enterprise.walk.txt"

echo [3/3] 采集系统信息 1.3.6.1.2.1.1 ...
"%SNMPWALK%" -v3 -l authPriv -u "%USER%" -a %AUTH_PROTO% -A "%AUTH_PASS%" -x %PRIV_PROTO% -X "%PRIV_PASS%" -On -Cc -t 5 -r 1 %TARGET% 1.3.6.1.2.1.1 > "%PREFIX%_system.walk.txt"

goto DONE

:DONE
echo.
echo ================================
echo 采集完成
echo 输出目录：
echo %OUT_DIR%
echo.
echo 生成文件：
dir /b "%PREFIX%*.txt"
echo ================================
echo.
echo 请把生成的 walk.txt 文件上传到模板生成平台。
pause
