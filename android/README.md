# OmniChat Android Companion

This module is the native Android side of OmniChat.

## What it provides

- Android WebView shell for the OmniChat UI.
- JavaScript bridge: `window.AndroidBridge`.
- User-enabled AccessibilityService for reading the active UI and performing approved UI actions.
- Android app launching through package names.
- Back/Home/Recents, tap, click, type, swipe and screen-tree operations.
- Keeps the Netlify web build separate from native device capabilities.

## Important Android behavior

AccessibilityService is controlled by Android and must be explicitly enabled by the user in Android Settings. OmniChat does not silently enable it.

The web UI can run on Netlify as a normal Vite SPA. The installed Android app loads the same web UI inside a native WebView and exposes the device bridge to that UI.

Set `OMNI_WEB_URL` in `android/app/build.gradle.kts` to the deployed OmniChat URL before making a production APK.

## Build

From the repository root:

```bash
gradle -p android assembleDebug
```

The APK will be under:

`android/app/build/outputs/apk/debug/app-debug.apk`

## Architecture

User voice/text
-> Omni Gemini planner
-> Android function tool
-> window.AndroidBridge (inside APK)
-> OmniAccessibilityService
-> Android UI
-> verified screen state

Use Android intents for app-to-app actions when an app exposes the required capability; use AccessibilityService only for user-enabled UI interaction that is appropriate for the device's accessibility framework.
