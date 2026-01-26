import Foundation

/// State machine for detecting trips based on activity recognition
class TripStateMachine {
    private let TAG = "TripStateMachine"
    private let MIN_TRIP_DURATION_MS: Int64 = 1000 // 1 second minimum

    private var currentState: TripState = .idle
    private var tripStartTime: Int64 = 0
    private var tripEndTime: Int64 = 0
    private var currentTripActivity: DetectedActivityType?
    private var tripGpsPoints: [GpsPoint] = []

    /// Callback when a trip is detected
    var onTripDetected: ((DetectedTrip) -> Void)?

    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss.SSS"
        return formatter
    }()

    private func formatTimestamp(_ timestamp: Int64) -> String {
        let date = Date(timeIntervalSince1970: Double(timestamp) / 1000.0)
        return dateFormatter.string(from: date)
    }

    private func currentTimeMs() -> Int64 {
        return Int64(Date().timeIntervalSince1970 * 1000)
    }

    /// Process an activity transition
    func processTransition(activityType: DetectedActivityType, isEnter: Bool) {
        let transitionType = isEnter ? "ENTER" : "EXIT"
        let currentTimeMs = self.currentTimeMs()
        let formattedTime = formatTimestamp(currentTimeMs)

        print("[\(TAG)] ═══════════════════════════════════════════════════════")
        print("[\(TAG)] Processing transition:")
        print("[\(TAG)]    Activity: \(activityType.rawValue)")
        print("[\(TAG)]    Transition: \(transitionType)")
        print("[\(TAG)]    Current State: \(currentState)")
        print("[\(TAG)]    Timestamp: \(formattedTime) (\(currentTimeMs)ms)")

        switch currentState {
        case .idle:
            print("[\(TAG)]    → Handling in IDLE state")
            handleIdleState(activityType: activityType, isEnter: isEnter, currentTimeMs: currentTimeMs)
        case .inTrip:
            print("[\(TAG)]    → Handling in IN_TRIP state")
            print("[\(TAG)]    Trip started at: \(formatTimestamp(tripStartTime)) (\(tripStartTime)ms)")
            print("[\(TAG)]    Current activity: \(currentTripActivity?.rawValue ?? "nil")")
            handleInTripState(activityType: activityType, isEnter: isEnter, currentTimeMs: currentTimeMs)
        case .ended:
            print("[\(TAG)]    → Handling in ENDED state")
            handleEndedState(activityType: activityType, isEnter: isEnter, currentTimeMs: currentTimeMs)
        }
        print("[\(TAG)]    New State: \(currentState)")
        print("[\(TAG)] ═══════════════════════════════════════════════════════")
    }

    private func handleIdleState(activityType: DetectedActivityType, isEnter: Bool, currentTimeMs: Int64) {
        // Start trip when we enter a moving activity
        if isEnter && activityType.isMoving {
            let formattedTime = formatTimestamp(currentTimeMs)
            print("[\(TAG)] ✅ STARTING NEW TRIP")
            print("[\(TAG)]    Activity: \(activityType.rawValue)")
            print("[\(TAG)]    Start time: \(formattedTime) (\(currentTimeMs)ms)")
            currentState = .inTrip
            tripStartTime = currentTimeMs
            currentTripActivity = activityType
            print("[\(TAG)]    State changed: IDLE → IN_TRIP")
        } else {
            print("[\(TAG)]    ⏸️  Not starting trip: isEnter=\(isEnter), isMoving=\(activityType.isMoving)")
        }
    }

    private func handleInTripState(activityType: DetectedActivityType, isEnter: Bool, currentTimeMs: Int64) {
        let formattedCurrentTime = formatTimestamp(currentTimeMs)
        let formattedStartTime = formatTimestamp(tripStartTime)
        let elapsedSeconds = (currentTimeMs - tripStartTime) / 1000

        print("[\(TAG)] 📍 IN_TRIP State Details:")
        print("[\(TAG)]    Trip started: \(formattedStartTime) (\(tripStartTime)ms)")
        print("[\(TAG)]    Current time: \(formattedCurrentTime) (\(currentTimeMs)ms)")
        print("[\(TAG)]    Elapsed: \(elapsedSeconds)s")
        print("[\(TAG)]    Current activity: \(currentTripActivity?.rawValue ?? "nil")")

        if isEnter {
            if activityType == .stationary {
                // User stopped moving - end the trip
                print("[\(TAG)] 🛑 STATIONARY ACTIVITY DETECTED - Ending trip")
                endTrip(currentTimeMs: currentTimeMs)
            } else if activityType.isMoving && activityType != currentTripActivity {
                // User changed activity type
                print("[\(TAG)] 🔄 Activity changed:")
                print("[\(TAG)]    From: \(currentTripActivity?.rawValue ?? "nil")")
                print("[\(TAG)]    To: \(activityType.rawValue)")
                currentTripActivity = activityType
            } else {
                print("[\(TAG)]    ℹ️  Same activity or non-moving, continuing trip")
            }
        } else {
            // EXIT transition
            if activityType == currentTripActivity && activityType.isMoving {
                print("[\(TAG)] 🛑 EXIT detected for \(activityType.rawValue) - Ending trip")
                endTrip(currentTimeMs: currentTimeMs)
            } else {
                print("[\(TAG)]    ℹ️  Exited different activity (\(activityType.rawValue)), continuing trip")
            }
        }
    }

    private func handleEndedState(activityType: DetectedActivityType, isEnter: Bool, currentTimeMs: Int64) {
        print("[\(TAG)] 🏁 ENDED State - Finalizing trip")
        finalizeTrip()

        // After finalization, check if new trip is starting
        if currentState == .idle && isEnter && activityType.isMoving {
            let formattedTime = formatTimestamp(currentTimeMs)
            print("[\(TAG)] 🔄 Starting new trip immediately after previous one")
            print("[\(TAG)]    New trip start: \(formattedTime) (\(currentTimeMs)ms)")
            tripStartTime = currentTimeMs
            currentTripActivity = activityType
            currentState = .inTrip
        }
    }

    private func endTrip(currentTimeMs: Int64) {
        let minEndTime = tripStartTime + 1000
        tripEndTime = max(currentTimeMs, minEndTime)

        let formattedEndTime = formatTimestamp(tripEndTime)
        let formattedStartTime = formatTimestamp(tripStartTime)
        let durationMs = tripEndTime - tripStartTime

        print("[\(TAG)]    Trip start: \(formattedStartTime) (\(tripStartTime)ms)")
        print("[\(TAG)]    Trip end: \(formattedEndTime) (\(tripEndTime)ms)")
        print("[\(TAG)]    Duration: \(durationMs)ms (\(durationMs / 1000)s)")

        if tripEndTime > tripStartTime {
            print("[\(TAG)]    ✅ Valid duration, proceeding to finalize")
            currentState = .ended
            finalizeTrip()
        } else {
            print("[\(TAG)]    ❌ Invalid trip end time, skipping finalization")
            resetState()
            currentState = .idle
        }
    }

    private func finalizeTrip() {
        print("[\(TAG)] ═══════════════════════════════════════════════════════")
        print("[\(TAG)] 🎯 FINALIZING TRIP")
        print("[\(TAG)] ═══════════════════════════════════════════════════════")

        // Prevent multiple calls
        guard currentState != .idle else {
            print("[\(TAG)] ⚠️  Already finalized (state is IDLE), ignoring")
            return
        }

        guard let activity = currentTripActivity else {
            print("[\(TAG)] ❌ No activity recorded for trip, skipping finalization")
            resetState()
            currentState = .idle
            return
        }

        guard tripStartTime > 0 else {
            print("[\(TAG)] ❌ Trip start time not set (0), cannot finalize")
            resetState()
            currentState = .idle
            return
        }

        if tripEndTime == 0 {
            print("[\(TAG)] ⚠️  Trip end time not set, using current time")
            tripEndTime = currentTimeMs()
        }

        // Ensure minimum duration
        let minEndTime = tripStartTime + 1000
        if tripEndTime <= tripStartTime {
            print("[\(TAG)] ⚠️  Trip end time <= start time, adjusting")
            tripEndTime = minEndTime
        }

        let durationMs = tripEndTime - tripStartTime
        let durationSeconds = durationMs / 1000

        print("[\(TAG)] 📏 Trip Duration:")
        print("[\(TAG)]    Duration: \(durationMs)ms (\(durationSeconds)s)")

        guard durationMs >= 1000 else {
            print("[\(TAG)] ❌ Invalid trip duration (\(durationMs)ms < 1s), skipping")
            resetState()
            currentState = .idle
            return
        }

        guard durationMs >= MIN_TRIP_DURATION_MS else {
            print("[\(TAG)] ⚠️  Trip too short (\(durationSeconds)s < \(MIN_TRIP_DURATION_MS / 1000)s), skipping")
            resetState()
            currentState = .idle
            return
        }

        let durationMinutes = Int(durationMs / 60000)

        // Calculate distance
        let distanceKm: Double
        let isGpsBasedDistance: Bool

        if tripGpsPoints.count >= 2 {
            let gpsDistance = calculateGpsDistance(points: tripGpsPoints)
            print("[\(TAG)] ✅ Using REAL GPS distance: \(String(format: "%.2f", gpsDistance))km (from \(tripGpsPoints.count) points)")
            distanceKm = gpsDistance > 0.0 ? gpsDistance : 0.01
            isGpsBasedDistance = true
        } else {
            print("[\(TAG)] ⚠️  Not enough GPS points (\(tripGpsPoints.count)), using estimated distance")
            distanceKm = calculateEstimatedDistance(durationMinutes: durationMinutes, activity: activity)
            isGpsBasedDistance = false
        }

        let startLat = tripGpsPoints.first?.latitude
        let startLon = tripGpsPoints.first?.longitude
        let endLat = tripGpsPoints.last?.latitude
        let endLon = tripGpsPoints.last?.longitude

        print("[\(TAG)] 📦 Trip Details:")
        print("[\(TAG)]    Activity: \(activity.rawValue)")
        print("[\(TAG)]    Transport: \(activity.toTransportType())")
        print("[\(TAG)]    Duration: \(durationMinutes)min (\(durationSeconds)s)")
        print("[\(TAG)]    Distance: \(distanceKm)km")
        print("[\(TAG)]    Confidence: 75%")

        if isGpsBasedDistance {
            print("[\(TAG)]    🛰️  GPS-based distance")
            if let lat = startLat, let lon = startLon {
                print("[\(TAG)]    📍 Start: (\(String(format: "%.4f", lat)), \(String(format: "%.4f", lon)))")
            }
            if let lat = endLat, let lon = endLon {
                print("[\(TAG)]    📍 End: (\(String(format: "%.4f", lat)), \(String(format: "%.4f", lon)))")
            }
            print("[\(TAG)]    📡 GPS Points: \(tripGpsPoints.count)")
        }

        let detectedTrip = DetectedTrip(
            timeDeparture: tripStartTime,
            timeArrival: tripEndTime,
            durationMinutes: durationMinutes,
            distanceKm: distanceKm,
            transportType: activity.toTransportType(),
            confidenceAvg: 75,
            isGpsBasedDistance: isGpsBasedDistance,
            gpsPointsCount: tripGpsPoints.count,
            startLatitude: startLat,
            startLongitude: startLon,
            endLatitude: endLat,
            endLongitude: endLon
        )

        print("[\(TAG)] ✅ Trip data created successfully")

        // Save callback reference before reset
        let callback = onTripDetected

        // Reset state
        print("[\(TAG)] 🔄 Resetting state machine")
        currentState = .idle
        resetState()

        // Invoke callback
        if let callback = callback {
            print("[\(TAG)] 📞 Invoking trip detected callback...")
            DispatchQueue.main.async {
                callback(detectedTrip)
                print("[\(self.TAG)] ✅ Trip detected callback completed successfully")
            }
        } else {
            print("[\(TAG)] ⚠️  No trip detected callback registered - trip will not be saved")
        }
        print("[\(TAG)] ═══════════════════════════════════════════════════════")
    }

    private func resetState() {
        currentTripActivity = nil
        tripStartTime = 0
        tripEndTime = 0
        tripGpsPoints.removeAll()
    }

    /// Calculate distance using Haversine formula
    private func calculateGpsDistance(points: [GpsPoint]) -> Double {
        guard points.count >= 2 else { return 0.0 }

        var totalDistance = 0.0
        for i in 0..<(points.count - 1) {
            totalDistance += haversineDistance(p1: points[i], p2: points[i + 1])
        }
        return totalDistance
    }

    /// Haversine formula for calculating distance between two GPS points
    private func haversineDistance(p1: GpsPoint, p2: GpsPoint) -> Double {
        let earthRadiusKm = 6371.0
        let lat1 = p1.latitude * .pi / 180
        let lat2 = p2.latitude * .pi / 180
        let deltaLat = (p2.latitude - p1.latitude) * .pi / 180
        let deltaLon = (p2.longitude - p1.longitude) * .pi / 180

        let a = sin(deltaLat / 2) * sin(deltaLat / 2) +
                cos(lat1) * cos(lat2) *
                sin(deltaLon / 2) * sin(deltaLon / 2)

        let c = 2 * asin(sqrt(a))
        return earthRadiusKm * c
    }

    /// Calculate distance based on estimated speed (fallback)
    private func calculateEstimatedDistance(durationMinutes: Int, activity: DetectedActivityType) -> Double {
        let durationHours = durationMinutes > 0 ? Double(durationMinutes) / 60.0 : 0.0
        let speedKmh = activity.getEstimatedSpeedKmh()

        if durationHours > 0 && speedKmh > 0 {
            let calculated = durationHours * speedKmh
            let rounded = (calculated * 100.0).rounded() / 100.0
            return rounded > 0.0 ? rounded : 0.01
        }
        return 0.01
    }

    // MARK: - Public Methods

    /// Get current state
    func getCurrentState() -> TripState {
        return currentState
    }

    /// Check if currently tracking a trip
    func isTrackingTrip() -> Bool {
        return currentState == .inTrip
    }

    /// Add a GPS point to the current trip
    func addGpsPoint(latitude: Double, longitude: Double, accuracy: Double = 0) {
        if currentState == .inTrip {
            let point = GpsPoint(latitude: latitude, longitude: longitude, accuracy: accuracy)
            tripGpsPoints.append(point)
            print("[\(TAG)] 📍 GPS point added (\(tripGpsPoints.count) points)")
        }
    }

    /// Force reset the state machine
    func reset() {
        currentState = .idle
        resetState()
    }
}
