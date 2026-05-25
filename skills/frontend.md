# Frontend Conventions (FINALIZED GOVERNANCE)

> [!IMPORTANT]  
> **ARCHITECTURE FREEZE ALIGNMENT**  
> The architectural styles defined here are **FINAL** and frozen. Do NOT redesign the architecture or introduce new structural styles without explicit critical requirements.

## Tech Stack

- **Framework:** React Native with Expo
- **Routing:** Expo Router (File-based)
- **Styling:** NativeWind (Tailwind for React Native)
- **Animation:** React Native Reanimated
- **State:** React Local State + Zustand (if global)
- **Types:** TypeScript (strict)
- **HTTP:** Axios/fetch via domain feature layer

---

## 1. Feature-First Architecture

The frontend uses a strict **feature-first** organization to prevent folder-bloat.

- **`app/` (Routing Only)**: Expo Router files remain incredibly thin. They exist only to map URLs to screens.
- **`features/` (Domain Logic)**: Each business domain (e.g., `auth`, `transactions`) lives here. A feature owns its internal UI components, hooks, API calls, and state.
- **`components/` (Global Primitives)**: Strictly reserved for truly reusable UI primitives (`<Button>`, `<Typography>`).

### Component Ownership Rules
- If a component is only used by "Transactions" (e.g., `<TransactionRow>`), it MUST live in `features/transactions/components/`.
- If a component is used across multiple features, it belongs in `components/`.

---

## 2. UI & Styling (NativeWind)

- **NativeWind is Canonical**: Write Tailwind classes directly on components.
- **No Heavy Frameworks**: Do not use heavy UI kits like NativeBase or UI Kitten.
- **Custom Primitives**: Build custom lightweight primitives in `components/` and reuse them.
- **Aesthetic**: Aim for a dark-first, premium fintech aesthetic. Use subtle gradients, crisp typography, and deep blacks (`#0F0F13`).

---

## 3. Animation Philosophy (Reanimated)

- **Reanimated is Canonical**: Use `react-native-reanimated` for smooth, native-driven animations.
- **Subtle Premium Motion**: Animations should be fast (200-400ms), subtle, and use spring physics. Avoid bouncy or distracting effects.
- **Purposeful**: Motion should guide the user's eye or confirm an action, never slow them down.

---

## 4. State Management Rules

- **React First**: Use `useState` and `useReducer` for the vast majority of UI state.
- **Zustand for Global**: If state MUST be global (e.g., user session, theming), use Zustand.
- **No Redux**: Avoid massive Redux boilerplate.
- **Colocate Data Fetching**: Data fetching hooks should live close to where they are used (inside `features/<name>/hooks/`).

---

## 5. Dependency Minimization Philosophy

- **Minimize Dependencies**: Every new dependency adds bloat and maintenance risk.
- **Prefer Battle-Tested**: Only use actively maintained, widely adopted MIT/open-source libraries.
- **Avoid Abstraction Leaks**: Do not introduce unnecessary abstractions over React Native primitives unless it solves a massive boilerplate issue (like NativeWind does for styling).

---

## 6. TypeScript Rules

- **No `any` types allowed**
- All component props must be typed with explicit interfaces
- All API response types must be typed
- Use `strict` TypeScript mode

---

## 7. The Thin Client Rule

- Frontend **never computes reward values**.
- Frontend **never applies rules or reads DB directly**.
- All business logic lives in backend only.
- Frontend only handles UI state, rendering, and navigation.