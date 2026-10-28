# SmartOps: Shop Pilot Guide

## The APK
- File: `docs/SmartOps-v1.0.0.apk` (a release build with the JS bundled in, so no laptop or Metro server is needed)
- Talks to the live server: `https://smartops-app.duckdns.org/api`
- Works offline. Sales are saved on the phone and sync to the server when internet returns.

## Install on the shop's Android phone
1. Send the APK over WhatsApp, Google Drive or a USB cable.
2. Tap it. Android asks to allow "Install unknown apps" for that app (WhatsApp, Files, etc.). Allow it.
3. If Play Protect warns "unrecognised app", tap **More details → Install anyway** (this happens because the app isn't on the Play Store).
4. Open SmartOps and allow **Camera** when it asks (needed for barcode scanning).

## First-time setup (team member does this with the shopkeeper)
1. Tap **Register** and enter the shop name, the owner's phone number, a password and the business type.
   - Use the shop's real details. Don't use the demo account (9999999999), because that keeps the pilot data separate.
2. Add 10–20 of the shop's fast-moving products (scan the barcode or type them in).
3. Use **Stock In** to enter the current quantities.
4. Ring up one test sale together, then check that it shows up in the dashboard under the same login.

## During the pilot
- Every sale goes through **New Order**. Credit customers go in **Khata**.
- Check **Alerts** and **Reorder** at the end of the day.
- Take screenshots or photos for the presentation: the Day Summary, the dashboard charts, and the shopkeeper using it.

## If something goes wrong
| Problem | Fix |
|---|---|
| "Network error" on login | Check the phone's internet. Server health: https://smartops-app.duckdns.org/api/health |
| Data not showing on dashboard | Open the app with internet on so it can sync. Make sure you logged in with the same phone number |
| Server down | SSH in and run `pm2 restart smartops-api` |

## Rebuilding the APK (after code changes)
Don't build inside the OneDrive folder. The path is too long for Windows, and the C++ step fails. Build from the short copy at `C:\so` instead:
1. Sync your changes there (PowerShell): `robocopy SmartOps C:\so /E /XD .cxx build .gradle .git node_modules` (also copy `node_modules` if you changed dependencies)
2. From `C:\so\android`, using Git Bash:
```bash
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" NODE_ENV=production ./gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```
Output: `C:\so\android\app\build\outputs\apk\release\app-release.apk` (about 10 minutes for a clean build)

Note: the APK is signed with the debug keystore. That's fine for sideloading, but not for the Play Store.
Install every update over the old app with the same build setup so the shop's local data is kept.
