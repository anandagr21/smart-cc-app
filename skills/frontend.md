# Frontend Conventions

## Tech Stack

- **Framework:** React Native with Expo (file-based routing)
- **State:** Zustand or Redux
- **Types:** TypeScript (strict)
- **HTTP:** Axios/fetch via service layer
- **Routing:** Expo Router

---

## Rules

### TypeScript
- **No `any` types allowed**
- All component props must be typed with explicit interfaces
- All API response types must be typed
- Use `strict` TypeScript mode

### Components
- **Functional components only** (no class components)
- One component per file
- Named exports preferred (no default exports)
- PascalCase for component names: `CardSummary`, `RecommendationCard`

### Hooks
- Custom hooks prefix with `use`: `useCardRecommendation()`, `useTransactions()`
- camelCase naming
- Separate data fetching from UI rendering

### Thin Client Rule
- Frontend **never computes reward values**
- Frontend **never applies rules or reads DB directly**
- All business logic lives in backend only
- Frontend only handles UI state, rendering, navigation

---

## Folder Responsibilities

| Folder | Purpose |
|---|---|
| `app/` | Expo Router file-based routing |
| `components/` | Reusable UI components |
| `hooks/` | Custom React hooks (data fetching, logic) |
| `services/` | API client layer |
| `store/` | Global state management |
| `types/` | TypeScript type definitions |
| `constants/` | Static frontend config |
| `utils/` | Pure utility functions (formatting, etc.) |
| `assets/` | Images, fonts |

---

## Preferred Patterns

### Service Layer Pattern
```typescript
// services/api.ts — base HTTP client
const apiClient = axios.create({ baseURL: config.API_URL })

// services/cardService.ts
export const getCards = async (): Promise<Card[]> => {
  const { data } = await apiClient.get<ApiResponse<Card[]>>('/credit-cards')
  return data.data
}
```

### Hook + Store Pattern
```typescript
// hooks/useCards.ts
const useCards = () => {
  const { cards, setCards } = useCardStore()
  const [loading, setLoading] = useState(false)
  
  const fetchCards = async () => {
    setLoading(true)
    const data = await cardService.getCards()
    setCards(data)
    setLoading(false)
  }
  
  return { cards, loading, fetchCards }
}
```

### Component Pattern
```typescript
interface CardSummaryProps {
  card: Card
  onSelect: (id: string) => void
}

const CardSummary: React.FC<CardSummaryProps> = ({ card, onSelect }) => {
  // ...
}
```

---

## Anti-Patterns

- `any` type usage
- Business logic in components (compute rewards, validate rules)
- Direct API calls from components (use hooks → services)
- Prop drilling beyond 2 levels (use store)
- Class components
- Default exports
- Mixing data fetching with rendering logic

---

## Best Practices from Codebase

- `services/api.ts` centralizes HTTP client configuration
- `store/` separates auth state from card state
- `types/` mirrors backend API response structures
- `components/` are organized by domain (cards, transactions, common)
- Formatters and helpers live in `utils/formatting.ts`
- Static config lives in `constants/config.ts`