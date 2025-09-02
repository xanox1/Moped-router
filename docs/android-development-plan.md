# Moped Router - Android Development Plan

## Overview
This document outlines the plan for developing an Android application for the Moped Router project.

## Architecture
The Android app will follow the MVVM architecture pattern with:
- **Model**: Data classes for routes, locations, and API responses
- **View**: Activities and Fragments for UI
- **ViewModel**: Business logic and state management

## Core Features (Future Development)

### Phase 1: Basic Functionality
- [ ] Map display using OpenStreetMap tiles
- [ ] Route planning with start/end points
- [ ] Integration with GraphHopper API
- [ ] Display route information (distance, time)

### Phase 2: Enhanced Features
- [ ] GPS location support
- [ ] Offline map capabilities
- [ ] Route history
- [ ] User preferences

### Phase 3: Advanced Features
- [ ] Real-time navigation
- [ ] Voice guidance
- [ ] Traffic updates integration
- [ ] Share routes functionality

## Technology Stack
- **Language**: Kotlin
- **UI Framework**: Jetpack Compose
- **Maps**: OSMDroid or Mapbox
- **Networking**: Retrofit with OkHttp
- **Architecture**: MVVM with LiveData/StateFlow
- **Dependency Injection**: Hilt
- **Testing**: JUnit, Espresso, Mockito

## API Integration
The Android app will use the same GraphHopper API endpoint:
- Base URL: `https://graphhopper.xanox.org:8989`
- Profile: `moped`
- Response format: GeoJSON

## File Structure
```
android/
├── app/
│   ├── src/main/java/com/moped/router/
│   │   ├── ui/
│   │   ├── data/
│   │   ├── domain/
│   │   └── di/
│   └── src/test/
├── gradle/
└── build.gradle
```

## Getting Started
1. Install Android Studio
2. Open the android/ directory as a project
3. Sync Gradle dependencies
4. Run on emulator or device