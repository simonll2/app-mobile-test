package com.greenmobilitypass.detection

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity

/**
 * BroadcastReceiver for Activity Recognition updates.
 * Handles both:
 * - Activity Transition events (ENTER/EXIT) for detecting activity changes
 * - Activity Recognition results (periodic updates) for detecting current activity
 */
class ActivityRecognitionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "ActivityRecognition"
    }

    override fun onReceive(context: Context, intent: Intent) {
        // Only handle transition results (more reliable)
        if (ActivityTransitionResult.hasResult(intent)) {
            val result = ActivityTransitionResult.extractResult(intent)
            result?.let { handleTransitionResult(context, it) }
        }
    }

    private fun handleTransitionResult(context: Context, result: ActivityTransitionResult) {
        val service = TripDetectionService.getInstance()
        if (service == null) {
            Log.w(TAG, "TripDetectionService not available")
            return
        }

        for (event in result.transitionEvents) {
            val activityType = event.activityType
            val transitionType = event.transitionType
            val elapsedTimeNanos = event.elapsedRealTimeNanos

            val transitionName = when (transitionType) {
                ActivityTransition.ACTIVITY_TRANSITION_ENTER -> "ENTER"
                ActivityTransition.ACTIVITY_TRANSITION_EXIT -> "EXIT"
                else -> "UNKNOWN"
            }

            Log.d(TAG, "Activity transition: ${getActivityName(activityType)} -> $transitionName")

            // Forward to service
            service.onActivityTransitionDetected(activityType, transitionType, elapsedTimeNanos)
        }
    }

    private fun getActivityName(type: Int): String {
        return when (type) {
            DetectedActivity.IN_VEHICLE -> "IN_VEHICLE"
            DetectedActivity.ON_BICYCLE -> "ON_BICYCLE"
            DetectedActivity.ON_FOOT -> "ON_FOOT"
            DetectedActivity.STILL -> "STILL"
            DetectedActivity.UNKNOWN -> "UNKNOWN"
            DetectedActivity.TILTING -> "TILTING"
            DetectedActivity.WALKING -> "WALKING"
            DetectedActivity.RUNNING -> "RUNNING"
            else -> "UNKNOWN ($type)"
        }
    }
}
