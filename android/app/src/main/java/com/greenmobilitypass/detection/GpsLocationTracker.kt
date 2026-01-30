package com.greenmobilitypass.detection

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.Priority
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * GPS tracking modes for adaptive battery optimization
 */
enum class GpsMode {
    HIGH_FREQUENCY,  // 5s - startup and arrival phases
    LOW_FREQUENCY    // 20s - cruise phase (stable movement)
}

/**
 * Manages GPS location tracking during trips with adaptive frequency
 * to optimize battery consumption while maintaining accuracy.
 * 
 * Phases:
 * - STARTUP (first 60s): High frequency (5s) for accurate departure point
 * - CRUISE (after 60s, stable speed): Low frequency (20s) to save battery
 * - ARRIVAL (STILL detected): High frequency (5s) for accurate arrival point
 */
class GpsLocationTracker(
    private val context: Context,
    private val stateMachine: TripStateMachine
) {
    companion object {
        private const val TAG = "GpsLocationTracker"
        
        // GPS intervals
        private const val HIGH_FREQUENCY_INTERVAL_MS = 5_000L   // 5 seconds
        private const val LOW_FREQUENCY_INTERVAL_MS = 20_000L   // 20 seconds
        
        // Adaptive mode thresholds
        private const val STARTUP_PHASE_DURATION_MS = 60_000L   // First 60 seconds in high frequency
        private const val MIN_POINTS_FOR_STABILITY = 3          // Minimum GPS points to assess stability
        private const val SPEED_VARIANCE_THRESHOLD = 0.25       // 25% variance threshold for stability
        
        // Mode check interval
        private const val MODE_CHECK_INTERVAL_MS = 10_000L      // Check mode every 10 seconds
    }

    private val fusedLocationClient: FusedLocationProviderClient = 
        com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context)

    // Current GPS mode
    private var currentMode = GpsMode.HIGH_FREQUENCY
    private var isTracking = false
    
    // Trip timing
    private var tripStartTime = 0L
    
    // Speed measurements for stability detection
    private val speedMeasurements = mutableListOf<Float>()
    private var lastLocation: android.location.Location? = null
    private var lastLocationTime = 0L
    
    // Handler for periodic mode checks
    private val modeCheckHandler = Handler(Looper.getMainLooper())
    private var modeCheckRunnable: Runnable? = null
    
    // Listener for mode changes (to notify TripDetectionService)
    var onModeChangedListener: ((GpsMode, Long) -> Unit)? = null

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(locationResult: LocationResult) {
            for (location in locationResult.locations) {
                // Add point to state machine
                stateMachine.addGpsPoint(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracy = location.accuracy
                )
                
                // Calculate speed for stability detection
                calculateAndRecordSpeed(location)
            }
        }
    }

    /**
     * Calculate speed from consecutive GPS points and record it
     */
    private fun calculateAndRecordSpeed(newLocation: android.location.Location) {
        val currentTime = System.currentTimeMillis()
        
        lastLocation?.let { prevLocation ->
            val timeDeltaSeconds = (currentTime - lastLocationTime) / 1000.0
            if (timeDeltaSeconds > 0) {
                val distance = prevLocation.distanceTo(newLocation) // meters
                val speedMs = distance / timeDeltaSeconds
                val speedKmh = (speedMs * 3.6).toFloat()
                
                // Only record reasonable speeds (0-150 km/h)
                if (speedKmh in 0f..150f) {
                    speedMeasurements.add(speedKmh)
                    
                    // Keep only last 10 measurements
                    if (speedMeasurements.size > 10) {
                        speedMeasurements.removeAt(0)
                    }
                    
                    Log.d(TAG, "📊 Speed recorded: ${String.format("%.1f", speedKmh)} km/h (${speedMeasurements.size} samples)")
                }
            }
        }
        
        lastLocation = newLocation
        lastLocationTime = currentTime
    }

    /**
     * Check if speed is stable enough for low frequency mode
     */
    private fun isSpeedStable(): Boolean {
        if (speedMeasurements.size < MIN_POINTS_FOR_STABILITY) {
            Log.d(TAG, "📊 Not enough speed samples: ${speedMeasurements.size}/$MIN_POINTS_FOR_STABILITY")
            return false
        }
        
        val avg = speedMeasurements.average()
        if (avg < 1.0) {
            // Very slow movement, might be stopping
            Log.d(TAG, "📊 Speed too low for stability check: ${String.format("%.1f", avg)} km/h")
            return false
        }
        
        // Calculate coefficient of variation (standard deviation / mean)
        val variance = speedMeasurements.map { (it - avg).pow(2) }.average()
        val stdDev = sqrt(variance)
        val coefficientOfVariation = stdDev / avg
        
        val isStable = coefficientOfVariation < SPEED_VARIANCE_THRESHOLD
        
        Log.d(TAG, "📊 Speed stability: avg=${String.format("%.1f", avg)} km/h, " +
                   "stdDev=${String.format("%.1f", stdDev)}, " +
                   "CV=${String.format("%.2f", coefficientOfVariation)}, " +
                   "stable=$isStable")
        
        return isStable
    }

    /**
     * Update GPS mode based on trip phase and movement stability
     */
    private fun updateGpsMode() {
        if (!isTracking) return
        
        val tripDuration = System.currentTimeMillis() - tripStartTime
        val previousMode = currentMode
        
        currentMode = when {
            // Startup phase: always high frequency
            tripDuration < STARTUP_PHASE_DURATION_MS -> {
                Log.d(TAG, "🚀 Startup phase (${tripDuration/1000}s < ${STARTUP_PHASE_DURATION_MS/1000}s)")
                GpsMode.HIGH_FREQUENCY
            }
            
            // Cruise phase: low frequency if speed is stable
            isSpeedStable() -> {
                Log.d(TAG, "🚗 Cruise phase - speed stable")
                GpsMode.LOW_FREQUENCY
            }
            
            // Otherwise: high frequency
            else -> {
                Log.d(TAG, "⚡ Unstable movement - keeping high frequency")
                GpsMode.HIGH_FREQUENCY
            }
        }
        
        // Apply mode change if needed
        if (currentMode != previousMode) {
            Log.d(TAG, "🔄 GPS Mode changed: $previousMode → $currentMode")
            applyCurrentMode()
            onModeChangedListener?.invoke(currentMode, System.currentTimeMillis())
        }
    }

    /**
     * Apply the current GPS mode by updating location request
     */
    @SuppressLint("MissingPermission")
    private fun applyCurrentMode() {
        if (!isTracking) return
        
        val interval = when (currentMode) {
            GpsMode.HIGH_FREQUENCY -> HIGH_FREQUENCY_INTERVAL_MS
            GpsMode.LOW_FREQUENCY -> LOW_FREQUENCY_INTERVAL_MS
        }
        
        try {
            // Remove existing updates
            fusedLocationClient.removeLocationUpdates(locationCallback)
            
            // Create new request with updated interval
            val locationRequest = LocationRequest.Builder(interval)
                .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                .setMinUpdateIntervalMillis(interval / 2)
                .build()
            
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
            
            Log.d(TAG, "✅ GPS interval updated: ${interval/1000}s ($currentMode)")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error updating GPS mode: ${e.message}")
        }
    }

    /**
     * Start periodic mode checking
     */
    private fun startModeChecking() {
        stopModeChecking()
        
        modeCheckRunnable = object : Runnable {
            override fun run() {
                updateGpsMode()
                modeCheckHandler.postDelayed(this, MODE_CHECK_INTERVAL_MS)
            }
        }
        
        // First check after startup phase
        modeCheckHandler.postDelayed(modeCheckRunnable!!, STARTUP_PHASE_DURATION_MS)
        Log.d(TAG, "⏰ Mode checking scheduled (first check in ${STARTUP_PHASE_DURATION_MS/1000}s)")
    }

    /**
     * Stop periodic mode checking
     */
    private fun stopModeChecking() {
        modeCheckRunnable?.let {
            modeCheckHandler.removeCallbacks(it)
        }
        modeCheckRunnable = null
    }

    /**
     * Start GPS tracking with adaptive frequency
     */
    @SuppressLint("MissingPermission")
    fun startTracking() {
        if (isTracking) {
            Log.d(TAG, "⚠️ GPS already tracking")
            return
        }
        
        try {
            // Reset state
            tripStartTime = System.currentTimeMillis()
            currentMode = GpsMode.HIGH_FREQUENCY
            speedMeasurements.clear()
            lastLocation = null
            lastLocationTime = 0L
            isTracking = true
            
            // Start with high frequency
            val locationRequest = LocationRequest.Builder(HIGH_FREQUENCY_INTERVAL_MS)
                .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                .setMinUpdateIntervalMillis(HIGH_FREQUENCY_INTERVAL_MS / 2)
                .build()

            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
            
            // Start periodic mode checking
            startModeChecking()
            
            Log.d(TAG, "✅ GPS tracking started (adaptive mode: HIGH_FREQUENCY)")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error starting GPS tracking: ${e.message}")
            isTracking = false
        }
    }

    /**
     * Stop GPS tracking
     */
    fun stopTracking() {
        if (!isTracking) {
            Log.d(TAG, "⚠️ GPS not tracking")
            return
        }
        
        try {
            stopModeChecking()
            fusedLocationClient.removeLocationUpdates(locationCallback)
            isTracking = false
            
            // Log stats
            Log.d(TAG, "✅ GPS tracking stopped")
            Log.d(TAG, "📊 Final stats: ${speedMeasurements.size} speed samples, mode was $currentMode")
            
            // Reset state
            currentMode = GpsMode.HIGH_FREQUENCY
            speedMeasurements.clear()
            lastLocation = null
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error stopping GPS tracking: ${e.message}")
        }
    }

    /**
     * Force high frequency mode (called when approaching trip end)
     */
    fun forceHighFrequency() {
        if (!isTracking) return
        
        if (currentMode != GpsMode.HIGH_FREQUENCY) {
            Log.d(TAG, "🏁 Forcing HIGH_FREQUENCY mode (approaching trip end)")
            currentMode = GpsMode.HIGH_FREQUENCY
            applyCurrentMode()
            onModeChangedListener?.invoke(currentMode, System.currentTimeMillis())
        }
    }

    /**
     * Get current GPS mode
     */
    fun getCurrentMode(): GpsMode = currentMode

    /**
     * Check if currently tracking
     */
    fun isCurrentlyTracking(): Boolean = isTracking
}
