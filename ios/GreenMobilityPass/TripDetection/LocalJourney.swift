import Foundation

/// Constants for journey status
struct JourneyStatus {
    static let pending = "PENDING"
    static let sent = "SENT"
}

/// Entity representing a locally detected journey
struct LocalJourney: Codable, Identifiable {
    var id: Int64
    let timeDeparture: Int64
    let timeArrival: Int64
    let durationMinutes: Int
    var distanceKm: Double
    var detectedTransportType: String
    let confidenceAvg: Int
    var placeDeparture: String
    var placeArrival: String
    let isGpsBasedDistance: Bool
    let gpsPointsCount: Int
    let startLatitude: Double?
    let startLongitude: Double?
    let endLatitude: Double?
    let endLongitude: Double?
    var status: String
    let createdAt: Int64
    var updatedAt: Int64

    init(id: Int64 = 0,
         timeDeparture: Int64,
         timeArrival: Int64,
         durationMinutes: Int,
         distanceKm: Double,
         detectedTransportType: String,
         confidenceAvg: Int,
         placeDeparture: String = "Auto-detected",
         placeArrival: String = "Unknown",
         isGpsBasedDistance: Bool = false,
         gpsPointsCount: Int = 0,
         startLatitude: Double? = nil,
         startLongitude: Double? = nil,
         endLatitude: Double? = nil,
         endLongitude: Double? = nil,
         status: String = JourneyStatus.pending,
         createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
         updatedAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        self.id = id
        self.timeDeparture = timeDeparture
        self.timeArrival = timeArrival
        self.durationMinutes = durationMinutes
        self.distanceKm = distanceKm
        self.detectedTransportType = detectedTransportType
        self.confidenceAvg = confidenceAvg
        self.placeDeparture = placeDeparture
        self.placeArrival = placeArrival
        self.isGpsBasedDistance = isGpsBasedDistance
        self.gpsPointsCount = gpsPointsCount
        self.startLatitude = startLatitude
        self.startLongitude = startLongitude
        self.endLatitude = endLatitude
        self.endLongitude = endLongitude
        self.status = status
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Convert to dictionary for React Native
    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "id": id,
            "timeDeparture": timeDeparture,
            "timeArrival": timeArrival,
            "durationMinutes": durationMinutes,
            "distanceKm": distanceKm,
            "detectedTransportType": detectedTransportType,
            "confidenceAvg": confidenceAvg,
            "placeDeparture": placeDeparture,
            "placeArrival": placeArrival,
            "isGpsBasedDistance": isGpsBasedDistance,
            "gpsPointsCount": gpsPointsCount,
            "status": status,
            "createdAt": createdAt,
            "updatedAt": updatedAt
        ]

        if let lat = startLatitude { dict["startLatitude"] = lat }
        if let lon = startLongitude { dict["startLongitude"] = lon }
        if let lat = endLatitude { dict["endLatitude"] = lat }
        if let lon = endLongitude { dict["endLongitude"] = lon }

        return dict
    }
}

/// Local storage manager for journeys using UserDefaults
class LocalJourneyStore {
    static let shared = LocalJourneyStore()

    private let storageKey = "local_journeys"
    private let idCounterKey = "journey_id_counter"
    private let userDefaults = UserDefaults.standard

    private init() {}

    /// Get next available ID
    private func getNextId() -> Int64 {
        let currentId = userDefaults.integer(forKey: idCounterKey)
        let nextId = Int64(currentId + 1)
        userDefaults.set(Int(nextId), forKey: idCounterKey)
        return nextId
    }

    /// Get all journeys
    func getAllJourneys() -> [LocalJourney] {
        guard let data = userDefaults.data(forKey: storageKey),
              let journeys = try? JSONDecoder().decode([LocalJourney].self, from: data) else {
            return []
        }
        return journeys
    }

    /// Get journeys by status
    func getJourneysByStatus(_ status: String) -> [LocalJourney] {
        return getAllJourneys().filter { $0.status == status }
    }

    /// Get pending journeys
    func getPendingJourneys() -> [LocalJourney] {
        return getJourneysByStatus(JourneyStatus.pending)
    }

    /// Get journey by ID
    func getJourney(id: Int64) -> LocalJourney? {
        return getAllJourneys().first { $0.id == id }
    }

    /// Insert a new journey
    @discardableResult
    func insertJourney(_ journey: LocalJourney) -> Int64 {
        var journeys = getAllJourneys()
        var newJourney = journey
        newJourney.id = getNextId()
        journeys.append(newJourney)
        saveJourneys(journeys)
        print("[LocalJourneyStore] Journey inserted with id: \(newJourney.id)")
        return newJourney.id
    }

    /// Update an existing journey
    func updateJourney(_ journey: LocalJourney) {
        var journeys = getAllJourneys()
        if let index = journeys.firstIndex(where: { $0.id == journey.id }) {
            var updatedJourney = journey
            updatedJourney.updatedAt = Int64(Date().timeIntervalSince1970 * 1000)
            journeys[index] = updatedJourney
            saveJourneys(journeys)
            print("[LocalJourneyStore] Journey updated: \(journey.id)")
        }
    }

    /// Delete a journey
    func deleteJourney(id: Int64) {
        var journeys = getAllJourneys()
        journeys.removeAll { $0.id == id }
        saveJourneys(journeys)
        print("[LocalJourneyStore] Journey deleted: \(id)")
    }

    /// Mark journey as sent
    func markSent(id: Int64) {
        if var journey = getJourney(id: id) {
            journey.status = JourneyStatus.sent
            updateJourney(journey)
            print("[LocalJourneyStore] Journey marked as sent: \(id)")
        }
    }

    /// Get count of pending journeys
    func getPendingCount() -> Int {
        return getPendingJourneys().count
    }

    /// Save journeys to UserDefaults
    private func saveJourneys(_ journeys: [LocalJourney]) {
        if let data = try? JSONEncoder().encode(journeys) {
            userDefaults.set(data, forKey: storageKey)
        }
    }

    /// Clear all journeys (for testing)
    func clearAll() {
        userDefaults.removeObject(forKey: storageKey)
        print("[LocalJourneyStore] All journeys cleared")
    }
}
