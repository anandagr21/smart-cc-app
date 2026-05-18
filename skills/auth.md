# Authentication & Authorization

## Tech Stack

- **Auth:** JWT (JSON Web Tokens)
- **Provider:** `core/auth.py`
- **Middleware:** `core/middleware.py`

---

## Rules

### JWT Flow
1. User authenticates via `/api/v1/auth/login` or `/api/v1/auth/register`
2. Server returns `access_token` (short-lived) and `refresh_token` (long-lived)
3. All authenticated requests include `Authorization: Bearer <access_token>`
4. Expired access tokens refreshed via `/api/v1/auth/refresh`
5. Frontend stores tokens securely (not in localStorage for production)

### Token Claims
- `sub`: user UUID
- `exp`: expiration timestamp
- `iat`: issued at
- `type`: `access` or `refresh`

### Route Protection
- Use FastAPI `Depends(get_current_user)` for protected routes
- Auth dependency extracts user from JWT and injects into route
- Public routes: `/auth/login`, `/auth/register`, `/auth/refresh`

---

## Preferred Patterns

### Auth Dependency
```python
# core/auth.py
async def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> User:
    payload = decode_token(token)
    user_id = payload.get("sub")
    # Fetch user from DB via repository
    return user

# Route usage
@router.get("/credit-cards")
async def get_cards(
    current_user: User = Depends(get_current_user)
):
    # current_user is injected automatically
    pass
```

### Token Management
```python
def create_access_token(user_id: UUID) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
```

---

## Authorization Rules

### Role-Based (if needed)
- Default role: `user`
- Admin role: `admin` (future)
- Use dependency chains: `Depends(require_role("admin"))`

### Resource Ownership
- Users can only access their own cards, transactions
- Service layer verifies ownership: `card.user_id == current_user.id`
- Return `403 Forbidden` if ownership mismatch

---

## Anti-Patterns

- Storing passwords in plain text — always hash with `bcrypt` or `argon2`
- Long-lived access tokens (max 15 minutes)
- Exposing tokens in URLs or logs
- Hardcoded secrets — use environment variables via `core/config.py`
- Skipping auth on endpoints that access user data
- Using symmetric keys in production without rotation strategy

---

## Best Practices from Codebase

- `core/auth.py` centralizes all auth logic (JWT creation, validation, hashing)
- `core/middleware.py` enforces auth at the middleware level
- Auth dependencies are injectable via FastAPI's `Depends()`
- Token secrets loaded from environment variables via `pydantic-settings`
- Frontend auth state managed in `store/authStore.ts`