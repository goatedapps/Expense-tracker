# Everyday for Android

The Android APK is an additional version of Everyday. The original web app stays at https://goatedapps.github.io/Expense-tracker/ and keeps its existing browser data.

## Install and transfer your records

1. Download the signed `Everyday-1.5.0.apk` to your Android phone.
2. Open the file. If Android asks, allow installation from the browser or file manager you used, then tap Install. Google Play publication is not needed for this personal installation.
3. In the original web app, use Settings → Back up everything to export a JSON file. Transfer that file to your Android phone.
4. Open the installed **Everyday** app, then Settings → Restore a backup, and select that JSON file. Review the confirmation before replacing the Android app's records.

Android 6.0 (API 23) or newer and a current Android System WebView are required. The APK bundles the web app's files and works without GitHub or an Internet connection. It does not automatically sync with the website; the two versions keep separate data. JSON backups move all records, budgets, categories, appearance and preferences between them. CSV exports contain transactions only.

CSV and JSON exports open Android's share sheet. Choose an available file-saving app/provider (such as Files or Drive) to keep the file, or share it to another device. Backup restore uses Android's file picker. Cancelled export/share operations do not change your records. Android Back closes an open editor, returns to Home from another tab, or exits from Home. Open ‘Add transaction’ by default remains available in Settings.

The APK is a release build, signed with a dedicated key. Signing was verified, package contents were checked, and the web UI/export bridge was tested in a browser with a simulated native bridge. It still needs a real-phone check of install, file picking and the Android share sheet.

## Keep updates compatible

Application ID: `io.goatedapps.everyday`.
Initial Android versionCode: `1`.
Version name: `1.5.0`.

Install future APK updates over the existing app with the **same application ID and signing key** and an increased `versionCode`. Do not uninstall first: uninstalling can erase the local records. Back up before updating or clearing app storage. Android cloud backup is disabled; keep JSON backups yourself.

The private signing key is supplied separately as `Everyday-Android-signing-private.zip`. Keep it and its password privately backed up. It is not in this repository or in the source ZIP. Losing it prevents signing compatible APK updates. APK signatures are not Google Play publication or Play verification.

## Build from source

Install Node.js 20+, JDK 21, Android Studio/SDK with platform Android 35 and Build Tools 34.0.0 or 35.0.0, and accept the Android SDK licences. Configure `ANDROID_HOME` and `JAVA_HOME`, or the SDK path in `android/local.properties` (do not commit machine-specific paths).

```sh
npm ci
npm run android:build
```

This prepares an explicit allowlist of web assets, synchronises Capacitor/plugins, and runs Gradle. Build output:

```text
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

Use Android Studio to produce a signed APK, or Android SDK tools:

```sh
zipalign -p -f 4 app-release-unsigned.apk everyday-aligned.apk
apksigner sign --ks /private/path/everyday-release.p12 --ks-key-alias everyday \
  --ks-pass file:/private/path/keystore-password.txt \
  --out Everyday-1.5.0.apk everyday-aligned.apk
apksigner verify --verbose Everyday-1.5.0.apk
```

Keep the key/password outside the repository. Generated `www`, bundled assets, `node_modules`, build outputs and local SDK settings are excluded from source control. The Android package includes no personal transaction backup. The web app's download handling remains active in ordinary browsers; native filesystem/share handling is used only inside the Android wrapper.
