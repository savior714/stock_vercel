# Android 빌드 및 Capacitor 트러블슈팅

### 빌드 실패 (Plugin com.android.internal.application not found)

**증상:**
CLI에서 `npm run cap:build:apk` 또는 `gradlew assembleDebug` 실행 시 다음과 같은 에러 발생:
```
Plugin [id: 'com.android.internal.application', version: '8.13.0', apply: false] was not found in any of the following sources:
```

**원인:**
Capacitor 템플릿의 `build.gradle`에 존재하지 않거나 불안정한 Android Gradle Plugin (AGP) 버전이 지정됨.

**해결 방법:**
`android/build.gradle`의 AGP 버전을 안정적인 버전(예: `8.2.1`)으로 수정합니다.

### 한글 경로 빌드 실패 (non-ASCII characters)

**증상:**
```
Your project path contains non-ASCII characters. This will most likely cause the build to fail on Windows.
```

**해결 방법:**
`android/gradle.properties`에 다음 옵션을 추가하여 경로 체크를 우회합니다:
```properties
android.overridePathCheck=true
```

### Android Studio 내부 오류 (IllegalStateException on EDT)

**증상:**
빌드 시 `java.lang.IllegalStateException: This method is forbidden on EDT...` 에러 발생.

**원인:**
Gradle 데몬 충돌 문제로, 다음 명령어로 데몬을 전부 종료 후 Android Studio를 재시작합니다:
```bash
./gradlew --stop
```

### 설치 실패 (INSTALL_BASELINE_PROFILE_FAILED)

**증상:**
빌드는 되지만 앱 설치 시 경로 문제로 실패함.

**원인:**
APK 파일을 한글이 없는 경로(예: `C:\project\app.apk`)로 복사한 뒤 `adb install` 하거나, 에뮬레이터 화면으로 드래그 앤 드롭하여 설치합니다.

### IDE 빌드 경로 누락 (java.lang.Object not found)

**증상:**
VS Code Java 확장이 `node_modules` 내부의 안드로이드 프로젝트 파일을 잘못 인식하여 발생하는 에러:
```
The project was not built since its build path is incomplete. Cannot find the class file for java.lang.Object.
```

**해결 방법:**
`.vscode/settings.json`에 다음 설정을 추가하여 `node_modules`를 Java 빌드 경로에서 제외합니다:
```json
"java.import.gradle.enabled": false,
"java.import.exclusions": [
  "**/node_modules/**"
],
"java.configuration.updateBuildConfiguration": "automatic"
```
설정 변경 후 `Ctrl+Shift+P` > `Java: Clean Java Language Server Workspace`를 실행합니다.

### Gradle 버전 불일치 (Minimum supported Gradle version is 8.13)

**증상:**
빌드 시 다음과 같은 에러 발생:
```
Failed to apply plugin 'com.android.internal.version-check'.
Minimum supported Gradle version is 8.13. Current version is 8.9.
```

**원인:**
사용 중인 Android Gradle Plugin (AGP) 버전이 최신 Gradle 버전을 요구하지만, 프로젝트의 Gradle Wrapper가 구버전(8.9 등)으로 설정되어 있음.

**해결 방법:**
`android/gradle/wrapper/gradle-wrapper.properties` 파일의 `distributionUrl`을 8.13 이상으로 변경합니다:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-bin.zip
```
