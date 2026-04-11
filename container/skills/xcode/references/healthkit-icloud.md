# HealthKit + iCloud Drive Reference

## HealthKit Basics

### Authorization

```swift
import HealthKit

let healthStore = HKHealthStore()

// Check availability
guard HKHealthStore.isHealthDataAvailable() else {
    // Not available (iPad, Mac Catalyst, Simulator without data)
    return
}

// Request authorization
let readTypes: Set<HKObjectType> = [
    HKQuantityType(.bodyMass),
    HKQuantityType(.bloodPressureSystolic),
    HKQuantityType(.bloodPressureDiastolic),
    HKQuantityType(.restingHeartRate),
    HKQuantityType(.stepCount),
    HKQuantityType(.activeEnergyBurned),
    HKQuantityType(.appleExerciseTime),
]
let sleepType = HKCategoryType(.sleepAnalysis)
let allRead = readTypes.union([sleepType])

try await healthStore.requestAuthorization(toShare: [], read: allRead)
```

### Querying Data

```swift
// Latest sample (e.g., weight)
func latestSample(type: HKQuantityType) async throws -> HKQuantitySample? {
    let descriptor = HKSampleQueryDescriptor(
        predicates: [.quantitySample(type: type)],
        sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
        limit: 1
    )
    let results = try await descriptor.result(for: healthStore)
    return results.first
}

// Statistics for a date range (sum, avg)
func dailySteps(start: Date, end: Date) async throws -> Double {
    let type = HKQuantityType(.stepCount)
    let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
    let descriptor = HKStatisticsQueryDescriptor(
        predicate: .quantitySample(type: type, predicate: predicate),
        options: .cumulativeSum
    )
    let result = try await descriptor.result(for: healthStore)
    return result?.sumQuantity()?.doubleValue(for: .count()) ?? 0
}

// Statistics collection (daily aggregates)
func dailyAggregates(type: HKQuantityType, days: Int, options: HKStatisticsOptions) async throws -> [HKStatistics] {
    let calendar = Calendar.current
    let end = calendar.startOfDay(for: Date())
    let start = calendar.date(byAdding: .day, value: -days, to: end)!
    
    let query = HKStatisticsCollectionQueryDescriptor(
        predicate: .quantitySample(type: type),
        options: options,
        anchorDate: end,
        intervalComponents: DateComponents(day: 1)
    )
    let collection = try await query.result(for: healthStore)
    var results: [HKStatistics] = []
    collection.enumerateStatistics(from: start, to: end) { stats, _ in
        results.append(stats)
    }
    return results
}
```

### Sleep Analysis

```swift
func sleepData(for date: Date) async throws -> TimeInterval {
    let calendar = Calendar.current
    let start = calendar.date(byAdding: .hour, value: -12, to: calendar.startOfDay(for: date))!
    let end = calendar.date(byAdding: .hour, value: 12, to: calendar.startOfDay(for: date))!
    
    let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
    let descriptor = HKSampleQueryDescriptor(
        predicates: [.categorySample(type: HKCategoryType(.sleepAnalysis), predicate: predicate)],
        sortDescriptors: [SortDescriptor(\.startDate)]
    )
    let samples = try await descriptor.result(for: healthStore)
    
    // Filter for asleep stages (not inBed)
    let asleepValues: Set<Int> = [
        HKCategoryValueSleepAnalysis.asleepCore.rawValue,
        HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
        HKCategoryValueSleepAnalysis.asleepREM.rawValue,
        HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
    ]
    
    return samples
        .filter { asleepValues.contains($0.value) }
        .reduce(0) { $0 + $1.endDate.timeIntervalSince($1.startDate) }
}
```

## iCloud Drive (FileManager Ubiquity)

### Setup

1. Enable iCloud in Xcode → Signing & Capabilities → iCloud → Check "iCloud Documents"
2. Add container identifier (e.g., `iCloud.com.example.HealthSync`)
3. Entitlements file needs:
   - `com.apple.developer.icloud-container-identifiers`
   - `com.apple.developer.icloud-services` = `CloudDocuments`

### Writing Files

```swift
class ICloudSyncService {
    let containerID = "iCloud.com.example.HealthSync"
    
    var ubiquityURL: URL? {
        FileManager.default.url(forUbiquityContainerIdentifier: containerID)?
            .appendingPathComponent("Documents")
    }
    
    func writeJSON<T: Encodable>(_ data: T, filename: String) throws {
        guard let baseURL = ubiquityURL else {
            throw SyncError.iCloudUnavailable
        }
        
        // Ensure directory exists
        try FileManager.default.createDirectory(at: baseURL, withIntermediateDirectories: true)
        
        let fileURL = baseURL.appendingPathComponent(filename)
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let jsonData = try encoder.encode(data)
        try jsonData.write(to: fileURL, options: .atomic)
    }
    
    func writeDaily(_ metrics: DailyMetrics) throws {
        let dateStr = ISO8601DateFormatter.string(from: metrics.date, timeZone: .current, formatOptions: [.withFullDate])
        try writeJSON(metrics, filename: "daily/\(dateStr).json")
    }
}
```

### Reading on Mac

Files sync to:
```
~/Library/Mobile Documents/iCloud~com~example~HealthSync/Documents/
```

Wait for iCloud sync — files may take seconds to minutes to appear.

```bash
# Check if files are present
ls ~/Library/Mobile\ Documents/iCloud~com~example~HealthSync/Documents/daily/

# Read latest
cat ~/Library/Mobile\ Documents/iCloud~com~example~HealthSync/Documents/daily/2026-03-30.json | jq .
```

### Background Sync

```swift
import BackgroundTasks

// Register in AppDelegate or App init
BGTaskScheduler.shared.register(
    forTaskWithIdentifier: "com.example.healthsync.refresh",
    using: nil
) { task in
    handleBackgroundRefresh(task as! BGProcessingTask)
}

// Schedule
func scheduleBackgroundSync() {
    let request = BGProcessingTaskRequest(identifier: "com.example.healthsync.refresh")
    request.requiresNetworkConnectivity = true  // iCloud needs network
    request.earliestBeginDate = Date(timeIntervalSinceNow: 4 * 3600)  // 4 hours
    try? BGTaskScheduler.shared.submit(request)
}
```

**Important:** iOS does not guarantee background task execution timing. The app should also sync on foreground launch.

## XcodeGen project.yml for HealthKit + iCloud

```yaml
name: HealthSync
options:
  bundleIdPrefix: com.example
  deploymentTarget:
    iOS: "16.0"
  xcodeVersion: "26.2"

settings:
  base:
    SWIFT_VERSION: "6.0"
    TARGETED_DEVICE_FAMILY: "1"  # iPhone only

targets:
  HealthSync:
    type: application
    platform: iOS
    sources:
      - Sources
    entitlements:
      path: Sources/HealthSync.entitlements
    info:
      path: Sources/Info.plist
      properties:
        NSHealthShareUsageDescription: "Health Sync reads your health data to sync it to iCloud Drive for analysis on your Mac."
        UIBackgroundModes:
          - processing
        BGTaskSchedulerPermittedIdentifiers:
          - com.example.healthsync.refresh
    settings:
      DEVELOPMENT_TEAM: ""  # Set your team ID
      PRODUCT_BUNDLE_IDENTIFIER: com.example.HealthSync

  HealthSyncTests:
    type: bundle.unit-test
    platform: iOS
    sources:
      - Tests
    dependencies:
      - target: HealthSync
    settings:
      DEVELOPMENT_TEAM: ""
```

## Testing Strategy

| Layer | Approach |
|-------|----------|
| HealthKit queries | Protocol-based mocks — inject mock `HealthStore` conforming to protocol |
| JSON encoding | Unit tests with known data — verify output structure |
| iCloud writes | Protocol-based mock `FileWriter` — test serialization without actual iCloud |
| Background tasks | Manual testing on device — no simulator support |
| Integration | Real device with Health app data |
