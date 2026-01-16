# 🎨 UI Design System - Quick Reference Card

## Import Statements
```tsx
// Design tokens
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/newDesignSystem';

// Components
import { 
  StyledHeader, 
  StyledCard, 
  PrimaryCard, 
  StyledButton, 
  StyledInput,
  Heading1, 
  Heading2, 
  BodyText, 
  CaptionText,
  StatusBadge 
} from '../components/StyledComponents';
```

---

## 🎨 Color Palette

### Primary Green Theme
| Name | Value | Usage |
|------|-------|-------|
| Primary | `#1B4332` | CTA buttons, headers, badges |
| Secondary | `#2D6A4F` | Hover states, secondary actions |
| Tertiary | `#40916C` | Accents, lighter elements |
| Light Accent | `#74C69D` | Very light backgrounds |

### Slate Grays
| Shade | Value | Usage |
|-------|-------|-------|
| 50 | `#F8FAFC` | Page backgrounds |
| 100 | `#F1F5F9` | Light cards, inputs |
| 200 | `#E2E8F0` | Borders, dividers |
| 400 | `#94A3B8` | Disabled states |
| 500 | `#64748B` | Secondary text |
| 600 | `#475569` | Body text, icons |
| 900 | `#0F172A` | Primary text, dark backgrounds |

### Semantic Colors
```tsx
Colors.success   // #22C55E - Success states
Colors.warning   // #F59E0B - Warnings
Colors.error     // #EF4444 - Errors
Colors.info      // #3B82F6 - Info messages
```

---

## 📏 Spacing Scale (4px base)

```tsx
Spacing[0] = 0px
Spacing[1] = 4px      // Minimal gaps
Spacing[2] = 8px      // Tight spacing
Spacing[3] = 12px     // Compact spacing
Spacing[4] = 16px     // Default padding
Spacing[5] = 20px     // Comfortable spacing
Spacing[6] = 24px     // Section spacing
Spacing[8] = 32px     // Large gaps
```

### Common Usage
```tsx
// Horizontal padding (screens)
paddingHorizontal: Spacing[5]  // 20px

// Section vertical spacing
marginVertical: Spacing[6]     // 24px

// Between elements
gap: Spacing[3]                // 12px

// Card/Input padding
padding: Spacing[4]            // 16px
```

---

## 🔤 Typography

### Font Sizes
```tsx
Typography.sizes.xs   = 11px
Typography.sizes.sm   = 12px
Typography.sizes.base = 14px  // Default
Typography.sizes.lg   = 16px
Typography.sizes.xl   = 18px
Typography.sizes['2xl'] = 20px
Typography.sizes['3xl'] = 24px
```

### Font Weights
```tsx
'400' = Regular (body text)
'500' = Medium (labels)
'600' = Semibold (emphasis)
'700' = Bold (headings)
```

### Text Components
```tsx
<Heading1>Page Title</Heading1>          // 24px bold
<Heading2>Section Title</Heading2>       // 20px bold
<BodyText>Regular paragraph text</BodyText>  // 14px regular
<CaptionText>LABEL TEXT</CaptionText>    // 11px, uppercase
```

---

## 🎯 Border Radius

```tsx
BorderRadius.sm      = 8px   // Input fields
BorderRadius.default = 12px  // Cards, buttons (default)
BorderRadius.lg      = 16px  // Larger cards
BorderRadius.xl      = 20px  // Prominent cards
BorderRadius.full    = 999px // Circular (badges, avatars)
```

---

## 🔳 Shadows

```tsx
Shadows.sm   // Subtle shadow (borders, light elements)
Shadows.md   // Default shadow (cards)
Shadows.lg   // Prominent shadow (elevated cards)
Shadows.xl   // Strong shadow (modals, overlays)

// Usage:
const card = {
  ...Shadows.md
}
```

---

## 🧩 Component Quick Examples

### Header
```tsx
<StyledHeader 
  title="Page Title"
  subtitle="SECTION LABEL"
  rightActions={<ActionButtons />}
/>
```

### Cards
```tsx
// Default card
<StyledCard style={{ gap: Spacing[3] }}>
  <Text>Content</Text>
</StyledCard>

// Primary colored card
<PrimaryCard>
  <Text style={{ color: Colors.white }}>White text on green</Text>
</PrimaryCard>
```

### Buttons
```tsx
<StyledButton
  title="Click me"
  onPress={() => {}}
  variant="primary"      // primary, secondary, outline, ghost
  size="large"           // large, small
  icon={<Icon />}
  loading={false}
/>
```

### Input
```tsx
<StyledInput
  label="Field Label"
  placeholder="Enter text"
  value={value}
  onChangeText={setValue}
  error={errorMessage}
/>
```

### Text
```tsx
<Text style={{
  fontSize: Typography.sizes.lg,
  fontWeight: '600',
  color: Colors.text.primary
}}>Custom text</Text>
```

### Badge
```tsx
<StatusBadge 
  label="Completed" 
  variant="success"  // success, warning, error, default
/>
```

---

## 🎨 Style Object Template

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
    paddingHorizontal: Spacing[5],
  },
  
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    backgroundColor: Colors.white,
    marginVertical: Spacing[3],
    ...Shadows.md,
  },
  
  button: {
    height: 48,
    borderRadius: BorderRadius.default,
    paddingHorizontal: Spacing[4],
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing[3],
  },
  
  text: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});
```

---

## 🔄 Common Color Combos

### Text on Backgrounds
```tsx
// Primary content
color: Colors.text.primary
// Secondary/muted
color: Colors.text.secondary
// Captions/disabled
color: Colors.text.tertiary
```

### Card Backgrounds
```tsx
// Default cards
backgroundColor: Colors.white

// Light backgrounds
backgroundColor: Colors.slate[50]

// Primary accent
backgroundColor: Colors.primary
```

### Button Styles
```tsx
// Primary (green)
backgroundColor: Colors.primary
color: Colors.white

// Secondary (light)
backgroundColor: Colors.slate[100]
color: Colors.text.primary

// Outline
borderColor: Colors.primary
color: Colors.primary
```

---

## ✅ Accessibility Checklist

- [ ] Use Colors.text.primary for main text
- [ ] Ensure 4.5:1 contrast ratio minimum
- [ ] Use semantic colors (error, success, warning)
- [ ] Proper spacing for touch targets (min 44px)
- [ ] Clear typography hierarchy
- [ ] Don't rely on color alone

---

## 📱 Responsive Sizing

```tsx
// Screen padding (side margins)
horizontal: Spacing[5]  // 20px

// Top/Bottom padding
vertical: Spacing[6]    // 24px

// Section gaps
marginVertical: Spacing[6]

// Between items
gap: Spacing[3]
```

---

## 🎬 Animation Timing
```tsx
activeOpacity: 0.7     // Button press
duration: 300          // Typical transition
```

---

## 🔍 Debug Tips

**Check color usage:**
```tsx
// Find hardcoded colors and replace
⌘+D: #1B4332 → Colors.primary
```

**Verify spacing:**
```tsx
// All padding/margin should be Spacing[N]
// If not divisible by 4, adjust
```

**Test typography:**
```tsx
// Use only predefined sizes
Typography.sizes.xs, sm, base, lg, xl, 2xl, 3xl
```

---

## 📚 Where to Find Things

| Need | File |
|------|------|
| Colors | `constants/newDesignSystem.ts` |
| Components | `components/StyledComponents.tsx` |
| Implementation guide | `UI_UPDATE_GUIDE.md` |
| Working example | `examples/UpdatedTasksScreenExample.tsx` |
| Full overview | `UI_REDESIGN_SUMMARY.md` |

---

**Happy coding! 🚀**
