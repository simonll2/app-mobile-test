import Foundation

/// States for the trip detection state machine
enum TripState {
    case idle       // No trip in progress, waiting for activity
    case inTrip     // Trip in progress
    case ended      // Trip ended, ready to save
}

/// Detected activity types from CoreMotion
enum DetectedActivityType: String {
    case walking = "WALKING"
    case running = "RUNNING"
    case cycling = "ON_BICYCLE"
    case automotive = "IN_VEHICLE"
    case stationary = "STILL"
    case unknown = "UNKNOWN"

    /// Convert to backend transport type string
    func toTransportType() -> String {
        switch self {
        case .walking, .running:
            return "marche"
        case .cycling:
            return "velo"
        case .automotive:
            return "voiture"
        case .stationary, .unknown:
            return "marche" // Default fallback
        }
    }

    /// Get estimated speed in km/h for distance calculation
    func getEstimatedSpeedKmh() -> Double {
        switch self {
        case .walking:
            return 5.0
        case .running:
            return 10.0
        case .cycling:
            return 15.0
        case .automotive:
            return 40.0
        case .stationary, .unknown:
            return 0.0
        }
    }

    /// Check if this is a moving activity
    var isMoving: Bool {
        switch self {
        case .walking, .running, .cycling, .automotive:
            return true
        case .stationary, .unknown:
            return false
        }
    }
}

/// Data class representing a detected trip ready to be saved
struct DetectedTrip {
    let timeDeparture: Int64
    let timeArrival: Int64
    let durationMinutes: Int
    let distanceKm: Double
    let transportType: String
    let confidenceAvg: Int
    let isGpsBasedDistance: Bool
    let gpsPointsCount: Int
    let startLatitude: Double?
    let startLongitude: Double?
    let endLatitude: Double?
    let endLongitude: Double?

    init(timeDeparture: Int64,
         timeArrival: Int64,
         durationMinutes: Int,
         distanceKm: Double,
         transportType: String,
         confidenceAvg: Int = 75,
         isGpsBasedDistance: Bool = false,
         gpsPointsCount: Int = 0,
         startLatitude: Double? = nil,
         startLongitude: Double? = nil,
         endLatitude: Double? = nil,
         endLongitude: Double? = nil) {
        self.timeDeparture = timeDeparture
        self.timeArrival = timeArrival
        self.durationMinutes = durationMinutes
        self.distanceKm = distanceKm
        self.transportType = transportType
        self.confidenceAvg = confidenceAvg
        self.isGpsBasedDistance = isGpsBasedDistance
        self.gpsPointsCount = gpsPointsCount
        self.startLatitude = startLatitude
        self.startLongitude = startLongitude
        self.endLatitude = endLatitude
        self.endLongitude = endLongitude
    }
}

/// GPS point data
struct GpsPoint {
    let latitude: Double
    let longitude: Double
    let accuracy: Double
    let timestamp: Date

    init(latitude: Double, longitude: Double, accuracy: Double = 0, timestamp: Date = Date()) {
        self.latitude = latitude
        self.longitude = longitude
        self.accuracy = accuracy
        self.timestamp = timestamp
    }
}
