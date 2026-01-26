package com.greenmobilitypass.detection

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityRecognitionClient
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.DetectedActivity
import com.greenmobilitypass.MainActivity
import com.greenmobilitypass.R
import com.greenmobilitypass.database.AppDatabase
import com.greenmobilitypass.database.LocalJourney
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

/**
 * Foreground Service for detecting trips in the background.
 * Uses Activity Recognition API to detect user movement and creates
 * local journey records when trips are detected.
 */
class TripDetectionService : LifecycleService() {

    companion object {
        private const val TAG = "TripDetectionService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "trip_detection_channel"

        @Volatile
        private var instance: TripDetectionService? = null

        fun getInstance(): TripDetectionService? = instance

        fun isRunning(): Boolean = instance != null
    }

    private lateinit var activityRecognitionClient: ActivityRecognitionClient
    private lateinit var pendingIntent: PendingIntent
    private lateinit var database: AppDatabase
    private val stateMachine = TripStateMachine()
    private var gpsTracker: GpsLocationTracker? = null

    // Listener for React Native events
    var onTripDetectedListener: ((LocalJourney) -> Unit)? = null
    var onTransitionDetectedListener: ((String, String) -> Unit)? = null // activityType, transitionType
    var onGpsLogListener: ((Map<String, Any>) -> Unit)? = null // For GPS logging to React Native

    // Track when service started to ignore initial STILL detection
    private var serviceStartTime: Long = 0

    override fun onCreate() {
        super.onCreate()
        instance = this

        Log.d(TAG, "Service onCreate")
        
        // Initialize service start time
        serviceStartTime = System.currentTimeMillis()

        database = AppDatabase.getInstance(applicationContext)
        activityRecognitionClient = ActivityRecognition.getClient(this)
        
        try {
            gpsTracker = GpsLocationTracker(applicationContext, stateMachine)
            Log.d(TAG, "✅ GPS tracker initialized")
        } catch (e: Exception) {
            Log.e(TAG, "⚠️  GPS tracker init failed: ${e.message}")
        }

        // Setup state machine callback
        stateMachine.onTripDetected = { trip ->
            saveTrip(trip)
        }

        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        Log.d(TAG, "Service onStartCommand")
        
        // Record service start time to ignore initial activity for a few seconds
        serviceStartTime = System.currentTimeMillis()

        // Start as foreground service
        startForegroundService()

        // Register for activity transitions (for detecting changes)
        registerActivityRecognition()
        
        // Notify that listeners should be set up (in case they weren't set up yet)
        Log.d(TAG, "Service started, listeners should be configured by TripDetectionModule")

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service onDestroy")

        // Stop GPS tracking
        try {
            gpsTracker?.stopTracking()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping GPS: ${e.message}")
        }

        // Unregister activity recognition
        unregisterActivityRecognition()

        // Reset state machine
        stateMachine.reset()

        instance = null
    }

    override fun onBind(intent: Intent): IBinder? {
        super.onBind(intent)
        return null
    }

    private fun startForegroundService() {
        val notification = createNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Trip Detection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors your trips for green mobility tracking"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Green Mobility Pass")
            .setContentText("Détection de trajets active")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun registerActivityRecognition() {
        val intent = Intent(this, ActivityRecognitionReceiver::class.java)
        pendingIntent = PendingIntent.getBroadcast(
            this,
            0,
            intent,
            PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Create transitions for activities we want to detect
        val transitions = mutableListOf<ActivityTransition>().apply {
            // Walking transitions
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.WALKING)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                .build())
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.WALKING)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
                .build())
            
            // Running transitions
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.RUNNING)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                .build())
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.RUNNING)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
                .build())
            
            // ON_FOOT transitions (often used for walking)
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.ON_FOOT)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                .build())
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.ON_FOOT)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
                .build())
            
            // Bicycle transitions
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.ON_BICYCLE)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                .build())
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.ON_BICYCLE)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
                .build())
            
            // Vehicle transitions
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.IN_VEHICLE)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                .build())
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.IN_VEHICLE)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
                .build())
            
            // STILL transitions (for trip end detection)
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.STILL)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                .build())
            add(ActivityTransition.Builder()
                .setActivityType(DetectedActivity.STILL)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
                .build())
        }

        val request = ActivityTransitionRequest(transitions)

        activityRecognitionClient
            .requestActivityTransitionUpdates(request, pendingIntent)
            .addOnSuccessListener {
                Log.d(TAG, "Activity transition recognition registered successfully")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Failed to register activity transition recognition", e)
            }
    }

    private fun unregisterActivityRecognition() {
        if (::pendingIntent.isInitialized) {
            activityRecognitionClient
                .removeActivityTransitionUpdates(pendingIntent)
                .addOnSuccessListener {
                    Log.d(TAG, "Activity transition recognition unregistered")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Failed to unregister activity transition recognition", e)
                }
        }
    }

    /**
     * Called by ActivityRecognitionReceiver when activity transition is detected
     */
    fun onActivityTransitionDetected(activityType: Int, transitionType: Int, elapsedTimeNanos: Long) {
        val currentTimeMs = System.currentTimeMillis()
        val formattedTime = java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.getDefault())
            .format(java.util.Date(currentTimeMs))
        
        Log.d(TAG, "═══════════════════════════════════════════════════════")
        Log.d(TAG, "🔔 Activity Transition Received")
        Log.d(TAG, "   Raw type: $activityType")
        Log.d(TAG, "   Raw transition: $transitionType")
        Log.d(TAG, "   Timestamp: $formattedTime (${currentTimeMs}ms)")
        Log.d(TAG, "   Elapsed nanos: ${elapsedTimeNanos}ns")

        val detectedType = DetectedActivityType.fromGoogleActivityType(activityType)
        val isEnter = transitionType == ActivityTransition.ACTIVITY_TRANSITION_ENTER
        
        Log.d(TAG, "   Detected type: ${detectedType.name}")
        Log.d(TAG, "   Transition: ${if (isEnter) "ENTER" else "EXIT"}")
        
        // Ignore STILL ENTER transitions if service just started (prevents false "Immobile → Début")
        if (isEnter && detectedType == DetectedActivityType.STILL) {
            val timeSinceStart = currentTimeMs - serviceStartTime
            val serviceStartFormatted = java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.getDefault())
                .format(java.util.Date(serviceStartTime))
            if (timeSinceStart < 5000) { // Ignore STILL for first 5 seconds
                Log.d(TAG, "⏭️  Ignoring STILL transition (too soon after service start)")
                Log.d(TAG, "   Service started: $serviceStartFormatted (${serviceStartTime}ms)")
                Log.d(TAG, "   Time since start: ${timeSinceStart}ms")
                Log.d(TAG, "═══════════════════════════════════════════════════════")
                return
            }
        }
        
        // Notify React Native about the transition (for live tracking)
        try {
            val transitionName = if (isEnter) "ENTER" else "EXIT"
            val activityName = detectedType.name
            Log.d(TAG, "📡 Notifying React Native: $activityName -> $transitionName")
            if (onTransitionDetectedListener != null) {
                Log.d(TAG, "   ✅ Listener is set, invoking...")
                onTransitionDetectedListener?.invoke(activityName, transitionName)
                Log.d(TAG, "   ✅ Listener invoked successfully")
            } else {
                Log.w(TAG, "   ⚠️  Transition listener is NULL - not configured yet!")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error notifying transition listener: ${e.message}", e)
            e.printStackTrace()
        }
        
        // Manage GPS tracking based on activity transitions
        try {
            if (isEnter && isMovingActivity(detectedType)) {
                // Starting a moving activity - start GPS tracking
                Log.d(TAG, "📍 Starting GPS tracking for moving activity")
                gpsTracker?.startTracking()
                
                // Notify React Native of GPS start
                try {
                    val gpsLogData = mapOf<String, Any>(
                        "event" to "gps_start",
                        "activity" to detectedType.name,
                        "timestamp" to currentTimeMs,
                        "formattedTime" to formattedTime
                    )
                    onGpsLogListener?.invoke(gpsLogData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error notifying GPS start: ${e.message}")
                }
            } else if ((isEnter && detectedType == DetectedActivityType.STILL) || (!isEnter && isMovingActivity(detectedType))) {
                // Stop GPS when entering STILL (trip end) or exiting a moving activity
                Log.d(TAG, "📍 Stopping GPS tracking")
                gpsTracker?.stopTracking()
                
                // Notify React Native of GPS stop
                try {
                    val gpsLogData = mapOf<String, Any>(
                        "event" to "gps_stop",
                        "activity" to detectedType.name,
                        "timestamp" to currentTimeMs,
                        "formattedTime" to formattedTime
                    )
                    onGpsLogListener?.invoke(gpsLogData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error notifying GPS stop: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "⚠️  Error managing GPS tracking: ${e.message}")
        }

        Log.d(TAG, "🔄 Forwarding to state machine...")
        stateMachine.processTransition(detectedType, isEnter, elapsedTimeNanos)
        Log.d(TAG, "═══════════════════════════════════════════════════════")
    }

    private fun isMovingActivity(activityType: DetectedActivityType): Boolean {
        return activityType != DetectedActivityType.STILL &&
               activityType != DetectedActivityType.UNKNOWN
    }

    private fun saveTrip(trip: DetectedTrip) {
        Log.d(TAG, "═══════════════════════════════════════════════════════")
        Log.d(TAG, "💾 SAVE TRIP REQUESTED")
        Log.d(TAG, "═══════════════════════════════════════════════════════")

        try {
            // Check if service is still valid
            if (instance == null) {
                Log.e(TAG, "❌ Service instance is null, cannot save trip")
                return
            }

            val formattedDeparture = java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.getDefault())
                .format(java.util.Date(trip.timeDeparture))
            val formattedArrival = java.text.SimpleDateFormat("HH:mm:ss.SSS", java.util.Locale.getDefault())
                .format(java.util.Date(trip.timeArrival))

            Log.d(TAG, "📋 Trip Data:")
            Log.d(TAG, "   Departure: $formattedDeparture (${trip.timeDeparture}ms)")
            Log.d(TAG, "   Arrival: $formattedArrival (${trip.timeArrival}ms)")
            Log.d(TAG, "   Duration: ${trip.durationMinutes}min")
            Log.d(TAG, "   Distance: ${trip.distanceKm}km")
            Log.d(TAG, "   Transport: ${trip.transportType}")
            Log.d(TAG, "   Confidence: ${trip.confidenceAvg}%")
            if (trip.isGpsBasedDistance) {
                Log.d(TAG, "   🛰️  GPS-BASED:")
                Log.d(TAG, "   📍 Départ: (${String.format("%.4f", trip.startLatitude)}, ${String.format("%.4f", trip.startLongitude)})")
                Log.d(TAG, "   📍 Arrivée: (${String.format("%.4f", trip.endLatitude)}, ${String.format("%.4f", trip.endLongitude)})")
                Log.d(TAG, "   📡 Points GPS collectés: ${trip.gpsPointsCount}")
                
                // Notify React Native of GPS stats
                try {
                    val gpsStatsData = mapOf<String, Any>(
                        "event" to "gps_stats",
                        "isGpsBased" to true,
                        "gpsPoints" to trip.gpsPointsCount,
                        "distance" to trip.distanceKm,
                        "startLat" to (trip.startLatitude ?: 0.0),
                        "startLon" to (trip.startLongitude ?: 0.0),
                        "endLat" to (trip.endLatitude ?: 0.0),
                        "endLon" to (trip.endLongitude ?: 0.0)
                    )
                    onGpsLogListener?.invoke(gpsStatsData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error notifying GPS stats: ${e.message}")
                }
            } else {
                Log.d(TAG, "   ⚠️  BASÉ SUR ESTIMATION (pas assez de points GPS)")
                Log.d(TAG, "   📡 Points GPS collectés: ${trip.gpsPointsCount}")
                
                // Notify React Native of estimation stats
                try {
                    val statsData = mapOf<String, Any>(
                        "event" to "gps_stats",
                        "isGpsBased" to false,
                        "gpsPoints" to trip.gpsPointsCount,
                        "distance" to trip.distanceKm
                    )
                    onGpsLogListener?.invoke(statsData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error notifying estimation stats: ${e.message}")
                }
            }

            Log.d(TAG, "🚀 Starting coroutine to save trip to database...")
            lifecycleScope.launch {
                try {
                    // Validate trip data before saving
                    if (trip.timeDeparture <= 0 || trip.timeArrival <= 0) {
                        Log.e(TAG, "❌ Invalid trip timestamps, cannot save")
                        Log.e(TAG, "   Departure: ${trip.timeDeparture}ms")
                        Log.e(TAG, "   Arrival: ${trip.timeArrival}ms")
                        return@launch
                    }

                    if (trip.durationMinutes <= 0) {
                        Log.e(TAG, "❌ Invalid trip duration (${trip.durationMinutes}min), cannot save")
                        return@launch
                    }

                    Log.d(TAG, "✅ Trip data validated")

                    // Determine place names based on GPS availability
                    val placeDeparture = if (trip.isGpsBasedDistance && trip.startLatitude != null && trip.startLongitude != null) {
                        "GPS: (${String.format("%.4f", trip.startLatitude)}, ${String.format("%.4f", trip.startLongitude)})"
                    } else {
                        "Auto-detected"
                    }
                    
                    val placeArrival = if (trip.isGpsBasedDistance && trip.endLatitude != null && trip.endLongitude != null) {
                        "GPS: (${String.format("%.4f", trip.endLatitude)}, ${String.format("%.4f", trip.endLongitude)})"
                    } else {
                        "Unknown"
                    }

                    val localJourney = LocalJourney(
                        timeDeparture = trip.timeDeparture,
                        timeArrival = trip.timeArrival,
                        durationMinutes = trip.durationMinutes,
                        distanceKm = trip.distanceKm,
                        detectedTransportType = trip.transportType,
                        confidenceAvg = trip.confidenceAvg,
                        placeDeparture = placeDeparture,
                        placeArrival = placeArrival,
                        isGpsBasedDistance = trip.isGpsBasedDistance,
                        gpsPointsCount = trip.gpsPointsCount,
                        startLatitude = trip.startLatitude,
                        startLongitude = trip.startLongitude,
                        endLatitude = trip.endLatitude,
                        endLongitude = trip.endLongitude
                    )

                    Log.d(TAG, "💾 Inserting into database...")

                    // Database operations must be on IO thread
                    val id = withContext(Dispatchers.IO) {
                        if (!::database.isInitialized) {
                            throw IllegalStateException("Database not initialized")
                        }
                        database.localJourneyDao().insertJourney(localJourney)
                    }

                    Log.d(TAG, "✅ Trip saved successfully with ID: $id")

                    // Notify listener (React Native) - ensure we're on main thread
                    val savedJourney = localJourney.copy(id = id)
                    withContext(Dispatchers.Main) {
                        val listener = onTripDetectedListener
                        if (listener != null) {
                            Log.d(TAG, "📡 Notifying React Native listener...")
                            listener.invoke(savedJourney)
                            Log.d(TAG, "✅ Trip detected listener notified successfully")
                        } else {
                            Log.w(TAG, "⚠️  No trip detected listener registered")
                        }
                    }

                    Log.d(TAG, "═══════════════════════════════════════════════════════")
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Failed to save trip: ${e.message}", e)
                    e.printStackTrace()
                    Log.d(TAG, "═══════════════════════════════════════════════════════")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ CRITICAL ERROR in saveTrip(): ${e.message}", e)
            e.printStackTrace()
        }
    }


    /**
     * Get current detection state for debugging
     */
    fun getCurrentState(): String = stateMachine.getCurrentState().name

    /**
     * Check if currently tracking a trip
     */
    fun isTrackingTrip(): Boolean = stateMachine.isTrackingTrip()
}
