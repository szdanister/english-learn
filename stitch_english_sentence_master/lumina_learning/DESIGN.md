---
name: Lumina Learning
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#414751'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#717783'
  outline-variant: '#c1c7d3'
  surface-tint: '#0060ac'
  primary: '#005da7'
  on-primary: '#ffffff'
  primary-container: '#2976c7'
  on-primary-container: '#fdfcff'
  inverse-primary: '#a4c9ff'
  secondary: '#266d00'
  on-secondary: '#ffffff'
  secondary-container: '#85fa51'
  on-secondary-container: '#287100'
  tertiary: '#785600'
  on-tertiary: '#ffffff'
  tertiary-container: '#976d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#a4c9ff'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#004883'
  secondary-fixed: '#88fd54'
  secondary-fixed-dim: '#6de039'
  on-secondary-fixed: '#062100'
  on-secondary-fixed-variant: '#1a5200'
  tertiary-fixed: '#ffdea4'
  tertiary-fixed-dim: '#ffbb00'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Lexend
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Lexend
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Lexend
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Lexend
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Lexend
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Lexend
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Lexend
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: auto
---

## Brand & Style

The design system is anchored in a personality that is encouraging, optimistic, and academically accessible. It targets lifelong learners and students who require a low-friction, high-motivation environment to master new languages. 

The aesthetic direction is **Modern Tactile**. It blends clean, minimalist layouts with soft, physical-inspired elements that make the interface feel "squishy" and interactive. By utilizing generous whitespace and a "friendly-first" approach, the design system avoids the intimidating feel of traditional textbooks, replacing it with a supportive digital coach atmosphere. Visual cues focus on positive reinforcement and clarity of action.

## Colors

The color palette is designed to be vibrant yet soothing, reducing cognitive load during intense study sessions.

- **Primary (Sky Blue):** Used for the core interface, headers, and the "Unknown/Review" actions. It represents calm and focus.
- **Secondary (Growth Green):** Reserved for success states, progress completion, and the "Known/Mastered" action. It provides immediate positive reinforcement.
- **Tertiary (Sunny Amber):** Used sparingly for streaks, achievements, and motivational highlights to draw attention without causing alarm.
- **Neutral (Clean Slate):** A range of cool grays and off-whites that ensure the background remains unobtrusive while maintaining high contrast for text.

## Typography

This design system utilizes **Lexend** exclusively. Lexend was specifically designed to reduce visual stress and improve reading proficiency, making it the ideal choice for a language learning application.

- **Headlines:** Use Bold or SemiBold weights to create a clear hierarchy.
- **Body Text:** Use Regular weight with increased line-height (1.5x) to ensure long-form definitions and examples are easy to digest.
- **Labels:** Use uppercase and Medium/SemiBold weights for buttons and micro-copy to maintain a structured, organized feel.

## Layout & Spacing

The design system employs a **Fluid Grid** with a strong emphasis on vertical rhythm. 

- **Grid:** A 12-column grid for desktop and a 4-column grid for mobile devices.
- **Margins:** Large outer margins (20px on mobile) ensure the content feels centered and contained, like a flashcard.
- **Padding:** Internal card padding should be generous (min 24px) to prevent the UI from feeling cramped.
- **Rhythm:** All spacing must be a multiple of the 8px base unit to maintain a mathematical harmony throughout the learning modules.

## Elevation & Depth

Visual hierarchy is established using **Tonal Layers** and **Ambient Shadows**. 

1. **Surface Level 0 (Background):** A soft, neutral-tinted white (#F8FAFC) that acts as the canvas.
2. **Surface Level 1 (Cards):** Pure white surfaces with a soft, diffused shadow (15% opacity of the Primary color) to create a subtle "lift."
3. **Surface Level 2 (Interactive):** Elements that are being dragged or tapped increase their shadow spread and decrease opacity, simulating a physical lift from the page.

Avoid harsh black shadows; instead, use shadows tinted with the primary blue to maintain the friendly, airy vibe.

## Shapes

The shape language is defined by significant **Roundedness**. There are no sharp corners in this design system.

- **Small Components:** Checkboxes and small tags use a 0.5rem radius.
- **Standard Components:** Buttons and input fields use a 1rem (rounded-lg) radius.
- **Large Components:** Learning cards and progress containers use a 1.5rem (rounded-xl) radius.

This "bubbly" geometry reinforces the approachable and safe nature of the learning environment.

## Components

### Action Buttons
- **'Known' Button:** High-emphasis Green (Secondary). Uses a "thicker" bottom border (2px) to simulate a 3D tactile press.
- **'Unknown' Button:** Medium-emphasis Blue (Primary) or Ghost style. Encourages the user that not knowing is part of the process.
- **General Buttons:** Large, pill-shaped or highly rounded, using white text for maximum legibility.

### Cards
- **Learning Cards:** These are the centerpiece. They feature centered typography, generous padding, and subtle 1px borders in a light gray to define boundaries on white backgrounds.

### Progress Indicators
- **Trackers:** Use a thick, rounded bar (8px height). The "filled" portion should use a gradient from Primary to Secondary to visualize the journey from "Learning" to "Mastered."
- **Micro-steps:** Use circular pips that glow when completed.

### Feedback Toasts
- Motivational pop-ups should appear at the bottom of the screen with celebratory icons (stars, trophies) in the Tertiary Amber color.

### Input Fields
- Soft, thick borders (2px) that change from gray to Primary Blue when focused. Labels always sit above the field for clarity.