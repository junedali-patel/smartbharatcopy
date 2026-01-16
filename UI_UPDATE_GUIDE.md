# UI Design Update Guide - Smart Bharat

## Overview
This guide helps you update your React Native screens to match the new professional UI designs from the `newui` folder.

## New Design System
A complete design system has been created in `constants/newDesignSystem.ts` that includes:
- **Colors**: Primary greens, neutrals (slate), and semantic colors
- **Typography**: Font sizes, weights, and presets
- **Spacing**: Consistent 4px-based spacing scale
- **Border Radius**: Rounded corners (8px, 12px, 16px, 20px, full)
- **Shadows**: Layered shadow depths (sm, md, lg, xl)
- **Component Styles**: Predefined button, input, and card styles

## Reusable Components
Styled components are available in `components/StyledComponents.tsx`:

### Header Component
```tsx
import { StyledHeader } from '../components/StyledComponents';

<StyledHeader 
  title="My Tasks"
  subtitle="FARM OPERATIONS"
  rightActions={<YourActionButtons />}
/>
```

### Card Component
```tsx
import { StyledCard, PrimaryCard } from '../components/StyledComponents';

// Default card
<StyledCard>
  <Text>Card content</Text>
</StyledCard>

// Primary colored card
<PrimaryCard>
  <Text style={{ color: 'white' }}>Primary card content</Text>
</PrimaryCard>
```

### Button Component
```tsx
import { StyledButton } from '../components/StyledComponents';

<StyledButton
  title="Submit"
  onPress={() => {}}
  variant="primary"
  size="large"
  icon={<IconComponent />}
/>
```

### Text Components
```tsx
import { Heading1, Heading2, BodyText, CaptionText } from '../components/StyledComponents';

<Heading1>Large Title</Heading1>
<Heading2>Section Title</Heading2>
<BodyText>Regular paragraph text</BodyText>
<CaptionText>SMALL LABEL TEXT</CaptionText>
```

### Input Component
```tsx
import { StyledInput } from '../components/StyledComponents';

<StyledInput
  label="Task Title"
  placeholder="Enter task name"
  value={value}
  onChangeText={setValue}
  error={error}
/>
```

### Status Badge
```tsx
import { StatusBadge } from '../components/StyledComponents';

<StatusBadge label="Completed" variant="success" />
<StatusBadge label="Urgent" variant="error" />
```

## Screen-by-Screen Updates

### 1. Tasks Screen (tasks.tsx) - Match code.html

**Key Design Elements:**
- Header: "FARM OPERATIONS" caption + "My Tasks" title with history & filter buttons
- Voice Command Card: Primary green background with white text and mic icon
- Task Lists: Grouped by priority (High, Medium, Low)
- Task Items: Clean cards with checkboxes and category badges

**Quick Implementation:**
1. Replace header with `StyledHeader`
2. Create PrimaryCard for voice command section
3. Use StyledCard for each task
4. Apply StatusBadge for priority levels

### 2. Profile Screen (profile.tsx) - Match code (1).html

**Key Design Elements:**
- User avatar section with circular profile picture
- "Edit Profile" button in top right
- Personal Information section with clean form inputs
- Profile fields: Name, Email, Phone, Farm Size, Primary Crop

**Quick Implementation:**
1. Update header with profile title and edit button
2. Style avatar container with circular green background
3. Use StyledInput for all form fields
4. Apply consistent spacing and rounded inputs

### 3. Equipment Rental (rent.tsx) - Match code (2).html

**Key Design Elements:**
- Total Earnings card (gradient primary color)
- Active Bookings and Rating stats
- Equipment Listings with images
- Interactive cards with info

**Quick Implementation:**
1. Create earning stats card with gradient
2. Use PrimaryCard for stats section
3. List equipment in grid/list format
4. Add action buttons for "View All", booking actions

### 4. Rent Equipment Form - Match code (3).html

**Key Design Elements:**
- Progress indicator (Step 1, 2, 3)
- Equipment Information section
- Form fields: Type, Title, Description, Price/Day
- Next button

**Quick Implementation:**
1. Build progress stepper component
2. Use StyledInput for all fields
3. Apply form section styling
4. Use StyledButton for navigation

## Color Usage Quick Reference

```tsx
import { Colors } from '../constants/newDesignSystem';

// Primary green (main CTA, headers)
backgroundColor: Colors.primary;

// Secondary green (hover states, accents)
backgroundColor: Colors.secondary;

// Slate grays (backgrounds, text)
backgroundColor: Colors.slate[50];      // Light backgrounds
color: Colors.text.primary;              // Main text
color: Colors.text.secondary;            // Secondary text
color: Colors.text.tertiary;             // Tertiary text (captions)

// Status colors
backgroundColor: Colors.success;         // Success states
backgroundColor: Colors.error;           // Error/danger states
```

## Spacing Quick Reference

```tsx
import { Spacing } from '../constants/newDesignSystem';

// Use consistent 4px base unit:
Spacing[1]  // 4px - minimal spacing
Spacing[2]  // 8px - tight spacing
Spacing[3]  // 12px - compact spacing
Spacing[4]  // 16px - normal spacing (default)
Spacing[5]  // 20px - comfortable spacing
Spacing[6]  // 24px - section spacing
Spacing[8]  // 32px - large gaps

// Common usage:
paddingHorizontal: Spacing[4]
marginVertical: Spacing[3]
gap: Spacing[2]
```

## Border Radius Quick Reference

```tsx
import { BorderRadius } from '../constants/newDesignSystem';

BorderRadius.sm      // 8px - input fields
BorderRadius.default // 12px - cards, buttons
BorderRadius.lg      // 16px - larger cards
BorderRadius.xl      // 20px - prominent cards
BorderRadius.full    // 999px - circular badges, buttons
```

## Implementation Steps

1. **Create a new styled version** of each screen:
   ```
   app/(tabs)/tasks.styled.tsx
   app/(tabs)/profile.styled.tsx
   ```

2. **Import design system and components:**
   ```tsx
   import { Colors, Spacing, BorderRadius } from '../constants/newDesignSystem';
   import { StyledHeader, StyledCard, StyledButton } from '../components/StyledComponents';
   ```

3. **Update color variables:**
   ```tsx
   const backgroundColor = Colors.background.light;
   const textColor = Colors.text.primary;
   const accentColor = Colors.primary;
   ```

4. **Replace components gradually:**
   - Start with header/structure
   - Update individual component styles
   - Apply consistent spacing
   - Test on both platforms

5. **Test:**
   - Mobile devices
   - Light/Dark modes
   - Different screen sizes

## Visual Design Principles Applied

✅ **Hierarchy**: Clear title → subtitle → content structure
✅ **Spacing**: Consistent gaps between elements
✅ **Color**: Primary green for actions, slate grays for UI
✅ **Typography**: Bold titles, regular body, small captions
✅ **Shadows**: Depth for cards and elevated elements
✅ **Accessibility**: Sufficient contrast ratios
✅ **Responsiveness**: Padding and sizing adjusts for screens

## Need Help?

- Reference complete HTML design in: `newui/code.html` (Tasks), `newui/code (1).html` (Profile), etc.
- Use `Colors`, `Typography`, `Spacing`, `BorderRadius` from design system
- Use pre-built components from `StyledComponents.tsx`
- Test using design system values for consistency

---

**Next Steps**: Pick one screen and start implementing using the guide above!
