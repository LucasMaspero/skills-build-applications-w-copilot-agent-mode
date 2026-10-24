# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep the React app thin and declarative. Reuse a small shared API client, render route-specific cards for activities, teams, leaderboard, and workouts, and surface loading, empty, and error states with accessible roles and messages.
- Logic tier decision: Implement the route behavior in the Express service layer so the routes stay minimal and each capability is validated once before reaching Mongo. Business logic should normalize request data, reject invalid IDs and missing records with deliberate 4xx errors, and avoid leaking Mongo cast errors as 500s.
- Data tier decision: Use Mongoose schemas with required fields and refs for users, teams, activities, and workouts. Seed data must be idempotent and preserve any unrelated records already in the database while ensuring the expected OctoFit fixtures exist for the test contract.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and `minutes`; verify both references exist; compute `points` from the submitted duration; persist `user`, `team`, `type`, `minutes`, `points`, and `occurredAt`; and return a 201 activity payload that matches the API contract.
- Team management approach: Require a non-empty team name and store a mascot plus an array of member IDs. Team creation should accept members as IDs, validate the shape, and list teams with their member references intact.
- Leaderboard approach: Aggregate each team’s total points from stored activities, sort descending by total, and assign a 1-based rank while returning `teamName`, `totalPoints`, and `rank` in the payload.
- Workout suggestions approach: Match the requested user email to a seeded user, inspect recent activity patterns and goals, and return the most relevant workout suggestions with `focus` and a descriptive `reason` explaining the match. Unknown users should return a deliberate 4xx response, not a generic 500.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
