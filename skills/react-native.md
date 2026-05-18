# React Native / Expo Conventions

## Tech Stack

- **Framework:** React Native with Expo SDK
- **Routing:** Expo Router (file-based)
- **Language:** TypeScript (strict mode)
- **State:** Zustand or Redux

---

## Rules

### Expo Router (File-Based Routing)
- `app/` directory defines routes via file structure
- `(auth)/` — auth screens (login, register)
- `(tabs)/` — main tab screens
- `_layout.tsx` — shared layout wrapper
- Deep linking configured via Expo Router conventions

### Component Rules
- **Functional components only** — no class components
- One component per file
- PascalCase filenames match component names
- Props always typed with explicit interfaces
- No `any` types

### Styling
- Use `StyleSheet.create()` for static styles
- Inline styles only for dynamic values
- Theme constants in `constants/` directory
- Responsive design via `useWindowDimensions()` or similar

### Performance
- `React.memo()` for pure components
- `useCallback()` / `useMemo()` for expensive computations
- FlatList over ScrollView for long lists
- Lazy loading for non-critical assets

---

## Preferred Patterns

### Screen + Layout Pattern
```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Recommend' }} />
      <Tabs.Screen name="cards" options={{ title: 'My Cards' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
    </Tabs>
  )
}
```

### Component Pattern
```typescript
// components/cards/RecommendationCard.tsx
import { StyleSheet, View, Text } from 'react-native'

interface RecommendationCardProps {
  cardName: string
  rewardAmount: number
  onSelect: () => void
}

export function RecommendationCard({ cardName, rewardAmount, onSelect }: RecommendationCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{cardName}</Text>
      <Text style={styles.reward}>₹{rewardAmount.toFixed(2)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 8 },
  name: { fontSize: 18, fontWeight: '600' },
  reward: { fontSize: 14, color: '#4CAF50' }
})
```

### Hook Pattern
```typescript
// hooks/useCardRecommendation.ts
import { useState } from 'react'
import { recommendationService } from '@/services/recommendationService'

export function useCardRecommendation() {
  const [result, setResult] = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(false)
  
  const getRecommendation = async (merchant: string, amount: number) => {
    setLoading(true)
    const data = await recommendationService.getBestCard(merchant, amount)
    setResult(data)
    setLoading(false)
  }
  
  return { result, loading, getRecommendation }
}
```

---

## State Management

### Store Pattern (Zustand)
```typescript
// store/cardStore.ts
import { create } from 'zustand'

interface CardStore {
  cards: Card[]
  setCards: (cards: Card[]) => void
}

export const useCardStore = create<CardStore>((set) => ({
  cards: [],
  setCards: (cards) => set({ cards })
}))
```

---

## API Client

```typescript
// services/api.ts
import axios from 'axios'
import { API_BASE_URL } from '@/constants/config'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

---

## Anti-Patterns

- Business logic in components or screens
- Direct API calls from components (use hooks → services)
- Prop drilling beyond 2 levels
- `any` types
- Class components
- Default exports
- Inline styles for static values
- Ignoring keyboard avoidance on input screens

---

## Best Practices from Codebase

- Expo Router for file-based navigation
- Services layer encapsulates all API calls
- Hooks separate data fetching from UI
- Zustand stores for global state (auth, cards)
- Types mirror backend API schemas
- Common components in `components/common/`