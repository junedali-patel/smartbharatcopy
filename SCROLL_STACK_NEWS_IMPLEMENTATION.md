# News Stack Card Implementation

## Overview
Implemented a smooth, card-based stacking scroll interface for displaying news articles, inspired by the scroll stack pattern from your reference files.

## Components Created

### 1. **ScrollStack.tsx** (`components/ScrollStack.tsx`)
A reusable scroll stack component that provides:
- Smooth vertical scrolling with snap-to-interval behavior
- Swipe gesture support (swipe up/down to navigate between cards)
- Touch and pan responder handling
- Configurable card height and gap spacing
- Callbacks for tracking current card index
- Deceleration effect for natural scrolling

**Key Features:**
- `cardHeight`: Customize height of each card (default: 300px)
- `gap`: Space between cards (default: 20px)
- `onCardIndex`: Callback when card index changes
- `onCardSwipe`: Callback on swipe gestures
- `enabled`: Toggle scroll functionality

### 2. **NewsCard.tsx** (`components/NewsCard.tsx`)
Individual news card component displaying:
- News article image with fallback placeholder
- Article title with line limiting
- Description excerpt
- Published date with smart formatting (Today/Yesterday/Date)
- Card index indicator
- Swipe-up indicator (chevron icon)
- Green badge for "News" category
- Touch feedback with active opacity

**Features:**
- Smart date formatting (relative vs absolute)
- Image optimization with fallback UI
- Responsive card layout
- Touch-friendly press areas

### 3. **Updated HomeScreen** (`app/(tabs)/index.tsx`)
Modified NewsSection component to:
- Replace traditional scrollview list with ScrollStack
- Track current news index
- Display "X / Total" counter
- Maintain all existing news fetching logic
- Support smooth card transitions
- Show loading and empty states

## How It Works

1. **News Fetching**: 
   - Fetches agriculture/farming news from NewsAPI
   - Falls back to general India news if specific news unavailable
   - Filters for relevant content and Indian sources

2. **Card Stack Display**:
   - News articles are rendered as individual cards in a stack
   - Users can scroll vertically to see next/previous articles
   - Swipe gestures (up/down) navigate between cards
   - Current card position displayed in header counter

3. **Visual Feedback**:
   - Chevron-up icon indicates swipe capability
   - Index counter shows progress (e.g., "3 / 10")
   - Smooth animations on card transitions
   - Card shadows and styling match app design

## Usage

The NewsSection is automatically integrated into the HomeScreen. It:
- Loads when user location is set
- Re-fetches when user's state changes
- Displays in full-screen scroll stack format
- Tapping cards opens articles in browser

## Styling

New styles added to support:
- `.newsStackContainer`: Container for scroll stack
- `.newsCounter`: Position indicator styling
- `.noNewsText`: Empty state text

All styles maintain consistency with existing app theme (green accent color #2E7D32).

## Benefits

✅ **Enhanced UX**: Card-based stack interface is modern and engaging
✅ **Smooth Navigation**: Snap-to-card behavior provides satisfying scrolling
✅ **Touch Optimized**: Swipe gestures feel natural on mobile
✅ **Reusable**: ScrollStack component can be used for other content
✅ **Performance**: Efficient rendering with Animated API
✅ **Accessibility**: Touch targets properly sized and labeled
