# Smart CC App

## Project Overview
Smart CC is an AI-powered fintech application that optimizes credit card usage. It recommends the best card for a given transaction, evaluates cashback and reward points (handling caps, exclusions, and milestones), and provides explanations via an AI agent layer using LangGraph.

## Architecture Summary
The platform consists of a **React Native (Expo)** frontend and a **FastAPI** backend with a PostgreSQL JSONB database. 
Crucially, the architecture strictly separates concerns:
1. **Deterministic Reward Engine**: A pure, stateless engine that performs exact financial calculations (cashback, points, caps).
2. **AI Orchestration Layer**: A LangGraph-based layer that parses intent and generates human-readable explanations, but **never** performs financial calculations.
3. **Core Backend Layer**: Standard API routes, orchestration services, and database repositories.

For complete architectural constraints and guidelines, see the `docs/` folder.

## Folder Explanation
- `docs/`: Mandatory architectural constraints, guidelines, and domain terminology. **Read this first.**
- `backend/`: FastAPI application containing API routes, services, repositories, agents, and the reward engine.
- `frontend/`: React Native (Expo) application with reusable components, hooks, and stores.

## Setup Instructions
*(TODO: Add detailed setup instructions for Docker, Poetry/pip, and Expo)*

1. **Backend**:
   - Install dependencies: `pip install -r requirements.txt` (placeholder)
   - Setup environment variables: `cp backend/.env.example backend/.env`
   - Run server: `uvicorn backend.main:app --reload`
2. **Frontend**:
   - Install dependencies: `npm install`
   - Run app: `npx expo start`

## Future Roadmap
- [ ] Implement deterministic reward engine core functions.
- [ ] Define JSONB rule schemas for dynamic card configurations.
- [ ] Build AI LangGraph agents for recommendation parsing.
- [ ] Implement React Native UI components.
