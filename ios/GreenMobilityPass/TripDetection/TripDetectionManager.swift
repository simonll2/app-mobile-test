import Foundation
import CoreMotion
import CoreLocation

/// Main manager for trip detection - coordinates all components
class TripDetectionManager {
    private let TAG = "TripDetectionManager"

    /// Singleton instance
    static let shared = TripDetectionManager()

    // Components
    private let stateMachine = TripStateMachine()
    private let motionActivityManager = MotionActivityManager()
    private let locationManager = LocationManager()
    private let journeyStore = LocalJourneyStore.shared

    // State
    private var isRunning = false
    private var serviceStartTime: Int64 = 0

    // Debug mode
    var debugMode = false

    // Callbacks for React Native
    var onTripDetected: ((LocalJourney) -> Void)?
    var onTransitionDetected: ((String, String) -> Void)?
    var onGpsLog: (([String: Any]) -> Void)?
    var onDetectionStateChanged: (([String: Any]) -> Void)?

    private init() {
        setupCallbacks()
    }

    private func setupCallbacks() {
        // State machine callback - when trip is detected
        stateMachine.onTripDetected = { [weak self] trip in
            self?.saveTrip(trip)
        }

        // Motion activity callback - when activity changes
        motionActivityManager.onActivityTransition = { [weak self] activityType, isEnter in
            guard let self = self else { return }

            let currentTimeMs = Int64(Date().timeIntervalSince1970 * 1000)
            let timeSinceStart = currentTimeMs - self.serviceStartTime

            // Ignore STILL ENTER transitions if service just started (like Android)
            if isEnter && activityType == .stationary && timeSinceStart < 5000 {
                print("[\(self.TAG)] ⏭️  Ignoring STATIONARY transition (too soon after service start)")
                return
            }

            // Notify React Native about the transition
            let transitionType = isEnter ? "ENTER" : "EXIT"
            print("[\(self.TAG)] 📡 Activity transition: \(activityType.rawValue) -> \(transitionType)")
            self.onTransitionDetected?(activityType.rawValue, transitionType)

            // Manage GPS tracking based on activity
            if isEnter && activityType.isMoving {
                self.locationManager.startTracking()
            } else if isEnter && activityType == .stationary {
                self.locationManager.stopTracking()
            }

            // Forward to state machine
            self.stateMachine.processTransition(activityType: activityType, isEnter: isEnter)
        }

        // Location callback - when GPS updates
        locationManager.onLocationUpdate = { [weak self] latitude, longitude, accuracy in
            self?.stateMachine.addGpsPoint(latitude: latitude, longitude: longitude, accuracy: accuracy)
        }

        // GPS log callback - forward to React Native
        locationManager.onGpsLog = { [weak self] logData in
            self?.onGpsLog?(logData)
        }
    }

    // MARK: - Public Methods

    /// Start trip detection
    func startDetection() -> Bool {
        guard !isRunning else {
            print("[\(TAG)] ⚠️  Detection already running")
            return true
        }

        print("[\(TAG)] 🚀 Starting trip detection...")
        serviceStartTime = Int64(Date().timeIntervalSince1970 * 1000)

        // Request necessary authorizations
        locationManager.requestAuthorization()

        // Start motion activity monitoring
        motionActivityManager.startMonitoring()

        isRunning = true
        print("[\(TAG)] ✅ Trip detection started")

        // Notify state change
        onDetectionStateChanged?(["isRunning": true])

        // Persist preference
        UserDefaults.standard.set(true, forKey: "tripDetectionEnabled")

        return true
    }

    /// Stop trip detection
    func stopDetection() {
        guard isRunning else {
            print("[\(TAG)] ⚠️  Detection not running")
            return
        }

        print("[\(TAG)] 🛑 Stopping trip detection...")

        // Stop components
        motionActivityManager.stopMonitoring()
        locationManager.stopTracking()
        stateMachine.reset()

        isRunning = false
        print("[\(TAG)] ✅ Trip detection stopped")

        // Notify state change
        onDetectionStateChanged?(["isRunning": false])

        // Persist preference
        UserDefaults.standard.set(false, forKey: "tripDetectionEnabled")
    }

    /// Check if detection is running
    func isDetectionRunning() -> Bool {
        return isRunning
    }

    /// Get current detection state
    func getCurrentState() -> String {
        switch stateMachine.getCurrentState() {
        case .idle:
            return "IDLE"
        case .inTrip:
            return "IN_TRIP"
        case .ended:
            return "ENDED"
        }
    }

    /// Check if currently tracking a trip
    func isTrackingTrip() -> Bool {
        return stateMachine.isTrackingTrip()
    }

    // MARK: - Journey Management

    /// Get all pending journeys
    func getPendingJourneys() -> [LocalJourney] {
        return journeyStore.getPendingJourneys()
    }

    /// Get journey by ID
    func getJourney(id: Int64) -> LocalJourney? {
        return journeyStore.getJourney(id: id)
    }

    /// Update a journey
    func updateJourney(id: Int64, transportType: String?, distanceKm: Double?, placeDeparture: String?, placeArrival: String?) {
        guard var journey = journeyStore.getJourney(id: id) else {
            print("[\(TAG)] ❌ Journey not found: \(id)")
            return
        }

        if let transportType = transportType {
            journey.detectedTransportType = transportType
        }
        if let distanceKm = distanceKm {
            journey.distanceKm = distanceKm
        }
        if let placeDeparture = placeDeparture {
            journey.placeDeparture = placeDeparture
        }
        if let placeArrival = placeArrival {
            journey.placeArrival = placeArrival
        }

        journeyStore.updateJourney(journey)
    }

    /// Delete a journey
    func deleteJourney(id: Int64) {
        journeyStore.deleteJourney(id: id)
    }

    /// Mark journey as sent
    func markJourneySent(id: Int64) {
        journeyStore.markSent(id: id)
    }

    /// Get pending journey count
    func getPendingCount() -> Int {
        return journeyStore.getPendingCount()
    }

    // MARK: - Permissions

    /// Check all required permissions
    func checkPermissions() -> [String: Bool] {
        let motionAvailable = CMMotionActivityManager.isActivityAvailable()
        let locationAuthorized = locationManager.isAuthorized
        let backgroundAuthorized = locationManager.isAuthorizedForBackground

        return [
            "activityRecognition": motionAvailable,
            "location": locationAuthorized,
            "backgroundLocation": backgroundAuthorized,
            "allGranted": motionAvailable && locationAuthorized
        ]
    }

    /// Request permissions
    func requestPermissions() {
        locationManager.requestAuthorization()
        // Note: CoreMotion permissions are requested automatically when starting activity updates
    }

    // MARK: - Debug/Simulation

    /// Set debug mode
    func setDebugMode(_ enabled: Bool) {
        debugMode = enabled
        print("[\(TAG)] Debug mode: \(enabled)")
        onDetectionStateChanged?(["debugMode": enabled])
    }

    /// Simulate a trip (for testing)
    func simulateTrip() {
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let tenMinutesMs: Int64 = 10 * 60 * 1000

        let journey = LocalJourney(
            timeDeparture: now - tenMinutesMs,
            timeArrival: now,
            durationMinutes: 10,
            distanceKm: 0.8,
            detectedTransportType: "marche",
            confidenceAvg: 80,
            placeDeparture: "DEBUG: Simulated",
            placeArrival: "DEBUG: Simulated"
        )

        let id = journeyStore.insertJourney(journey)
        var savedJourney = journey
        savedJourney.id = id

        print("[\(TAG)] 🎭 Simulated journey inserted with id=\(id)")

        // Notify React Native
        onTripDetected?(savedJourney)
    }

    // MARK: - Private Methods

    private func saveTrip(_ trip: DetectedTrip) {
        print("[\(TAG)] 💾 Saving trip...")

        // Determine place names based on GPS availability
        let placeDeparture: String
        let placeArrival: String

        if trip.isGpsBasedDistance, let startLat = trip.startLatitude, let startLon = trip.startLongitude {
            placeDeparture = "GPS: (\(String(format: "%.4f", startLat)), \(String(format: "%.4f", startLon)))"
        } else {
            placeDeparture = "Auto-detected"
        }

        if trip.isGpsBasedDistance, let endLat = trip.endLatitude, let endLon = trip.endLongitude {
            placeArrival = "GPS: (\(String(format: "%.4f", endLat)), \(String(format: "%.4f", endLon)))"
        } else {
            placeArrival = "Unknown"
        }

        let journey = LocalJourney(
            timeDeparture: trip.timeDeparture,
            timeArrival: trip.timeArrival,
            durationMinutes: trip.durationMinutes,
            distanceKm: trip.distanceKm,
            detectedTransportType: trip.transportType,
            confidenceAvg: trip.confidenceAvg,
            placeDeparture: placeDeparture,
            placeArrival: placeArrival,
            isGpsBasedDistance: trip.isGpsBasedDistance,
            gpsPointsCount: trip.gpsPointsCount,
            startLatitude: trip.startLatitude,
            startLongitude: trip.startLongitude,
            endLatitude: trip.endLatitude,
            endLongitude: trip.endLongitude
        )

        let id = journeyStore.insertJourney(journey)
        var savedJourney = journey
        savedJourney.id = id

        print("[\(TAG)] ✅ Trip saved with id=\(id)")

        // Notify React Native
        DispatchQueue.main.async { [weak self] in
            self?.onTripDetected?(savedJourney)
        }
    }

    /// Auto-start detection if it was enabled before app termination
    func autoStartIfNeeded() {
        let wasEnabled = UserDefaults.standard.bool(forKey: "tripDetectionEnabled")
        if wasEnabled {
            print("[\(TAG)] 🔄 Auto-starting detection (was enabled before)")
            _ = startDetection()
        }
    }
}
