@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

rem ============================================================
rem  Ebru & Furkan - Siteyi tek tikla yayinlama
rem  1) Degisiklikleri commit eder
rem  2) GitHub'a gonderir (furkan-bitik-dev/ebru-anniversary)
rem  3) Cloudflare, GitHub'daki her push'u kendisi yayinlar:
rem     script bu yayinin bitmesini bekler ve sonucu gosterir
rem  4) Canli siteye ulasilabildigini kontrol eder
rem  Kullanim:  yayinla.cmd            (otomatik mesaj)
rem             yayinla.cmd "mesaj"    (kendi commit mesajin)
rem ============================================================

set "SITE=https://ebrulovefurkan.furkannbitikk.workers.dev"
set "REPO=https://github.com/furkan-bitik-dev/ebru-anniversary.git"
set "API=repos/furkan-bitik-dev/ebru-anniversary"
set "PANEL=https://dash.cloudflare.com/278df1b48a847be3ccf6f57c7491bfad/workers/services/view/ebrulovefurkan/production/deployments"
set "S_COMMIT=-"
set "S_PUSH=-"
set "S_CF=-"
set "S_CHECK=-"
set "SONUC=0"
set "YENI=1"
set "GH=1"

echo.
echo ============================================
echo   Ebru ^& Furkan - Siteyi Canliya Alma
echo ============================================
echo.

rem --- On kontroller ---------------------------------------------
where git >nul 2>&1 || (echo [X] Git bulunamadi. Git kurulu mu? & set "S_COMMIT=HATA - git yok" & set "SONUC=1" & goto :ozet)
where gh >nul 2>&1 || set "GH=0"

rem GitHub girisi icin GitHub CLI'nin (yeni hesap) kullanilmasini sagla
if "%GH%"=="1" gh auth setup-git >nul 2>&1

rem Uzak depo adresi eski hesabi gosteriyorsa yenisiyle degistir
set "CUR="
for /f "delims=" %%u in ('git remote get-url origin 2^>nul') do set "CUR=%%u"
if "%CUR%"=="" (
    git remote add origin %REPO%
) else if /i not "%CUR%"=="%REPO%" (
    echo [*] GitHub adresi guncelleniyor: %REPO%
    git remote set-url origin %REPO%
)

rem Yarim kalmis bir git isleminden kalan kilit dosyasini temizle
if exist ".git\index.lock" (
    echo [*] Eski git kilit dosyasi bulundu, siliniyor...
    del /f /q ".git\index.lock" >nul 2>&1
)

rem --- Commit mesaji ---------------------------------------------
set "MSG=%~1"
if not "%MSG%"=="" goto :commit
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set "NOW=%%i"
set "MSG=Site guncellendi - %NOW%"

rem --- 1) Commit -------------------------------------------------
:commit
echo [1/4] Degisiklikler Git'e kaydediliyor...
git add -A
if errorlevel 1 (set "S_COMMIT=HATA - git add" & set "SONUC=1" & goto :push)
git diff --cached --quiet
if not errorlevel 1 (
    echo       Yeni degisiklik yok.
    set "S_COMMIT=OK - yeni degisiklik yoktu"
    goto :push
)
git commit -q -m "%MSG%"
if errorlevel 1 (set "S_COMMIT=HATA - commit yapilamadi" & set "SONUC=1" & goto :push)
set "S_COMMIT=OK - %MSG%"
echo       Kaydedildi: %MSG%

rem --- 2) GitHub push --------------------------------------------
:push
echo.
echo [2/4] GitHub'a gonderiliyor...
git fetch -q origin >nul 2>&1
set "AHEAD=1"
for /f %%a in ('git rev-list --count origin/main..HEAD 2^>nul') do set "AHEAD=%%a"
if "%AHEAD%"=="0" (
    echo       GitHub zaten guncel, gonderilecek yeni bir sey yok.
    set "S_PUSH=OK - zaten guncel"
    set "YENI=0"
    goto :cloudflare
)

git push -u origin main
if not errorlevel 1 (set "S_PUSH=OK" & goto :cloudflare)

echo       Ilk deneme basarisiz. GitHub'daki degisiklikler cekilip tekrar deneniyor...
git pull --rebase --autostash origin main
if errorlevel 1 (
    git rebase --abort >nul 2>&1
    set "S_PUSH=HATA - GitHub ile cakisma var, elle cozulmeli"
    set "SONUC=1"
    goto :ozet
)
git push -u origin main
if errorlevel 1 (
    set "S_PUSH=HATA - gonderilemedi. 'gh auth login' ile furkan-bitik-dev hesabina giris yapip tekrar dene"
    set "SONUC=1"
    goto :ozet
)
set "S_PUSH=OK - uzaktaki degisikliklerle birlestirildi"

rem --- 3) Cloudflare yayini --------------------------------------
:cloudflare
echo.
if "%YENI%"=="0" (
    set "S_CF=OK - yeni yayin gerekmedi"
    goto :kontrol
)
if "%GH%"=="0" (
    echo [3/4] Cloudflare yayini baslatildi. GitHub CLI olmadigi icin sonucu beklenemiyor.
    echo       Durumu buradan takip edebilirsin: %PANEL%
    set "S_CF=BASLATILDI - sonucu panelden kontrol et"
    goto :kontrol
)
echo [3/4] Cloudflare yayini bekleniyor (genelde 1 dakika surer)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$sha=(git rev-parse HEAD).Trim(); $u='%API%/commits/'+$sha+'/check-runs';" ^
  "for($i=1; $i -le 72; $i++){ try{ $j=(gh api $u 2>$null | Out-String | ConvertFrom-Json); $cr=$j.check_runs | Where-Object { $_.app.slug -like 'cloudflare*' } | Select-Object -First 1;" ^
  "if($cr -and $cr.status -eq 'completed'){ if($cr.conclusion -eq 'success'){ exit 0 } else { exit 3 } } } catch {}; Start-Sleep -Seconds 5 };" ^
  "exit 2"
set "CF=%errorlevel%"
if "%CF%"=="0" set "S_CF=OK - Cloudflare yeni surumu yayinladi"
if "%CF%"=="3" (set "S_CF=HATA - Cloudflare derlemesi basarisiz, ayrinti: %PANEL%" & set "SONUC=1")
if "%CF%"=="2" (set "S_CF=UYARI - 6 dakikada sonuc gelmedi, panelden kontrol et: %PANEL%" & set "SONUC=1")

rem --- 4) Canli site kontrolu ------------------------------------
:kontrol
echo.
echo [4/4] Canli site kontrol ediliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "for($i=1; $i -le 5; $i++){ try{ $r=Invoke-WebRequest -Uri ('%SITE%/?nocache='+[guid]::NewGuid()) -UseBasicParsing -TimeoutSec 20 -Headers @{'Cache-Control'='no-cache'}; if($r.StatusCode -eq 200){ exit 0 } } catch {}; Start-Sleep -Seconds 3 }; exit 1"
if errorlevel 1 (set "S_CHECK=UYARI - siteye ulasilamadi" & set "SONUC=1") else (set "S_CHECK=OK - site acik")

rem --- Ozet ------------------------------------------------------
:ozet
echo.
echo ============================================
echo   SONUC
echo ============================================
echo   Commit     : %S_COMMIT%
echo   GitHub     : %S_PUSH%
echo   Cloudflare : %S_CF%
echo   Canli site : %S_CHECK%
echo --------------------------------------------
if "%SONUC%"=="0" (
    powershell -NoProfile -Command "Write-Host '  TEBRIKLER! Site basariyla guncellendi.' -ForegroundColor Green"
    echo   %SITE%
) else (
    powershell -NoProfile -Command "Write-Host '  !! Bazi adimlar basarisiz oldu, yukaridaki mesajlara bakin.' -ForegroundColor Red"
)
echo ============================================
echo.
pause
exit /b %SONUC%
