package com.greenmobilitypass.detection

import android.annotation.SuppressLint
import android.content.Context
import android.os.Looper
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.Priority

/**
 * Manages GPS location tracking during trips
 */
class GpsLocationTracker(
    private val context: Context,
    private val stateMachine: TripStateMachine
) {
    companion object {
        private const val TAG = "GpsLocationTracker"
        private const val UPDATE_INTERVAL_MS = 5000L
    }

    private val fusedLocationClient: FusedLocationProviderClient = 
        com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context)

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(locationResult: LocationResult) {
            for (location in locationResult.locations) {
                stateMachine.addGpsPoint(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracy = location.accuracy
                )
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun startTracking() {
        try {
            val locationRequest = LocationRequest.Builder(UPDATE_INTERVAL_MS)
                .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                .build()

            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
            Log.d(TAG, "✅ GPS tracking started")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error starting GPS tracking: ${e.message}")
        }
    }

    fun stopTracking() {
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            Log.d(TAG, "✅ GPS tracking stopped")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error stopping GPS tracking: ${e.message}")
        }
    }
}
