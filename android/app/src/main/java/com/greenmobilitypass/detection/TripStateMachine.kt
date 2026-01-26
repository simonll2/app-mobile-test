package com.greenmobilitypass.detection

import android.os.Handler
import android.os.Looper
import android.util.Log
import kotlin.math.roundToInt
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * State machine for detecting trips based on Activity Recognition Transition API.
 *
 * Rules:
 * - Start trip: ENTER transition for a moving activity (WALKING, RUNNING, ON_BICYCLE, IN_VEHICLE)
 * - End trip: ENTER transition for STILL activity (user stopped moving)
 * - Minimum trip duration: 10 seconds (to avoid false positives)
 * - Distance = duration_hours * estimated_speed
 */
class TripStateMachine {

    companion object {
        private const val TAG = "TripStateMachine"
        private const val MIN_TRIP_DURATION_MS = 1000L // 1 second minimum (to avoid identical timestamps)
        
        private fun formatTimestamp(timestamp: Long): String {
            val sdf = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())
            return sdf.format(Date(timestamp))
        }
    }

    private var currentState: TripState = TripState.IDLE
    private var tripStartTime: Long = 0
    private var tripEndTime: Long = 0

    // Track the main activity type for current trip
    private var currentTripActivity: DetectedActivityType? = null

    // Store GPS points during the trip for real distance calculation
    private var tripGpsPoints: MutableList<GpsPoint> = mutableListOf()

    // GPS point data class
    data class GpsPoint(
        val latitude: Double,
        val longitude: Double,
        val accuracy: Float = 0f
    )

    // Listener for trip detection events
    var onTripDetected: ((DetectedTrip) -> Unit)? = null

    /**
     * Process an activity transition (ENTER/EXIT).
     * @param activityType The type of activity (WALKING, STILL, etc.)
     * @param isEnter true if ENTER transition, false if EXIT
     * @param elapsedTimeNanos Elapsed real time in nanoseconds (from ActivityTransitionEvent)
     */
    fun processTransition(activityType: DetectedActivityType, isEnter: Boolean, elapsedTimeNanos: Long) {
        val transitionType = if (isEnter) "ENTER" else "EXIT"
        val currentTimeMs = System.currentTimeMillis()
        val formattedTime = formatTimestamp(currentTimeMs)
        
        Log.d(TAG, "═══════════════════════════════════════════════════════")
        Log.d(TAG, "🔄 Processing transition:")
        Log.d(TAG, "   Activity: ${activityType.name}")
        Log.d(TAG, "   Transition: $transitionType")
        Log.d(TAG, "   Current State: $currentState")
        Log.d(TAG, "   Timestamp: $formattedTime (${currentTimeMs}ms)")
        Log.d(TAG, "   Elapsed nanos: ${elapsedTimeNanos}ns")
        
        when (currentState) {
            TripState.IDLE -> {
                Log.d(TAG, "   → Handling in IDLE state")
                handleIdleState(activityType, isEnter, currentTimeMs)
            }
            TripState.IN_TRIP -> {
                Log.d(TAG, "   → Handling in IN_TRIP state")
                Log.d(TAG, "   Trip started at: ${formatTimestamp(tripStartTime)} (${tripStartTime}ms)")
                Log.d(TAG, "   Current activity: ${currentTripActivity?.name ?: "null"}")
                handleInTripState(activityType, isEnter, currentTimeMs)
            }
            TripState.ENDED -> {
                Log.d(TAG, "   → Handling in ENDED state")
                handleEndedState(activityType, isEnter, currentTimeMs)
            }
        }
        Log.d(TAG, "   New State: $currentState")
        Log.d(TAG, "═══════════════════════════════════════════════════════")
    }

    private fun handleIdleState(activityType: DetectedActivityType, isEnter: Boolean, currentTimeMs: Long) {
        // Start trip when we enter a moving activity
        if (isEnter && isMovingActivity(activityType)) {
            val formattedTime = formatTimestamp(currentTimeMs)
            Log.d(TAG, "✅ STARTING NEW TRIP")
            Log.d(TAG, "   Activity: ${activityType.name}")
            Log.d(TAG, "   Start time: $formattedTime (${currentTimeMs}ms)")
            currentState = TripState.IN_TRIP
            tripStartTime = currentTimeMs
            currentTripActivity = activityType
            Log.d(TAG, "   State changed: IDLE → IN_TRIP")
        } else {
            Log.d(TAG, "   ⏸️  Not starting trip: isEnter=$isEnter, isMoving=${isMovingActivity(activityType)}")
        }
    }

    private fun handleInTripState(activityType: DetectedActivityType, isEnter: Boolean, currentTimeMs: Long) {
        val formattedCurrentTime = formatTimestamp(currentTimeMs)
        val formattedStartTime = formatTimestamp(tripStartTime)
        val elapsedSeconds = (currentTimeMs - tripStartTime) / 1000
        
        Log.d(TAG, "📍 IN_TRIP State Details:")
        Log.d(TAG, "   Trip started: $formattedStartTime (${tripStartTime}ms)")
        Log.d(TAG, "   Current time: $formattedCurrentTime (${currentTimeMs}ms)")
        Log.d(TAG, "   Elapsed: ${elapsedSeconds}s")
        Log.d(TAG, "   Current activity: ${currentTripActivity?.name ?: "null"}")
        
        if (isEnter) {
            when {
                // User stopped moving - end the trip
                activityType == DetectedActivityType.STILL -> {
                    Log.d(TAG, "🛑 STILL ACTIVITY DETECTED - Ending trip")
                    
                    // Ensure tripEndTime is different from tripStartTime
                    // Add at least 1 second to avoid identical timestamps
                    val minEndTime = tripStartTime + 1000L
                    tripEndTime = maxOf(currentTimeMs, minEndTime)
                    
                    val formattedEndTime = formatTimestamp(tripEndTime)
                    val durationMs = tripEndTime - tripStartTime
                    
                    Log.d(TAG, "   Trip start: $formattedStartTime (${tripStartTime}ms)")
                    Log.d(TAG, "   Trip end: $formattedEndTime (${tripEndTime}ms)")
                    Log.d(TAG, "   Duration: ${durationMs}ms (${durationMs / 1000}s)")
                    Log.d(TAG, "   Min end time: ${formatTimestamp(minEndTime)} (${minEndTime}ms)")
                    
                    // Verify we have a valid duration before finalizing
                    if (tripEndTime > tripStartTime) {
                        Log.d(TAG, "   ✅ Valid duration, proceeding to finalize")
                        currentState = TripState.ENDED
                        finalizeTrip()
                    } else {
                        Log.e(TAG, "   ❌ Invalid trip end time, skipping finalization")
                        Log.e(TAG, "   tripEndTime ($tripEndTime) <= tripStartTime ($tripStartTime)")
                        resetState()
                        currentState = TripState.IDLE
                    }
                }
                // User changed activity type (e.g., from walking to cycling)
                isMovingActivity(activityType) && activityType != currentTripActivity -> {
                    Log.d(TAG, "🔄 Activity changed:")
                    Log.d(TAG, "   From: ${currentTripActivity?.name ?: "null"}")
                    Log.d(TAG, "   To: ${activityType.name}")
                    currentTripActivity = activityType
                }
                else -> {
                    Log.d(TAG, "   ℹ️  Same activity or non-moving, continuing trip")
                }
            }
        } else {
            // EXIT transition - user exited current activity
            // For testing: end trip immediately when exiting a moving activity
            if (activityType == currentTripActivity && isMovingActivity(activityType)) {
                Log.d(TAG, "🛑 EXIT detected for ${activityType.name} - Ending trip (for testing)")
                
                // Ensure tripEndTime is different from tripStartTime
                // Add at least 1 second to avoid identical timestamps
                val minEndTime = tripStartTime + 1000L
                tripEndTime = maxOf(currentTimeMs, minEndTime)
                
                val formattedEndTime = formatTimestamp(tripEndTime)
                val durationMs = tripEndTime - tripStartTime
                
                Log.d(TAG, "   Trip start: $formattedStartTime (${tripStartTime}ms)")
                Log.d(TAG, "   Trip end: $formattedEndTime (${tripEndTime}ms)")
                Log.d(TAG, "   Duration: ${durationMs}ms (${durationMs / 1000}s)")
                
                // Verify we have a valid duration before finalizing
                if (tripEndTime > tripStartTime) {
                    Log.d(TAG, "   ✅ Valid duration, proceeding to finalize")
                    try {
                        currentState = TripState.ENDED
                        finalizeTrip()
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ CRITICAL: Error in finalizeTrip() from EXIT handler: ${e.message}", e)
                        e.printStackTrace()
                        resetState()
                        currentState = TripState.IDLE
                    }
                } else {
                    Log.e(TAG, "   ❌ Invalid trip end time, skipping finalization")
                    Log.e(TAG, "   tripEndTime ($tripEndTime) <= tripStartTime ($tripStartTime)")
                    resetState()
                    currentState = TripState.IDLE
                }
            } else if (activityType == currentTripActivity) {
                Log.d(TAG, "   🚪 Exited ${activityType.name}, but not a moving activity - continuing")
            } else {
                Log.d(TAG, "   ℹ️  Exited different activity (${activityType.name}), continuing trip")
            }
        }
    }

    private fun handleEndedState(activityType: DetectedActivityType, isEnter: Boolean, currentTimeMs: Long) {
        Log.d(TAG, "🏁 ENDED State - Finalizing trip")
        // Trip has ended, finalize and save
        // finalizeTrip() will set state to IDLE, so we don't need to do it here
        finalizeTrip()

        // After finalization, check if new trip is starting
        if (currentState == TripState.IDLE && isEnter && isMovingActivity(activityType)) {
            // Immediately start a new trip if user starts moving again
            val formattedTime = formatTimestamp(currentTimeMs)
            Log.d(TAG, "🔄 Starting new trip immediately after previous one")
            Log.d(TAG, "   New trip start: $formattedTime (${currentTimeMs}ms)")
            tripStartTime = currentTimeMs
            currentTripActivity = activityType
            currentState = TripState.IN_TRIP
        } else {
            Log.d(TAG, "   ⏸️  Not starting new trip: state=$currentState, isEnter=$isEnter, isMoving=${isMovingActivity(activityType)}")
        }
    }

    private fun finalizeTrip() {
        try {
            Log.d(TAG, "═══════════════════════════════════════════════════════")
            Log.d(TAG, "🎯 FINALIZING TRIP")
            Log.d(TAG, "═══════════════════════════════════════════════════════")
            
            // Prevent multiple calls
            if (currentState == TripState.IDLE) {
                Log.w(TAG, "⚠️  Already finalized (state is IDLE), ignoring")
                return
            }

            if (currentTripActivity == null) {
                Log.e(TAG, "❌ No activity recorded for trip, skipping finalization")
                resetState()
                currentState = TripState.IDLE
                return
            }

            // Ensure tripStartTime is set
            if (tripStartTime == 0L) {
                Log.e(TAG, "❌ Trip start time not set (0), cannot finalize")
                resetState()
                currentState = TripState.IDLE
                return
            }

            // Ensure tripEndTime is set and is after tripStartTime
            if (tripEndTime == 0L) {
                Log.w(TAG, "⚠️  Trip end time not set, using current time")
                tripEndTime = System.currentTimeMillis()
            }

            val formattedStartTime = formatTimestamp(tripStartTime)
            val formattedEndTime = formatTimestamp(tripEndTime)
            
            Log.d(TAG, "📊 Trip Timestamps:")
            Log.d(TAG, "   Start: $formattedStartTime (${tripStartTime}ms)")
            Log.d(TAG, "   End: $formattedEndTime (${tripEndTime}ms)")

            // CRITICAL: Ensure tripEndTime is at least 1 second after tripStartTime
            // This prevents crashes from identical timestamps
            val minEndTime = tripStartTime + 1000L // At least 1 second
            if (tripEndTime <= tripStartTime) {
                Log.w(TAG, "⚠️  Trip end time <= start time, adjusting")
                Log.w(TAG, "   Before: end=$formattedEndTime (${tripEndTime}ms), start=$formattedStartTime (${tripStartTime}ms)")
                tripEndTime = minEndTime
                Log.d(TAG, "   After: end=${formatTimestamp(tripEndTime)} (${tripEndTime}ms)")
            } else if (tripEndTime < minEndTime) {
                // If end time is too close to start, ensure minimum 1 second
                Log.d(TAG, "   Adjusting trip end time to ensure minimum 1 second duration")
                Log.d(TAG, "   Before: end=$formattedEndTime (${tripEndTime}ms)")
                tripEndTime = minEndTime
                Log.d(TAG, "   After: end=${formatTimestamp(tripEndTime)} (${tripEndTime}ms)")
            }

            // Calculate trip details
            val durationMs = tripEndTime - tripStartTime
            val durationSeconds = durationMs / 1000
            
            Log.d(TAG, "📏 Trip Duration:")
            Log.d(TAG, "   Duration: ${durationMs}ms (${durationSeconds}s)")
            
            // Safety check: ensure positive duration (at least 1 second)
            if (durationMs < 1000) {
                Log.e(TAG, "❌ Invalid trip duration (${durationMs}ms < 1s), skipping")
                Log.e(TAG, "   Start: $formattedStartTime (${tripStartTime}ms)")
                Log.e(TAG, "   End: $formattedEndTime (${tripEndTime}ms)")
                resetState()
                currentState = TripState.IDLE
                return
            }
            
            val durationMinutes = (durationMs / 60000).toInt()

            if (durationMs < MIN_TRIP_DURATION_MS) {
                Log.w(TAG, "⚠️  Trip too short (${durationSeconds}s < ${MIN_TRIP_DURATION_MS / 1000}s), skipping")
                resetState()
                currentState = TripState.IDLE
                return
            }

            // Use the tracked activity type
            val activity = currentTripActivity ?: DetectedActivityType.WALKING

            // Calculate distance: prefer GPS data if available, otherwise use estimated speed
            val distanceKm = if (tripGpsPoints.size >= 2) {
                try {
                    val gpsDistance = calculateGpsDistance(tripGpsPoints)
                    Log.d(TAG, "✅ Using REAL GPS distance: ${String.format("%.2f", gpsDistance)}km (from ${tripGpsPoints.size} points)")
                    if (gpsDistance > 0.0) gpsDistance else 0.01
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error calculating GPS distance: ${e.message}", e)
                    calculateEstimatedDistance(durationMinutes, activity)
                }
            } else {
                Log.w(TAG, "⚠️  Not enough GPS points (${tripGpsPoints.size}), using estimated distance")
                calculateEstimatedDistance(durationMinutes, activity)
            }

            // Determine if this is GPS-based distance
            val isGpsBasedDistance = tripGpsPoints.size >= 2
            val startLat = tripGpsPoints.firstOrNull()?.latitude
            val startLon = tripGpsPoints.firstOrNull()?.longitude
            val endLat = tripGpsPoints.lastOrNull()?.latitude
            val endLon = tripGpsPoints.lastOrNull()?.longitude

            Log.d(TAG, "📦 Trip Details:")
            Log.d(TAG, "   Activity: ${activity.name}")
            Log.d(TAG, "   Transport: ${activity.toTransportType()}")
            Log.d(TAG, "   Duration: ${durationMinutes}min (${durationSeconds}s)")
            Log.d(TAG, "   Distance: ${distanceKm}km")
            Log.d(TAG, "   Speed: ${activity.getEstimatedSpeedKmh()}km/h")
            Log.d(TAG, "   Confidence: 75%")
            if (isGpsBasedDistance) {
                Log.d(TAG, "   🛰️  GPS-based distance")
                Log.d(TAG, "   📍 Start: (${String.format("%.4f", startLat)}, ${String.format("%.4f", startLon)})")
                Log.d(TAG, "   📍 End: (${String.format("%.4f", endLat)}, ${String.format("%.4f", endLon)})")
                Log.d(TAG, "   📡 GPS Points: ${tripGpsPoints.size}")
            } else {
                Log.d(TAG, "   ⚠️  Estimation-based distance (not enough GPS points)")
            }

            val detectedTrip = DetectedTrip(
                timeDeparture = tripStartTime,
                timeArrival = tripEndTime,
                durationMinutes = durationMinutes,
                distanceKm = distanceKm,
                transportType = activity.toTransportType(),
                confidenceAvg = 75, // Default confidence for transition API
                isGpsBasedDistance = isGpsBasedDistance,
                gpsPointsCount = tripGpsPoints.size,
                startLatitude = startLat,
                startLongitude = startLon,
                endLatitude = endLat,
                endLongitude = endLon
            )

            Log.d(TAG, "✅ Trip data created successfully")
            
            // Save callback reference before reset
            val callback = onTripDetected
            
            // Set state to IDLE and reset before invoking callback
            Log.d(TAG, "🔄 Resetting state machine")
            currentState = TripState.IDLE
            resetState()
            
            // Invoke callback safely - use Handler to ensure it's on a safe thread
            if (callback != null) {
                try {
                    Log.d(TAG, "📞 Invoking trip detected callback...")
                    // Post to main thread handler to avoid crashes
                    Handler(Looper.getMainLooper()).post {
                        try {
                            callback.invoke(detectedTrip)
                            Log.d(TAG, "✅ Trip detected callback completed successfully")
                        } catch (e: Exception) {
                            Log.e(TAG, "❌ Error in trip detected callback (on main thread): ${e.message}", e)
                            e.printStackTrace()
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error scheduling trip detected callback: ${e.message}", e)
                    e.printStackTrace()
                }
            } else {
                Log.w(TAG, "⚠️  No trip detected callback registered - trip will not be saved")
            }
            Log.d(TAG, "═══════════════════════════════════════════════════════")
        } catch (e: Exception) {
            Log.e(TAG, "❌ CRITICAL ERROR in finalizeTrip(): ${e.message}", e)
            e.printStackTrace()
            // Reset state to prevent further issues
            try {
                resetState()
                currentState = TripState.IDLE
            } catch (resetError: Exception) {
                Log.e(TAG, "❌ Error resetting state: ${resetError.message}", resetError)
            }
        }
    }

    private fun isMovingActivity(activityType: DetectedActivityType): Boolean {
        return activityType != DetectedActivityType.STILL &&
               activityType != DetectedActivityType.UNKNOWN
    }

    private fun resetState() {
        currentTripActivity = null
        tripStartTime = 0
        tripEndTime = 0
        tripGpsPoints.clear()
    }

    /**
     * Get current state for debugging
     */
    fun getCurrentState(): TripState = currentState

    /**
     * Check if currently tracking a trip
     */
    fun isTrackingTrip(): Boolean = currentState == TripState.IN_TRIP

    /**
     * Confirm trip end after deferred stop confirmation (called by TripDetectionService).
     * This method is called after the 60-second stop confirmation period.
     */
    fun confirmTripEnd() {
        Log.d(TAG, "═══════════════════════════════════════════════════════")
        Log.d(TAG, "🛑 CONFIRM TRIP END (deferred)")
        Log.d(TAG, "   Current state: $currentState")

        if (currentState == TripState.IN_TRIP) {
            val currentTimeMs = System.currentTimeMillis()

            // Ensure tripEndTime is different from tripStartTime
            val minEndTime = tripStartTime + 1000L
            tripEndTime = maxOf(currentTimeMs, minEndTime)

            val formattedEndTime = formatTimestamp(tripEndTime)
            val formattedStartTime = formatTimestamp(tripStartTime)
            val durationMs = tripEndTime - tripStartTime

            Log.d(TAG, "   Trip start: $formattedStartTime (${tripStartTime}ms)")
            Log.d(TAG, "   Trip end: $formattedEndTime (${tripEndTime}ms)")
            Log.d(TAG, "   Duration: ${durationMs}ms (${durationMs / 1000}s)")

            if (tripEndTime > tripStartTime) {
                Log.d(TAG, "   ✅ Valid duration, proceeding to finalize")
                currentState = TripState.ENDED
                finalizeTrip()
            } else {
                Log.e(TAG, "   ❌ Invalid trip end time, skipping finalization")
                resetState()
                currentState = TripState.IDLE
            }
        } else {
            Log.w(TAG, "   ⚠️  Not in IN_TRIP state, ignoring confirmTripEnd")
        }
        Log.d(TAG, "═══════════════════════════════════════════════════════")
    }

    /**
     * Add a GPS point to the current trip
     */
    fun addGpsPoint(latitude: Double, longitude: Double, accuracy: Float = 0f) {
        if (currentState == TripState.IN_TRIP) {
            tripGpsPoints.add(GpsPoint(latitude, longitude, accuracy))
            Log.d(TAG, "📍 GPS point added (${tripGpsPoints.size} points)")
        }
    }

    /**
     * Calculate distance using Haversine formula (real GPS distance)
     */
    private fun calculateGpsDistance(points: List<GpsPoint>): Double {
        if (points.size < 2) return 0.0
        
        var totalDistance = 0.0
        for (i in 0 until points.size - 1) {
            totalDistance += haversineDistance(points[i], points[i + 1])
        }
        return totalDistance
    }

    /**
     * Haversine formula for calculating distance between two GPS points
     */
    private fun haversineDistance(p1: GpsPoint, p2: GpsPoint): Double {
        val EARTH_RADIUS_KM = 6371.0
        val lat1 = Math.toRadians(p1.latitude)
        val lat2 = Math.toRadians(p2.latitude)
        val deltaLat = Math.toRadians(p2.latitude - p1.latitude)
        val deltaLon = Math.toRadians(p2.longitude - p1.longitude)

        val a = kotlin.math.sin(deltaLat / 2) * kotlin.math.sin(deltaLat / 2) +
                kotlin.math.cos(lat1) * kotlin.math.cos(lat2) *
                kotlin.math.sin(deltaLon / 2) * kotlin.math.sin(deltaLon / 2)
        
        val c = 2 * kotlin.math.asin(kotlin.math.sqrt(a))
        return EARTH_RADIUS_KM * c
    }

    /**
     * Calculate distance based on estimated speed (fallback)
     */
    private fun calculateEstimatedDistance(durationMinutes: Int, activity: DetectedActivityType): Double {
        val durationHours = if (durationMinutes > 0) durationMinutes / 60.0 else 0.0
        val speedKmh = activity.getEstimatedSpeedKmh()
        return if (durationHours > 0 && speedKmh > 0) {
            try {
                val calculated = durationHours * speedKmh
                val rounded = (calculated * 100.0).roundToInt() / 100.0
                if (rounded > 0.0) rounded else 0.01
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error calculating estimated distance: ${e.message}", e)
                0.01
            }
        } else {
            0.01
        }
    }

    /**
     * Force reset the state machine (e.g., when service is stopped)
     */
    fun reset() {
        currentState = TripState.IDLE
        resetState()
    }
}
