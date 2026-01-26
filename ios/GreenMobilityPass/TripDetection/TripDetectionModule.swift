import Foundation
import React

/// React Native Native Module for trip detection
@objc(TripDetectionModule)
class TripDetectionModule: RCTEventEmitter {
    private let TAG = "TripDetectionModule"
    private let manager = TripDetectionManager.shared

    // Event names
    static let EVENT_TRIP_DETECTED = "onTripDetected"
    static let EVENT_DETECTION_STATE_CHANGED = "onDetectionStateChanged"
    static let EVENT_TRANSITION_DETECTED = "onTransitionDetected"
    static let EVENT_GPS_LOG = "onGpsLog"

    private var hasListeners = false

    override init() {
        super.init()
        setupCallbacks()
    }

    private func setupCallbacks() {
        manager.onTripDetected = { [weak self] journey in
            self?.sendTripDetectedEvent(journey)
        }

        manager.onTransitionDetected = { [weak self] activityType, transitionType in
            self?.sendTransitionEvent(activityType: activityType, transitionType: transitionType)
        }

        manager.onGpsLog = { [weak self] logData in
            self?.sendGpsLogEvent(logData)
        }

        manager.onDetectionStateChanged = { [weak self] state in
            self?.sendDetectionStateEvent(state)
        }
    }

    // MARK: - RCTEventEmitter

    override static func moduleName() -> String! {
        return "TripDetectionModule"
    }

    override func supportedEvents() -> [String]! {
        return [
            TripDetectionModule.EVENT_TRIP_DETECTED,
            TripDetectionModule.EVENT_DETECTION_STATE_CHANGED,
            TripDetectionModule.EVENT_TRANSITION_DETECTED,
            TripDetectionModule.EVENT_GPS_LOG
        ]
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    override func constantsToExport() -> [AnyHashable : Any]! {
        return [
            "EVENT_TRIP_DETECTED": TripDetectionModule.EVENT_TRIP_DETECTED,
            "EVENT_DETECTION_STATE_CHANGED": TripDetectionModule.EVENT_DETECTION_STATE_CHANGED,
            "EVENT_TRANSITION_DETECTED": TripDetectionModule.EVENT_TRANSITION_DETECTED
        ]
    }

    // MARK: - Event Sending

    private func sendTripDetectedEvent(_ journey: LocalJourney) {
        guard hasListeners else { return }
        sendEvent(withName: TripDetectionModule.EVENT_TRIP_DETECTED, body: journey.toDictionary())
    }

    private func sendTransitionEvent(activityType: String, transitionType: String) {
        guard hasListeners else { return }
        sendEvent(withName: TripDetectionModule.EVENT_TRANSITION_DETECTED, body: [
            "activityType": activityType,
            "transitionType": transitionType,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
        ])
    }

    private func sendGpsLogEvent(_ logData: [String: Any]) {
        guard hasListeners else { return }
        sendEvent(withName: TripDetectionModule.EVENT_GPS_LOG, body: logData)
    }

    private func sendDetectionStateEvent(_ state: [String: Any]) {
        guard hasListeners else { return }
        sendEvent(withName: TripDetectionModule.EVENT_DETECTION_STATE_CHANGED, body: state)
    }

    // MARK: - React Methods

    @objc
    func startDetection(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        print("[\(TAG)] startDetection called")

        // Check permissions first
        let permissions = manager.checkPermissions()
        guard permissions["allGranted"] == true else {
            print("[\(TAG)] ❌ Required permissions not granted")
            reject("PERMISSION_DENIED", "Required permissions not granted", nil)
            return
        }

        let success = manager.startDetection()
        resolve(success)
    }

    @objc
    func stopDetection(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        print("[\(TAG)] stopDetection called")
        manager.stopDetection()
        resolve(true)
    }

    @objc
    func isDetectionRunning(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(manager.isDetectionRunning())
    }

    @objc
    func getPendingJourneys(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let journeys = manager.getPendingJourneys()
        let result = journeys.map { $0.toDictionary() }
        resolve(result)
    }

    @objc
    func getJourney(_ id: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if let journey = manager.getJourney(id: Int64(id)) {
            resolve(journey.toDictionary())
        } else {
            reject("NOT_FOUND", "Journey not found", nil)
        }
    }

    @objc
    func updateLocalJourney(_ id: Double, updates: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let transportType = updates["transportType"] as? String
        let distanceKm = updates["distanceKm"] as? Double
        let placeDeparture = updates["placeDeparture"] as? String
        let placeArrival = updates["placeArrival"] as? String

        manager.updateJourney(
            id: Int64(id),
            transportType: transportType,
            distanceKm: distanceKm,
            placeDeparture: placeDeparture,
            placeArrival: placeArrival
        )
        resolve(true)
    }

    @objc
    func deleteLocalJourney(_ id: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        manager.deleteJourney(id: Int64(id))
        resolve(true)
    }

    @objc
    func markJourneySent(_ id: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        manager.markJourneySent(id: Int64(id))
        resolve(true)
    }

    @objc
    func getPendingCount(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(manager.getPendingCount())
    }

    @objc
    func checkPermissions(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let permissions = manager.checkPermissions()
        resolve(permissions)
    }

    @objc
    func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        manager.requestPermissions()
        // Return false to indicate user should check permissions again after granting
        resolve(false)
    }

    @objc
    func setDebugMode(_ enabled: Bool) {
        manager.setDebugMode(enabled)
    }

    @objc
    func simulateTrip() {
        manager.simulateTrip()
    }

    // Required for RN event emitter
    @objc
    override func addListener(_ eventName: String!) {
        super.addListener(eventName)
    }

    @objc
    override func removeListeners(_ count: Double) {
        super.removeListeners(count)
    }
}
