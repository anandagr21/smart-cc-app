"""
Module: backend.auth
Responsibility: JWT authentication module — security, schemas, service, dependencies.

Architectural Boundaries:
- security.py: Pure crypto/JWT utilities — no DB, no business logic.
- schemas.py: Pydantic request/response contracts only.
- service.py: Orchestrates registration, login, user lookup via repositories.
- dependencies.py: FastAPI Depends callables for route protection.

The auth module is self-contained: routes in api/v1/auth.py delegate to
auth.service.AuthService, which uses auth.security for hashing/tokens
and repositories for persistence.
"""