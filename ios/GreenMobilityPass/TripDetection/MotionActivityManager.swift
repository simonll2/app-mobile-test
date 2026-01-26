import Foundation
import CoreMotion

/// Manager for activity recognition using CoreMotion
class MotionActivityManager {
    private let TAG = "MotionActivityManager"

    private let activityManager = CMMotionActivityManager()
    private var isMonitoring = false
    private var lastActivityType: DetectedActivityType = .unknown

    /// Callback when activity transition is detected
    var onActivityTransition: ((DetectedActivityType, Bool) -> Void)?

    /// Check if activity recognition is available
    static var isActivityAvailable: Bool {
        return CMMotionActivityManager.isActivityAvailable()
    }

    /// Start monitoring activity
    func startMonitoring() {
        guard CMMotionActivityManager.isActivityAvailable() else {
            print("[\(TAG)] ❌ Activity recognition not available on this device")
            return
        }

        guard !isMonitoring else {
            print("[\(TAG)] ⚠️  Already monitoring")
            return
        }

        print("[\(TAG)] 🚀 Starting activity monitoring...")

        activityManager.startActivityUpdates(to: .main) { [weak self] activity in
            guard let self = self, let activity = activity else { return }
            self.processActivity(activity)
        }

        isMonitoring = true
        print("[\(TAG)] ✅ Activity monitoring started")
    }

    /// Stop monitoring activity
    func stopMonitoring() {
        guard isMonitoring else {
            print("[\(TAG)] ⚠️  Not monitoring")
            return
        }

        activityManager.stopActivityUpdates()
        isMonitoring = false
        lastActivityType = .unknown
        print("[\(TAG)] ✅ Activity monitoring stopped")
    }

    /// Process activity update from CoreMotion
    private func processActivity(_ activity: CMMotionActivity) {
        let newActivityType = detectActivityType(from: activity)
        let confidence = activity.confidence.rawValue

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "HH:mm:ss.SSS"
        let formattedTime = dateFormatter.string(from: activity.startDate)

        print("[\(TAG)] ═══════════════════════════════════════════════════════")
        print("[\(TAG)] 🔔 Activity Update Received")
        print("[\(TAG)]    Timestamp: \(formattedTime)")
        print("[\(TAG)]    Stationary: \(activity.stationary)")
        print("[\(TAG)]    Walking: \(activity.walking)")
        print("[\(TAG)]    Running: \(activity.running)")
        print("[\(TAG)]    Cycling: \(activity.cycling)")
        print("[\(TAG)]    Automotive: \(activity.automotive)")
        print("[\(TAG)]    Unknown: \(activity.unknown)")
        print("[\(TAG)]    Confidence: \(confidenceString(activity.confidence))")
        print("[\(TAG)]    Detected Type: \(newActivityType.rawValue)")
        print("[\(TAG)]    Previous Type: \(lastActivityType.rawValue)")

        // Only process if activity changed and confidence is at least medium
        if newActivityType != lastActivityType && activity.confidence != .low {
            print("[\(TAG)] 📡 Activity changed: \(lastActivityType.rawValue) → \(newActivityType.rawValue)")

            // Send EXIT for previous activity if it was moving
            if lastActivityType.isMoving {
                print("[\(TAG)]    Sending EXIT for \(lastActivityType.rawValue)")
                onActivityTransition?(lastActivityType, false)
            }

            // Send ENTER for new activity
            print("[\(TAG)]    Sending ENTER for \(newActivityType.rawValue)")
            onActivityTransition?(newActivityType, true)

            lastActivityType = newActivityType
        } else {
            print("[\(TAG)]    ⏸️  No significant change (same activity or low confidence)")
        }

        print("[\(TAG)] ═══════════════════════════════════════════════════════")
    }

    /// Detect activity type from CMMotionActivity
    private func detectActivityType(from activity: CMMotionActivity) -> DetectedActivityType {
        // Priority order: automotive > cycling > running > walking > stationary > unknown
        if activity.automotive {
            return .automotive
        } else if activity.cycling {
            return .cycling
        } else if activity.running {
            return .running
        } else if activity.walking {
            return .walking
        } else if activity.stationary {
            return .stationary
        } else {
            return .unknown
        }
    }

    /// Convert confidence to string for logging
    private func confidenceString(_ confidence: CMMotionActivityConfidence) -> String {
        switch confidence {
        case .low:
            return "LOW"
        case .medium:
            return "MEDIUM"
        case .high:
            return "HIGH"
        @unknown default:
            return "UNKNOWN"
        }
    }

    /// Check if currently monitoring
    var isCurrentlyMonitoring: Bool {
        return isMonitoring
    }

    /// Get current activity type
    var currentActivityType: DetectedActivityType {
        return lastActivityType
    }

    /// Query historical activities (for debugging)
    func queryHistoricalActivities(from startDate: Date, to endDate: Date, completion: @escaping ([CMMotionActivity]?) -> Void) {
        guard CMMotionActivityManager.isActivityAvailable() else {
            completion(nil)
            return
        }

        activityManager.queryActivityStarting(from: startDate, to: endDate, to: .main) { activities, error in
            if let error = error {
                print("[\(self.TAG)] ❌ Error querying activities: \(error.localizedDescription)")
                completion(nil)
                return
            }
            completion(activities)
        }
    }
}
