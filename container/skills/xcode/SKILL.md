---
name: xcode
description: Build, test, and manage iOS/macOS Xcode projects from the CLI. Use when creating Xcode projects (xcodeproj/xcworkspace), building with xcodebuild, running tests, managing simulators (xcrun simctl), generating projects from spec (XcodeGen), code signing, or troubleshooting build failures. Triggers for "build the app", "run tests", "create Xcode project", "iOS build", "simulator", "xcodebuild", "archive", "entitlements", "provisioning profile", or any Swift/iOS/macOS project build task.
---

# Xcode CLI Skill

Build, test, and manage iOS/macOS projects without opening Xcode GUI.

## Environment

- **Xcode:** 26.2 (Swift 6.2.3)
- **Available simulators:** iOS 18.0 (iPhone 16 Pro, SE 3rd gen, iPad variants)
- **Platform:** macOS arm64 (Apple Silicon)
- **XcodeGen:** Not installed — use `brew install xcodegen` if needed
- **HealthKit note:** No simulator data support — real device required for HealthKit testing

## Quick Reference

### Project Creation

#### Option A: XcodeGen (preferred for agent workflows)

Generate `.xcodeproj` from a YAML spec — avoids `.pbxproj` merge conflicts.

```bash
# Install if needed
brew install xcodegen

# Create project.yml
cat > project.yml << 'EOF'
name: MyApp
options:
  bundleIdPrefix: com.example
  deploymentTarget:
    iOS: "16.0"
targets:
  MyApp:
    type: application
    platform: iOS
    sources: [Sources]
    settings:
      SWIFT_VERSION: "6.0"
      INFOPLIST_FILE: Sources/Info.plist
    entitlements:
      path: Sources/MyApp.entitlements
  MyAppTests:
    type: bundle.unit-test
    platform: iOS
    sources: [Tests]
    dependencies:
      - target: MyApp
EOF

xcodegen generate
```

#### Option B: Swift Package (for library/CLI projects)

```bash
swift package init --type executable --name MyTool
swift build
swift test
```

#### Option C: Manual xcodeproj

Only when XcodeGen isn't available. Agent writes Swift files, then uses `xcodebuild` with `-create-xcodeproj` or creates the project structure manually.

### Building

```bash
# List available schemes
xcodebuild -list

# Build for simulator
xcodebuild build \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -configuration Debug \
  | tail -20

# Build for device (requires signing)
xcodebuild build \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -destination 'generic/platform=iOS' \
  -configuration Release \
  DEVELOPMENT_TEAM=XXXXXXXXXX

# Workspace builds (CocoaPods/SPM)
xcodebuild build \
  -workspace MyApp.xcworkspace \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro'

# Clean build
xcodebuild clean build -project MyApp.xcodeproj -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro'
```

**Tip:** Pipe through `xcbeautify` or `xcpretty` if installed for readable output. Otherwise use `| tail -30` to trim noise.

### Testing

```bash
# Run all tests
xcodebuild test \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -resultBundlePath TestResults.xcresult

# Run specific test class
xcodebuild test \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -only-testing:MyAppTests/SyncServiceTests

# Run specific test method
xcodebuild test \
  -only-testing:MyAppTests/SyncServiceTests/testWriteJSON

# Test without building (if already built)
xcodebuild test-without-building \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro'

# Check test results
xcrun xcresulttool get --format json --path TestResults.xcresult | head -50
```

### Simulator Management

```bash
# List available simulators
xcrun simctl list devices available

# Boot a simulator
xcrun simctl boot "iPhone 16 Pro"

# Shutdown
xcrun simctl shutdown "iPhone 16 Pro"

# Install app on running simulator
xcrun simctl install booted ./build/Debug-iphonesimulator/MyApp.app

# Launch app
xcrun simctl launch booted com.example.MyApp

# Take screenshot
xcrun simctl io booted screenshot screenshot.png

# Record video
xcrun simctl io booted recordVideo output.mov

# Reset simulator (wipe all data)
xcrun simctl erase "iPhone 16 Pro"

# Open URL in simulator
xcrun simctl openurl booted "myapp://deep-link"
```

### Archiving & Export

```bash
# Create archive
xcodebuild archive \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -archivePath build/MyApp.xcarchive \
  -destination 'generic/platform=iOS' \
  DEVELOPMENT_TEAM=XXXXXXXXXX

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/MyApp.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist
```

### Code Signing & Entitlements

```bash
# List signing identities
security find-identity -v -p codesigning

# List provisioning profiles
ls ~/Library/MobileDevice/Provisioning\ Profiles/

# Decode a provisioning profile
security cms -D -i ~/Library/MobileDevice/Provisioning\ Profiles/xxxx.mobileprovision

# Check entitlements of built app
codesign -d --entitlements - build/Debug-iphonesimulator/MyApp.app

# Common entitlements file (.entitlements)
cat > MyApp.entitlements << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
    <key>com.apple.developer.icloud-container-identifiers</key>
    <array>
        <string>iCloud.$(CFBundleIdentifier)</string>
    </array>
    <key>com.apple.developer.icloud-services</key>
    <array>
        <string>CloudDocuments</string>
    </array>
</dict>
</plist>
EOF
```

### Swift Compilation Checks

```bash
# Type-check without full build (faster feedback)
swift -typecheck Sources/**/*.swift

# Dump AST for a file
swift -dump-ast Sources/MyFile.swift

# Check Swift version
swift --version
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "No such module" | Check target dependencies and `SWIFT_INCLUDE_PATHS` |
| "Signing requires a development team" | Add `DEVELOPMENT_TEAM=XXXXX` or set in Xcode |
| "Could not find a destination" | Run `xcrun simctl list devices available` and use exact name |
| "Build input file not found" | Source file not added to target — check `project.yml` sources |
| xcodebuild hangs | Add `-quiet` flag or check for UI prompts (license agreement) |
| Simulator won't boot | `xcrun simctl shutdown all && xcrun simctl erase all` |

## Agent Workflow Pattern

For coding agents building iOS apps:

1. **Create project spec** (`project.yml` for XcodeGen)
2. **Write Swift source files** under `Sources/`
3. **Generate project**: `xcodegen generate`
4. **Build to verify**: `xcodebuild build -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 16 Pro' | tail -20`
5. **Write tests** under `Tests/`
6. **Run tests**: `xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 16 Pro'`
7. **Iterate** on build errors — compiler output tells you exactly what's wrong

Key: always verify builds compile after writing code. Swift's type system catches most issues at compile time.
