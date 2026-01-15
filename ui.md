### Overview

This document describes the current UI for the Smart Bharat mobile app, screen by screen, so you can propose improved designs.

---

### Auth Flow

- **Login Screen (`app/auth/login.tsx`)**
  - Simple form with fields for phone/email and password.
  - Primary action button to log in; secondary link/button to navigate to signup.
  - Basic validation feedback (error messages) shown near inputs or as a toast/alert.

- **Signup Screen (`app/auth/signup.tsx`)**
  - Multi-field registration form (name, contact details, password, possibly location).
  - Primary action button to create account.
  - Link/button to go back to the login screen.

---

### Root Layout & Navigation

- **Root Layout (`app/_layout.tsx`)**
  - Uses Expo Router with a stack; header is hidden globally.
  - Wraps the app in `AuthProvider`, `LanguageProvider`, and a light/dark theme provider.

- **Bottom Tabs Layout (`app/(tabs)/_layout.tsx`)**
  - Bottom tab bar with multiple main sections (Home, Schemes, Explore/Market, Tasks, Profile, etc.).
  - Each tab has an icon and label; active tab is tinted with the app’s accent green.

---

### Home / Dashboard

- **Home Screen (`app/(tabs)/index.tsx`)**
  - **Welcome section** at the top:
    - “Welcome to Smart Bharat” title and short subtitle (“Your Digital Companion for Rural India”).
    - Small stat row: total farmers, states, number of schemes (with icons).
  - **Weather card**:
    - Shows current city and state.
    - Icon for weather, temperature, humidity, and wind speed, with a “Weather Details” modal available.
  - **Quick Actions grid**:
    - Cards like “Apply for Scheme”, “Voice Assistant”, “Crop-Checkup”, “Farm Services”.
    - Each card is a raised white tile with a colored icon and short label.
  - **Recent Schemes section**:
    - List of 1–2 recent schemes with title, status, and a progress bar.
  - **News section**:
    - Vertical list of cards with image, headline, short description, date, and a small “News” badge.
  - **Floating Chat Button**:
    - Round green button in bottom-right corner to open the Smart Assistant.
  - **Smart Assistant Modal**:
    - Slide-up panel with chat history, language selector, input field, microphone button, send button, and controls (mute, clear, close).

---

### Schemes

- **Schemes Tab (`app/(tabs)/schemes.tsx`)**
  - List or grid of government schemes with title, short description, and category (farming, health, housing, etc.).
  - Tapping a scheme opens details: description, eligibility, and “Apply” link that opens the relevant government portal in the browser.
  - May support searching/filtering by category or state.

---

### Market Prices / Explore

- **Market Price Screen (`app/(tabs)/explore.tsx`)**
  - **Header** with title “Market Prices”.
  - **Search bar**:
    - Input with search icon; placeholder suggests search by location, pincode, or crop.
    - “Search” button to trigger filtering; loading state shows a spinner.
  - **Category filter row**:
    - Horizontal chips for “All / Vegetable / Fruit / Grain”.
  - **Price cards list**:
    - For each crop: card with crop name + variety, market name, min/max price, and modal price (per kg or quintal).
    - Tapping a card opens a bottom sheet modal.
  - **Details modal**:
    - Shows computed price per kg and per quintal.
    - Logistics section (market location, distance, estimated transport cost).
    - Supply address as multiline text.

---

### Tasks & Reminders

- **Tasks Tab (`app/(tabs)/tasks.tsx`)**
  - Task list grouped by status (ongoing, completed) or category (farming, personal, general).
  - Each task row shows title, priority color (high/medium/low), due date/time, and a checkbox or toggle to mark complete.
  - Actions for adding a new task (FAB or button) and deleting/toggling tasks.
  - Voice assistant can create tasks via natural language; these appear in this screen.

---

### Crop Disease Checkup

- **Crop Disease Modal (`components/CropDiseaseModal.tsx`)**
  - Presented as a bottom sheet modal over the current screen.
  - **Initial state**:
    - Illustration-free, text prompt: “Upload a photo of the crop”.
    - Two primary buttons:
      - “Choose from Library” (photo icon).
      - “Take a Photo” (camera icon).
  - **After selecting a photo**:
    - Large image preview with square aspect ratio.
    - Loading state: green spinner with “Analyzing Image…” text.
    - Result box:
      - “Prediction: <disease name>”.
      - “Confidence: 85%” (for example), using green highlight.
    - Three detail sections:
      - “About the Disease” – paragraph text.
      - “Cause” – paragraph text.
      - “Solution” – rich text with clickable links to external resources.
    - Button “Try Another Image” to restart the flow.

---

### Weather Details

- **Weather Detail Modal (`Home` weather modals)**
  - Full-screen overlay with semi-transparent dark background and centered white card.
  - Card shows:
    - Location (city, state).
    - Current temperature and “feels like” text.
    - Weather condition summary (e.g., Clear skies, Partly cloudy).
    - Grid of metrics: humidity, wind speed/direction, pressure, visibility, precipitation, UV index.
    - Agriculture analysis section:
      - Status (“Good for farming” / “Needs attention”) with icon.
      - Lists of alerts and recommendations for farmers.
    - Close button at bottom or top-right corner.

---

### Profile & Settings

- **Profile Tab (`app/(tabs)/profile.tsx`)**
  - Shows basic user info (name, phone/email, location).
  - Sections for managing language preference, notifications, and possibly linked accounts.
  - Button to log out.

- **Settings Screen (`app/settings.tsx`)**
  - Additional configuration: app language, theme (if applicable), notification toggles, and support/contact links.

---

### Other Components

- **Farmer Services Modal (`components/FarmerServicesModal.tsx`)**
  - Modal listing farm services or equipment rental options.
  - Each service has name, short description, and contact/action control.

- **Voice Button (`components/VoiceButton.tsx`)**
  - Circular button with mic icon used in various places to trigger voice recognition.

---

### How to propose a better UI

- You can now go screen by screen (Login, Home, Schemes, Market Prices, Tasks, Crop Checkup, Profile/Settings, Assistant) and suggest:
  - New layout structure (card layouts, section ordering, bottom sheets vs full-screen).
  - Color, typography, and spacing improvements.
  - Component-level ideas (charts for prices, map snippets for markets, step indicators for schemes, etc.).

