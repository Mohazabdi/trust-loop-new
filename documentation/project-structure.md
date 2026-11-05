# TrustLoop Project Structure and Frontend Architecture

## Project Overview

TrustLoop is a React Native mobile application developed using Expo and TypeScript. The application uses Expo Router for file-based navigation and Supabase as its backend service.

The repository contains dedicated application directories for authentication, groups, savings, wallet operations, SACCO functionality, user profiles and legal information.

## Technology Stack

- Expo SDK: 54.0.33
- React Native: 0.81.5
- React: 19.1.0
- TypeScript: 5.9.2
- Expo Router: 6.0.23
- Supabase JavaScript Client: 2.105.4
- TanStack Query: 5
- Zustand: 5
- AsyncStorage: 2.2.0

## Application Entry Point

The application entry point is configured in `package.json` as `expo-router/entry`.

Expo Router manages the application's file-based routing system using the `app/` directory.

## Frontend Architecture

The application uses a provider-based architecture.

The root layout, `app/_layout.tsx`, establishes shared application services and functionality, including:

- Authentication context through `AuthProvider`.
- Persistent server-state caching through TanStack Query and AsyncStorage.
- Gesture handling.
- Safe-area management.
- Bottom-sheet modal functionality.
- Application theme management.
- Toast notifications.

Zustand is installed for shared client-side state management.

## Navigation Architecture

The application uses Expo Router with a root Stack navigator.

The root navigation conditionally protects the `(tabs)` and `(auth)` route groups based on the user's authentication state.

The application contains three principal route groups:

**Authentication — `(auth)`**

Includes login, registration, OTP login, email verification and password recovery screens.

**Main application — `(tabs)`**

Contains the main application functionality:

- Groups and group management.
- Group savings and rotation plans.
- Wallet operations.
- SACCO management.
- SACCO loans.
- User profiles and settings.
- Transactions and analytics.

**Legal — `(legal)`**

Contains privacy policy and terms of service screens.

The root index route, `app/index.tsx`, redirects authenticated users to the main tab group and unauthenticated users to the login route.

## Expo Configuration

The project uses Expo SDK 54 and has Android and iOS application identifiers configured as `com.mohazabdi.trustloop`.

Additional configuration includes:

- Portrait orientation.
- Automatic system theme selection.
- React Native New Architecture enabled.
- Expo Router typed routes enabled.
- React Compiler experiment enabled.
- Static web output configured.
- Expo Application Services project configuration present.

The configured plugins include Expo Router, Expo Splash Screen, Expo Secure Store and the React Native community DateTimePicker.

## Preliminary Architecture Observations

- The application uses a file-based navigation architecture.
- Authentication state determines access to the main application and authentication routes.
- The root layout manages shared application services and UI components.
- TanStack Query is configured for persistent caching.
- Zustand is installed for shared application state.
- Dedicated frontend directories exist for the major TrustLoop functional areas.
- The application has Android, iOS and static web configuration.

## Items Requiring Further Investigation

- Verify the application starts successfully.
- Verify authentication and navigation on an actual device.
- Investigate empty TrustScore and wallet savings route directories.
- Verify the implementation of the main application screens.
- Verify Expo configuration and native dependency compatibility.
- Establish which screens use live backend data, simulated data or static content.