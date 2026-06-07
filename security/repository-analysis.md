# Repository Security Analysis

## 1. Architecture Summary

The Smart CC App is an AI-powered fintech platform designed to optimize credit card usage by managing card portfolios, tracking reward limits, and orchestrating intelligent, context-aware rule extraction and validation. The application employs a clean architecture with clear separation of concerns between its layers.

### Technology Stack
- **Backend Framework**: FastAPI (Python 3.11+) with Asyncio support.
- **Frontend Framework**: React Native (Expo) using TypeScript and NativeWind (Tailwind).
- **Database**: PostgreSQL (v16) deployed via Docker, extensively utilizing JSONB for flexible schema storage (e.g., dynamic reward rules). SQLModel/SQLAlchemy is used for ORM.
- **Authentication Model**: Custom JWT (JSON Web Tokens) with `bcrypt` password hashing, as evidenced by dependencies in `pyproject.toml`.
- **Deployment Model**: Containerized utilizing `docker-compose` for local development, featuring PostgreSQL, the FastAPI backend, and an Adminer database management UI.
- **Docker Usage**: The backend employs a multi-stage Dockerfile that drops privileges to a non-root `appuser` for security.
- **AWS Usage**: No direct AWS integration (like `boto3` or `aws-sdk`) is found in the dependencies. The system relies on OpenAI and Google Gemini APIs for intelligent orchestration.

## 2. Trust Boundaries

Trust boundaries delineate where data changes its level of trust (e.g., moving from an untrusted client to a trusted backend). 

1. **Client to Backend API**: The boundary between the React Native frontend (untrusted client) and the FastAPI backend. All incoming HTTP requests cross this boundary and require validation via Pydantic models.
2. **Backend API to AI Agent Layer**: The boundary between the deterministic backend and external LLM Providers (OpenAI, Google Gemini). Responses from LLMs are untrusted and must be structured, parsed, and validated before being saved.
3. **Backend API to External Bank Websites**: The backend extracts rules by scraping card issuer websites (e.g., HDFC, SBI). The raw HTML/content fetched is untrusted and must be scrubbed to prevent injection attacks or SSRF when following URLs.
4. **Backend to Database**: The connection from the FastAPI backend to the PostgreSQL database. Parameterized queries (SQLModel) protect against SQL Injection, but JSONB content requires careful schema validation before insertion.
5. **Adminer UI to Database**: The Docker-compose setup exposes Adminer on port 9001. While this is likely for development only, in a production environment this constitutes a critical trust boundary that must be secured or removed.

## 3. Attack Surface Inventory

The application’s attack surface consists of the various points where an attacker can attempt to inject data or extract information.

* **API Endpoints (FastAPI)**: REST endpoints accessible over the network. Potential for Broken Access Control, IDOR, or Injection if inputs are not strictly validated.
* **Authentication Flow (JWT)**: Login and registration endpoints. Risks include brute-forcing, weak secret keys, or improper token validation.
* **Web Scraping Pipeline**: The feature that ingests URLs or raw HTML (e.g., `fetch_and_clean_card_page`) to extract card intelligence. Susceptible to Server-Side Request Forgery (SSRF) and malicious payload injection if the crawler isn't sandboxed.
* **LLM Prompts and Parsing**: The generative AI layer responsible for extracting rules. Vulnerable to Prompt Injection through malicious payloads hidden in scraped bank pages or user inputs, leading to hallucinated reward limits.
* **Exposed Development Services**: The Adminer container exposed on port `9001` via `docker-compose.yml`. If accidentally deployed to production, it offers a direct interface to the database.
* **Frontend Local Storage**: Secure storage of the JWT on the mobile device. Potential for token theft if device storage is compromised.
