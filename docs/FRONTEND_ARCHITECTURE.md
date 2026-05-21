# Frontend Architecture

## 1. Feature-First Architecture (FINAL)

The frontend uses a strict **feature-first** organization. This prevents the traditional "horizontal scaling problem" where finding all code related to a single domain requires traversing `components/`, `hooks/`, `store/`, and `api/` directories globally.

### Routing Strategy (`app/`)
- Expo Router (`app/`) is responsible **only** for file-based routing.
- Files inside `app/` should be as thin as possible.
- They act as structural wrappers that import fully self-contained screens from `features/`.

### Feature Ownership (`features/`)
- Each domain (e.g., `auth`, `recommendations`, `transactions`) gets its own folder in `features/`.
- A feature owns its specific:
  - `components/`
  - `hooks/`
  - `api.ts`
  - `store.ts` (if local state logic is complex)
- Features **cannot** import internal components from other features. If something must be shared between features, it belongs in the global `components/` or `lib/`.

### Component Organization (`components/`)
- The global `components/` directory is strictly reserved for **truly shared, generic UI primitives** (e.g., `<Button />`, `<Card />`, `<Typography />`).
- Do not put domain-specific UI (like a `<TransactionRow />`) in the global components directory.

---

## 2. API & State Management Strategy

### API Layer
- **`lib/api.ts`**: Contains the base Axios/fetch instance with interceptors for auth tokens and global error handling.
- **Feature API**: Each feature defines its own API calls (e.g., `features/transactions/api.ts`).
- **Data Fetching Hooks**: Prefer using standard React hooks (`useEffect` or lightweight SWR/React Query equivalents) inside `features/<name>/hooks/` to fetch data, keeping UI components pure.

### State Management
- **Local State**: Prefer standard React `useState`/`useReducer` for UI state.
- **Global State**: If required (e.g., user session, theme toggle), use **Zustand**. Avoid heavy boilerplate like Redux.
- **Dependency Minimization**: Minimize external state libraries. Rely on React's built-in state primitives whenever possible.

---

## 3. UI & Animation Strategy

### Styling (NativeWind)
- **NativeWind** is the canonical styling solution.
- Write Tailwind classes for layout, typography, and colors directly on components.
- Do not use `StyleSheet.create` unless complex dynamic calculations are required.

### Animation (Reanimated)
- **React Native Reanimated** is the canonical animation solution.
- Avoid older animation libraries (like `Animated` from React Native core) for complex transitions.
- **Philosophy**: Animations should be subtle, performant, and enhance the "premium fintech" feel (e.g., soft layout shifts, opacity fades). Avoid excessive, bouncing, or distracting animations.

---

## 4. Dependency Philosophy
- **Minimize Dependencies**: Every new library increases bundle size and maintenance burden.
- **Prefer Battle-Tested**: Stick to widely adopted, MIT/open-source libraries.
- **Avoid Heavy Frameworks**: Do not introduce heavy UI kits (like NativeBase or UI Kitten). We build our own lightweight custom primitives via NativeWind.
