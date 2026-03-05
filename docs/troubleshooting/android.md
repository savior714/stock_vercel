# Android Build and Capacitor Troubleshooting

### Build Failure (Plugin com.android.internal.application not found)

**Symptoms:**
Running `npm run cap:build:apk` or `gradlew assembleDebug` from the CLI results in the following error:
```
Plugin [id: 'com.android.internal.application', version: '8.13.0', apply: false] was not found in any of the following sources:
```

**Cause:**
An non-existent or unstable Android Gradle Plugin (AGP) version is specified in the Capacitor template's `build.gradle`.

**Resolution:**
Modify the AGP version in `android/build.gradle` to a stable version (e.g., `8.2.1`).

---

### Non-ASCII Path Build Failure

**Symptoms:**
```
Your project path contains non-ASCII characters. This will most likely cause the build to fail on Windows.
```

**Resolution:**
Bypass the path check by adding the following option to `android/gradle.properties`:
```properties
android.overridePathCheck=true
```

---

### Android Studio Internal Error (IllegalStateException on EDT)

**Symptoms:**
Build fails with `java.lang.IllegalStateException: This method is forbidden on EDT...`.

**Cause:**
Gradle daemon conflict. Stop all daemons and restart Android Studio:
```bash
./gradlew --stop
```

---

### Installation Failure (INSTALL_BASELINE_PROFILE_FAILED)

**Symptoms:**
Build succeeds, but app installation fails due to path issues.

**Cause:**
Copy the APK file to a path without Korean characters (e.g., `C:\project\app.apk`) and then use `adb install` or drag and drop onto the emulator screen.

---

### IDE Build Path Missing (java.lang.Object not found)

**Symptoms:**
VS Code Java extension misidentifies Android project files inside `node_modules`:
```
The project was not built since its build path is incomplete. Cannot find the class file for java.lang.Object.
```

**Resolution:**
Exclude `node_modules` from the Java build path in `.vscode/settings.json`:
```json
"java.import.gradle.enabled": false,
"java.import.exclusions": [
  "**/node_modules/**"
],
"java.configuration.updateBuildConfiguration": "automatic"
```
After changing settings, run `Ctrl+Shift+P` > `Java: Clean Java Language Server Workspace`.

---

### Gradle Version Mismatch (Minimum supported Gradle version is 8.13)

**Symptoms:**
Build fails with:
```
Failed to apply plugin 'com.android.internal.version-check'.
Minimum supported Gradle version is 8.13. Current version is 8.9.
```

**Cause:**
The Android Gradle Plugin (AGP) version requires a newer Gradle version, but the project's Gradle Wrapper is set to an older version (e.g., 8.9).

**Resolution:**
Update `distributionUrl` in `android/gradle/wrapper/gradle-wrapper.properties` to 8.13 or higher:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-bin.zip
```

**Additional Action (Ghost Version):**
If the CLI confirms 8.13 but the IDE persists with the 8.9 error:
1. Run `Java: Clean Java Language Server Workspace` in VS Code.
2. Delete `.gradle/` and `node_modules/` folders and reinstall (`npm ci`).
3. Run `gradlew clean` and restart VS Code.

---

### Corrupted Wrapper (Wrapper.GradleWrapperMain not found)

**Symptoms:**
`gradlew` execution fails with `Wrapper.GradleWrapperMain` class not found error.

**Cause:**
The `gradle/wrapper/gradle-wrapper.jar` file is corrupted or incorrectly handled as a Large File (LFS).

**Resolution:**
1. Delete jar and properties files in `gradle/wrapper/`.
2. Create a valid `gradle-wrapper.properties` (8.13).
3. Attempt to regenerate using `gradlew wrapper --gradle-version 8.13` (manual download may be required if failure persists).
