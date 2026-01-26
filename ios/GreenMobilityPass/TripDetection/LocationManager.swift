import Foundation
import CoreLocation

/// Manager for GPS location tracking using CoreLocation
class LocationManager: NSObject {
    private let TAG = "LocationManager"

    private let locationManager = CLLocationManager()
    private var isTracking = false

    /// Callback when location is updated
    var onLocationUpdate: ((Double, Double, Double) -> Void)?

    /// Callback for GPS log events (for React Native)
    var onGpsLog: (([String: Any]) -> Void)?

    override init() {
        super.init()
        setupLocationManager()
    }

    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 10 // Update every 10 meters
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false

        // For iOS 14+
        if #available(iOS 14.0, *) {
            locationManager.showsBackgroundLocationIndicator = true
        }
    }

    // MARK: - Authorization

    /// Request location authorization
    func requestAuthorization() {
        let status = CLLocationManager.authorizationStatus()
        print("[\(TAG)] Current authorization status: \(authorizationStatusString(status))")

        switch status {
        case .notDetermined:
            print("[\(TAG)] Requesting 'Always' authorization...")
            locationManager.requestAlwaysAuthorization()
        case .authorizedWhenInUse:
            print("[\(TAG)] Have 'When In Use', requesting 'Always'...")
            locationManager.requestAlwaysAuthorization()
        case .authorizedAlways:
            print("[\(TAG)] ✅ Already have 'Always' authorization")
        case .denied, .restricted:
            print("[\(TAG)] ❌ Location access denied or restricted")
        @unknown default:
            print("[\(TAG)] ⚠️  Unknown authorization status")
        }
    }

    /// Check if location services are authorized
    var isAuthorized: Bool {
        let status = CLLocationManager.authorizationStatus()
        return status == .authorizedAlways || status == .authorizedWhenInUse
    }

    /// Check if authorized for background location
    var isAuthorizedForBackground: Bool {
        return CLLocationManager.authorizationStatus() == .authorizedAlways
    }

    // MARK: - Tracking

    /// Start GPS tracking
    func startTracking() {
        guard !isTracking else {
            print("[\(TAG)] ⚠️  Already tracking")
            return
        }

        guard isAuthorized else {
            print("[\(TAG)] ❌ Not authorized for location access")
            requestAuthorization()
            return
        }

        print("[\(TAG)] 🚀 Starting GPS tracking...")
        locationManager.startUpdatingLocation()
        isTracking = true

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "HH:mm:ss.SSS"
        let formattedTime = dateFormatter.string(from: Date())

        // Notify React Native
        onGpsLog?([
            "event": "gps_start",
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
            "formattedTime": formattedTime
        ])

        print("[\(TAG)] ✅ GPS tracking started")
    }

    /// Stop GPS tracking
    func stopTracking() {
        guard isTracking else {
            print("[\(TAG)] ⚠️  Not tracking")
            return
        }

        print("[\(TAG)] 🛑 Stopping GPS tracking...")
        locationManager.stopUpdatingLocation()
        isTracking = false

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "HH:mm:ss.SSS"
        let formattedTime = dateFormatter.string(from: Date())

        // Notify React Native
        onGpsLog?([
            "event": "gps_stop",
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
            "formattedTime": formattedTime
        ])

        print("[\(TAG)] ✅ GPS tracking stopped")
    }

    /// Check if currently tracking
    var isCurrentlyTracking: Bool {
        return isTracking
    }

    /// Get current location (one-time)
    func getCurrentLocation(completion: @escaping (CLLocation?) -> Void) {
        guard isAuthorized else {
            print("[\(TAG)] ❌ Not authorized for location access")
            completion(nil)
            return
        }

        if let location = locationManager.location {
            completion(location)
        } else {
            // Request a single location update
            locationManager.requestLocation()
            // The delegate will receive the location
            // For simplicity, we return nil here - in production, use a callback pattern
            completion(nil)
        }
    }

    // MARK: - Helpers

    private func authorizationStatusString(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "NOT_DETERMINED"
        case .restricted:
            return "RESTRICTED"
        case .denied:
            return "DENIED"
        case .authorizedAlways:
            return "AUTHORIZED_ALWAYS"
        case .authorizedWhenInUse:
            return "AUTHORIZED_WHEN_IN_USE"
        @unknown default:
            return "UNKNOWN"
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationManager: CLLocationManagerDelegate {

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }

        let latitude = location.coordinate.latitude
        let longitude = location.coordinate.longitude
        let accuracy = location.horizontalAccuracy

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "HH:mm:ss.SSS"
        let formattedTime = dateFormatter.string(from: location.timestamp)

        print("[\(TAG)] 📍 Location update:")
        print("[\(TAG)]    Lat: \(String(format: "%.6f", latitude))")
        print("[\(TAG)]    Lon: \(String(format: "%.6f", longitude))")
        print("[\(TAG)]    Accuracy: \(String(format: "%.1f", accuracy))m")
        print("[\(TAG)]    Time: \(formattedTime)")

        // Notify callback
        onLocationUpdate?(latitude, longitude, accuracy)

        // Notify React Native
        onGpsLog?([
            "event": "gps_update",
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": accuracy,
            "timestamp": Int64(location.timestamp.timeIntervalSince1970 * 1000),
            "formattedTime": formattedTime
        ])
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[\(TAG)] ❌ Location error: \(error.localizedDescription)")

        if let clError = error as? CLError {
            switch clError.code {
            case .denied:
                print("[\(TAG)]    User denied location access")
                stopTracking()
            case .locationUnknown:
                print("[\(TAG)]    Location unknown, will retry...")
            default:
                print("[\(TAG)]    CLError code: \(clError.code.rawValue)")
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        print("[\(TAG)] 🔐 Authorization changed: \(authorizationStatusString(status))")

        switch status {
        case .authorizedAlways, .authorizedWhenInUse:
            print("[\(TAG)] ✅ Location authorized")
        case .denied, .restricted:
            print("[\(TAG)] ❌ Location denied/restricted")
            if isTracking {
                stopTracking()
            }
        default:
            break
        }
    }

    func locationManagerDidPauseLocationUpdates(_ manager: CLLocationManager) {
        print("[\(TAG)] ⏸️  Location updates paused by system")
    }

    func locationManagerDidResumeLocationUpdates(_ manager: CLLocationManager) {
        print("[\(TAG)] ▶️  Location updates resumed")
    }
}
