# TeamBoard —This a  Lightweight Work Management Tool

A full-stack project management tool built with **NestJS**, **React**, and **MongoDB**. Teams can sign up, create projects, and manage tasks using a Kanban-style board.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11, TypeScript, Mongoose |
| Database | MongoDB 7 |
| Auth | JWT (access token) + Passport.js |
| Frontend | React 19, Vite, React Query v5, React Router v6 |
| Dev Ops | Docker Compose |

---

## Quick Start (Local, no Docker)

**Prerequisites:** Node 20+, MongoDB running locally

```bash
# 1. Clone and enter the project
git clone <repo-url> && cd TeamBoard

# 2. Backend
cd backend
cp .env.example .env       # edit JWT_SECRET
npm install
npm run start:dev          # http://localhost:3000
                           # Swagger: http://localhost:3000/docs

# 3. Frontend (new terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

---

## Quick Start (Docker Compose)

```bash
cp backend/.env.example backend/.env   # set JWT_SECRET if desired
docker compose up --build
```

| Service | URL |
|---|---|
| React frontend | http://localhost:5173 |
| NestJS API | http://localhost:3000/api |
| Swagger docs | http://localhost:3000/docs |
| MongoDB | mongodb://localhost:27017/teamboard |

---

## Project Structure

```
TeamBoard/
├── backend/                   NestJS Modular Monolith
│   └── src/
│       ├── auth/              Login, signup, JWT, guards, strategies
│       │   ├── decorators/    @Public(), @CurrentUser()
│       │   ├── dto/           SignupDto, LoginDto
│       │   ├── guards/        JwtAuthGuard (global)
│       │   └── strategies/    LocalStrategy, JwtStrategy
│       ├── users/             User schema + service (no controller — owned by auth)
│       ├── projects/          Project CRUD (owner-scoped)
│       ├── tasks/             Task CRUD (nested under projects)
│       ├── common/
│       │   ├── filters/       AllExceptionsFilter — uniform error shape
│       │   └── interceptors/  TransformInterceptor — wraps all responses in { data, timestamp }
│       ├── config/            Typed env config via @nestjs/config
│       ├── app.module.ts      Root module
│       └── main.ts            Bootstrap: CORS, ValidationPipe, Swagger, global guard
│
├── frontend/                  React + Vite (feature-first)
│   └── src/
│       ├── features/
│       │   ├── auth/          Login/Signup pages + useAuth hooks
│       │   ├── projects/      ProjectsPage + useProjects hooks
│       │   └── tasks/         TasksPage (Kanban board) + useTasks hooks
│       ├── components/        ProtectedRoute
│       ├── services/api.ts    Axios instance with JWT interceptor
│       ├── lib/queryClient.ts React Query client config
│       └── types/index.ts     Shared TypeScript interfaces
│
└── docker-compose.yml         mongo + api + frontend
```

---

## API Reference

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register and receive JWT |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | Required | Get current user |

### Projects

| Method | Route | Description |
|---|---|---|
| GET | `/api/projects` | List projects the user is a member of |
| POST | `/api/projects` | Create a project (creator becomes owner) |
| GET | `/api/projects/:id` | Get project with members |
| PATCH | `/api/projects/:id` | Update name/description/status (owner only) |
| DELETE | `/api/projects/:id` | Delete project (owner only) |

### Tasks

| Method | Route | Description |
|---|---|---|
| GET | `/api/projects/:projectId/tasks` | List tasks for a project |
| POST | `/api/projects/:projectId/tasks` | Create a task |
| GET | `/api/projects/:projectId/tasks/:id` | Get a task |
| PATCH | `/api/projects/:projectId/tasks/:id` | Update task (status, priority, etc.) |
| DELETE | `/api/projects/:projectId/tasks/:id` | Delete a task |

---

## Architecture — Design Decisions

### Modular Monolith (current)

The backend is a **modular monolith**: one NestJS process, but structured so that each domain (Auth, Users, Projects, Tasks) is a self-contained module with its own schema, service, controller, and DTOs. Modules do not reach into each other's internals — they only communicate through exported services via NestJS's dependency injection.

This approach was chosen deliberately over microservices for the following reasons:

1. **Appropriate for current scale** — A team tool at early stage has no traffic justification for distributed systems overhead.
2. **Faster development** — No inter-service networking, serialization, or deployment complexity.
3. **Easier debugging** — One process, one log stream, one debugger.
4. **Microservice-ready by design** — Module boundaries map 1:1 to future service splits (see below).

### Global Guards + `@Public()` Decorator

The JWT guard is applied **globally** in `main.ts` (not per-controller). Routes that don't need auth are opted out with `@Public()`. This pattern  ensures:

- No route is accidentally left unprotected
- Auth is a cross-cutting concern, not a per-controller detail

### Event Emitter for Loose Coupling

`TasksService` emits internal events (`task.created`, `task.updated`) via `@nestjs/event-emitter` instead of calling other services directly. This keeps modules decoupled and makes the evolution to message queues a mechanical swap.

### Response Normalization

Every successful response is wrapped in `{ data: T, timestamp: string }` by the `TransformInterceptor`. Every error returns `{ statusCode, message, path, timestamp }` from the `AllExceptionsFilter`. This gives the frontend a consistent contract regardless of which route it calls.

---

## Evolving to Microservices

The modular structure means splitting into services is a well-defined mechanical process, not a rewrite. Here is how it maps:

```
Current (Modular Monolith)          Future (Microservices)
─────────────────────────────       ──────────────────────────────────────
src/auth/          ─────────────►   auth-service  (port 4001, TCP)
src/users/         ─────────────►   (owned by auth-service)
src/projects/      ─────────────►   projects-service (port 4002, TCP)
src/tasks/         ─────────────►   (merged with projects-service or split)
```

### The Migration Steps

**Step 1** — Extract each module into its own NestJS app:
```bash
nest new auth-service
# copy src/auth/ + src/users/ into it
```

**Step 2** — Replace the NestJS HTTP server with a TCP microservice transport:
```typescript
// auth-service/src/main.ts
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.TCP,
  options: { port: 4001 },
});
```

**Step 3** — Add a new `gateway` NestJS app that proxies HTTP requests to each service:
```typescript
// gateway/src/auth/auth.module.ts
ClientsModule.register([{
  name: 'AUTH_SERVICE',
  transport: Transport.TCP,
  options: { port: 4001 },
}])
```

**Step 4** — Replace `eventEmitter.emit('task.created', ...)` with a Redis pub/sub publish:
```typescript
// Current (monolith)
this.eventEmitter.emit('task.created', payload);

// Future (microservice)
this.redisClient.publish('task.created', JSON.stringify(payload));
```

**Step 5** — Add Docker Compose services for each microservice and Redis:
```yaml
services:
  gateway:       { build: ./gateway, ports: ['3000:3000'] }
  auth-service:  { build: ./auth-service }
  projects-service: { build: ./projects-service }
  redis:         { image: redis:7 }
  mongo:         { image: mongo:7 }
```

### Architecture Diagram (Future State)

```
Client (React :5173)
        │ HTTP
        ▼
[ API Gateway :3000 ]
        │
        ├── TCP ──► [ AuthService :4001 ]
        │                   │
        │               MongoDB (users)
        │
        └── TCP ──► [ ProjectsService :4002 ]
                            │          │
                        MongoDB     Redis pub/sub
                      (projects,    (task events →
                       tasks)        notifications)
```

No module needs to be rewritten — only the communication mechanism changes from in-process function calls to TCP messages. The service contracts (DTOs and interfaces) stay the same.

---

## Trade-offs

| Decision | Trade-off |
|---|---|
| Monolith over microservices | Simpler now; evolution path documented above |
| JWT (stateless) over sessions | No server-side session store needed; token revocation requires blacklist if needed later |
| MongoDB with Mongoose | Flexible schema for rapid iteration; less strict than SQL — enforce constraints at the application layer via DTOs |
| React Query over Redux | Less boilerplate for server state; no manual cache management |
| `@Public()` opt-out pattern | All routes protected by default — safer than opt-in |

---

## Running Tests

```bash
cd backend
npm test              # unit tests
npm run test:cov      # coverage report
```
## DEMO ACCOUNT
ADMIN_NAME=Super Admin
ADMIN_EMAIL=admin@teamboard.dev
ADMIN_PASSWORD=Admin@1234
