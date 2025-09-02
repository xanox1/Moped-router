package com.moped.router

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Main Application class for Moped Router
 * Future implementation will include Hilt dependency injection setup
 */
@HiltAndroidApp
class MopedRouterApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        // Initialize application-level components
        // TODO: Setup logging, crash reporting, analytics
    }
}