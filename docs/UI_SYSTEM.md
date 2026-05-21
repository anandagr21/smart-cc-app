# UI & Design System

## 1. Design Philosophy

The Smart CC app aims for a **premium, dark-first fintech aesthetic**. The UI should feel fast, precise, and luxurious, inspiring trust in the underlying AI-powered financial recommendations.

### Principles:
- **Clarity over Density**: Do not overwhelm the user. Use whitespace and typography to establish a clear visual hierarchy.
- **Dark-First**: The default theme is dark mode. Use deep, rich blacks and grays (`#0F0F13`, `#1C1C21`) rather than stark `#000000`. Use subtle gradients and glassmorphic overlays for depth.
- **Accents**: Use vibrant, high-contrast accent colors (e.g., electric blue, neon green for cashbacks) sparingly to draw attention to rewards and key actions.

## 2. Custom Primitive Philosophy

- **No Heavy UI Kits**: We do not use massive UI libraries (like NativeBase, UI Kitten, or Material UI).
- **NativeWind**: All styling is driven by NativeWind (Tailwind CSS for React Native).
- **Custom Primitives**: The `frontend/components/` folder holds our own lightweight primitives (`<Button>`, `<Typography>`, `<Card>`). These components encapsulate NativeWind classes and expose clean props (e.g., `variant="primary"`, `size="lg"`).

## 3. Animation Principles

- **Tool**: React Native Reanimated.
- **Style**: "Subtle Premium Motion".
- **Rules**:
  - Animations must have a clear purpose (e.g., guiding the eye, confirming an action, or masking a loading state).
  - Use spring physics for natural, fluid interactions rather than linear easing.
  - Avoid bouncy, slow, or distracting animations.
  - Ideal durations are short (200ms - 400ms).

## 4. Spacing & Typography Principles

- **Spacing**: Strictly adhere to the Tailwind spacing scale (`4`, `8`, `12`, `16`, `24`, `32` px). Do not use arbitrary margin or padding values.
- **Typography**: 
  - Use a modern sans-serif typeface (e.g., Inter, Roboto).
  - Emphasize numbers (amounts, rewards) using slightly larger, bolder font weights.
  - Rely on font size and color opacity (e.g., `text-gray-400`) to differentiate secondary text from primary data.
