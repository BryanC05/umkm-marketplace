# MSME Marketplace — Go Backend Migration Plan

## Overview

This document outlines the plan to migrate the MSME Marketplace backend from **Node.js/Express** to **Go (Golang)**, while keeping both frontends (React web + Expo mobile) completely unchanged. The frontends will continue communicating with the same REST API endpoints — they won't know the backend language changed.

---

## Why Migrate to Go?

### Performance Benefits

| Metric | Node.js (Current) | Go (Expected) |
|---|---|---|
| **Requests/sec** (typical REST) | ~8,000–15,000 | ~50,000–100,000+ |
| **Memory usage** | ~80–200 MB | ~10–30 MB |
| **Cold start time** | 1–3 seconds | <100 ms |
| **Concurrency model** | Single-threaded event loop | Native goroutines (thousands concurrent) |
| **Binary size** | ~150 MB (node_modules) | ~15–20 MB (single binary) |
| **CPU utilisation** | Limited (single core default) | Full multi-core by default |

### Operational Benefits

- **Single binary deployment** — No `node_modules`, no `npm install`. Just copy one file and run it.
- **Lower hosting costs** — Go uses 5–10x less memory, meaning you can use smaller (cheaper) VMs.
- **Type safety** — Compile-time error catching vs runtime errors in JavaScript.
- **Superior concurrency** — Go's goroutines are ideal for WebSocket chat + API serving simultaneously.
- **Zero-dependency runtime** — No need to install Node.js, npm, or manage package versions on the server.
- **Built-in tooling** — `go test`, `go vet`, `go fmt` come included. No need for Jest, ESLint, Prettier.

### Developer Experience Benefits

- **Fast compilation** — Full build in < 2 seconds.
- **Excellent standard library** — HTTP server, JSON handling, cryptography, image processing are all built-in.
- **No callback hell** — Synchronous-looking code with goroutines instead of async/await.
- **Strong ecosystem for backends** — Gin, Echo, GORM, and the official MongoDB Go driver are production-proven.

---

## Current Architecture (Node.js, Legacy Reference)

> This section documents the previous Node.js layout for migration context only.

```
msme-marketplace/backend/
├── server.js                    # Express + Socket.io entrypoint
├── middleware/
│   ├── auth.js                  # JWT authentication middleware
│   └── logoLimiter.js           # Logo generation rate limiter
├── models/                      # Mongoose ODM schemas
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   ├── ChatRoom.js
│   ├── Message.js
│   ├── ForumThread.js
│   ├── ForumReply.js
│   └── Workflow.js
├── routes/                      # Express route handlers
│   ├── auth.js                  # POST /api/auth/login, /register
│   ├── products.js              # CRUD /api/products
│   ├── users.js                 # GET/PUT /api/users
│   ├── orders.js                # CRUD /api/orders
│   ├── chat.js                  # /api/chat rooms & messages
│   ├── forum.js                 # /api/forum threads & replies
│   ├── logo.js                  # /api/logo generation
│   ├── webhooks.js              # /api/webhooks
│   └── workflows.js             # /api/workflows
├── services/
│   └── webhookService.js        # Webhook dispatch service
├── utils/
│   ├── logoGenerator.js         # AI logo generation
│   └── logoCleanup.js           # Scheduled cleanup job
└── uploads/                     # Static file storage
```

### Key Dependencies (Node.js → Go Equivalents)

| Node.js Package | Purpose | Go Equivalent |
|---|---|---|
| `express` | HTTP framework | [Gin](https://github.com/gin-gonic/gin) or [Echo](https://echo.labstack.com/) |
| `mongoose` | MongoDB ODM | [mongo-driver](https://pkg.go.dev/go.mongodb.org/mongo-driver) (official) |
| `socket.io` | WebSocket | [gorilla/websocket](https://github.com/gorilla/websocket) or [melody](https://github.com/olahol/melody) |
| `jsonwebtoken` | JWT auth | [golang-jwt](https://github.com/golang-jwt/jwt) |
| `bcryptjs` | Password hashing | [golang.org/x/crypto/bcrypt](https://pkg.go.dev/golang.org/x/crypto/bcrypt) |
| `multer` | File uploads | Gin built-in multipart parsing |
| `cors` | CORS middleware | Gin CORS middleware |
| `helmet` | Security headers | Custom middleware (trivial in Go) |
| `sharp` | Image processing | [imaging](https://github.com/disintegration/imaging) |
| `axios` | HTTP client (logo API) | `net/http` (standard library) |
| `node-cron` | Scheduled jobs | [gocron](https://github.com/go-co-op/gocron) or `time.Ticker` |
| `validator` | Input validation | [go-playground/validator](https://github.com/go-playground/validator) |
| `dotenv` | Env config | [godotenv](https://github.com/joho/godotenv) or [viper](https://github.com/spf13/viper) |

---

## Proposed Go Architecture

```
msme-marketplace/go-backend/
├── cmd/
│   └── server/
│       └── main.go              # Application entrypoint
├── internal/
│   ├── config/
│   │   └── config.go            # Environment & app configuration
│   ├── database/
│   │   └── mongo.go             # MongoDB connection & helpers
│   ├── middleware/
│   │   ├── auth.go              # JWT authentication
│   │   ├── cors.go              # CORS configuration
│   │   └── ratelimit.go         # Logo generation rate limiter
│   ├── models/                  # Data structures (structs)
│   │   ├── user.go
│   │   ├── product.go
│   │   ├── order.go
│   │   ├── chatroom.go
│   │   ├── message.go
│   │   ├── forum.go
│   │   └── workflow.go
│   ├── handlers/                # HTTP request handlers
│   │   ├── auth.go              # Login, register
│   │   ├── products.go          # Product CRUD
│   │   ├── users.go             # User profiles, nearby
│   │   ├── orders.go            # Order management
│   │   ├── chat.go              # Chat rooms & messages
│   │   ├── forum.go             # Forum threads & replies
│   │   ├── logo.go              # Logo generation
│   │   ├── webhooks.go          # Webhook handling
│   │   └── workflows.go         # Workflow management
│   ├── services/
│   │   ├── logo_generator.go    # AI logo generation client
│   │   ├── logo_cleanup.go      # Background cleanup job
│   │   └── webhook.go           # Webhook dispatch
│   └── websocket/
│       └── hub.go               # WebSocket connection manager
├── go.mod                       # Go module definition
├── go.sum                       # Dependency checksums
├── Makefile                     # Build & dev commands
├── Dockerfile                   # Multi-stage container build
└── .env                         # Environment variables (same format)
```

---

## Migration Phases

### Phase 1: Foundation (Days 1–2)

Set up the Go project skeleton and core infrastructure:

- [ ] Initialize Go module (`go mod init msme-marketplace`)
- [ ] Set up Gin HTTP framework with CORS and security middleware
- [ ] Implement MongoDB connection using the official Go driver
- [ ] Implement JWT authentication middleware
- [ ] Implement the health check endpoint (`GET /api/health`)
- [ ] Set up environment variable loading

### Phase 2: Auth & Users (Days 3–4)

- [ ] Define `User` model struct with BSON tags
- [ ] Implement `POST /api/auth/register` — bcrypt hashing, JWT generation
- [ ] Implement `POST /api/auth/login` — credential validation, JWT response
- [ ] Implement `GET /api/users/profile` — fetch authenticated user
- [ ] Implement `PUT /api/users/profile` — update profile with location
- [ ] Implement `GET /api/users/nearby` — MongoDB geospatial query (`$near`)
- [ ] Implement `GET /api/users/sellers` — list sellers with filtering

### Phase 3: Products (Day 5)

- [ ] Define `Product` model struct
- [ ] Implement full CRUD: `GET`, `POST`, `PUT`, `DELETE` on `/api/products`
- [ ] Implement search with query parameters (category, price range, keyword)
- [ ] Implement image upload handling (multipart form)
- [ ] Implement `GET /api/products/:id` with seller population

### Phase 4: Orders (Day 6)

- [ ] Define `Order` model struct
- [ ] Implement `POST /api/orders` — create order, validate stock
- [ ] Implement `GET /api/orders` — list with buyer/seller filtering
- [ ] Implement `PUT /api/orders/:id/status` — status transitions
- [ ] Implement stock decrement on order placement

### Phase 5: Chat & WebSocket (Days 7–8)

- [ ] Set up gorilla/websocket with connection hub
- [ ] Implement WebSocket authentication (JWT from handshake)
- [ ] Implement room-based messaging (join, leave, send)
- [ ] Implement typing indicators
- [ ] Implement `GET /api/chat/rooms` — list chat rooms
- [ ] Implement `GET /api/chat/rooms/:id/messages` — message history
- [ ] Implement `POST /api/chat/rooms` — create/find room

### Phase 6: Forum (Day 9)

- [ ] Define `ForumThread` and `ForumReply` model structs
- [ ] Implement thread CRUD with pagination
- [ ] Implement reply CRUD
- [ ] Implement category filtering, search, pinning
- [ ] Implement view/like counting

### Phase 7: Logo, Webhooks, Workflows (Day 10)

- [ ] Implement AI logo generation via external API (`net/http` client)
- [ ] Implement logo rate limiting middleware
- [ ] Implement background cleanup job using `time.Ticker`
- [ ] Implement webhook dispatch service
- [ ] Implement workflow CRUD

### Phase 8: Testing & Verification (Days 11–12)

- [ ] Write unit tests for all handlers (`go test`)
- [ ] Write integration tests against a test MongoDB instance
- [ ] Run both frontends (web + mobile) against the Go backend
- [ ] Verify every feature works identically
- [ ] Load test with Go's built-in benchmarking
- [ ] Verify WebSocket chat functionality end-to-end

---

## API Contract (Unchanged)

Both frontends will continue calling the exact same endpoints. No frontend changes required.

| Method | Endpoint | Handler |
|---|---|---|
| `POST` | `/api/auth/register` | `handlers.Register` |
| `POST` | `/api/auth/login` | `handlers.Login` |
| `GET` | `/api/products` | `handlers.ListProducts` |
| `GET` | `/api/products/:id` | `handlers.GetProduct` |
| `POST` | `/api/products` | `handlers.CreateProduct` |
| `PUT` | `/api/products/:id` | `handlers.UpdateProduct` |
| `DELETE` | `/api/products/:id` | `handlers.DeleteProduct` |
| `GET` | `/api/users/profile` | `handlers.GetProfile` |
| `PUT` | `/api/users/profile` | `handlers.UpdateProfile` |
| `GET` | `/api/users/nearby` | `handlers.GetNearbyUsers` |
| `GET` | `/api/users/sellers` | `handlers.ListSellers` |
| `GET` | `/api/orders` | `handlers.ListOrders` |
| `POST` | `/api/orders` | `handlers.CreateOrder` |
| `PUT` | `/api/orders/:id/status` | `handlers.UpdateOrderStatus` |
| `GET` | `/api/chat/rooms` | `handlers.ListChatRooms` |
| `POST` | `/api/chat/rooms` | `handlers.CreateChatRoom` |
| `GET` | `/api/chat/rooms/:id/messages` | `handlers.GetMessages` |
| `GET` | `/api/forum/threads` | `handlers.ListThreads` |
| `POST` | `/api/forum/threads` | `handlers.CreateThread` |
| `POST` | `/api/forum/threads/:id/replies` | `handlers.CreateReply` |
| `POST` | `/api/logo/generate` | `handlers.GenerateLogo` |
| `GET` | `/api/health` | `handlers.HealthCheck` |
| `WS` | `/ws` | `websocket.Hub` |

---

## WebSocket Migration: Socket.io → gorilla/websocket

The most significant change is moving from Socket.io (which has its own protocol) to standard WebSockets.

### What Changes

| Aspect | Socket.io (Current) | gorilla/websocket (Go) |
|---|---|---|
| **Protocol** | Custom Socket.io protocol | Standard WebSocket (`ws://`) |
| **Client library** | `socket.io-client` (auto-reconnect, fallback) | Custom thin client or [reconnecting-websocket](https://github.com/pladaria/reconnecting-websocket) |
| **Message format** | Event-based (`emit('event', data)`) | JSON messages (`{ "type": "event", "data": {} }`) |
| **Room support** | Built-in | Custom implementation (hub pattern) |
| **Auto-reconnect** | Built-in | Client-side implementation needed |

### Frontend Changes Required (Chat Only)

> [!WARNING]
> This is the **only frontend change** needed in the entire migration.

The chat feature on both web and mobile will need a thin WebSocket client wrapper to replace `socket.io-client`. The wrapper would handle:

```javascript
// Before (Socket.io)
socket.emit('send-message', { roomId, message });
socket.on('receive-message', (data) => { ... });

// After (native WebSocket with wrapper)  
ws.send(JSON.stringify({ type: 'send-message', roomId, message }));
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'receive-message') { ... }
};
```

This is a small, isolated change in the chat screen components only.

---

## Database Compatibility

**No database changes required.** The Go backend connects to the same MongoDB instance and reads/writes the same collections with the same document structure.

```go
// Go connects to the same MongoDB URI
client, err := mongo.Connect(ctx, options.Client().ApplyURI(os.Getenv("MONGODB_URI")))
db := client.Database("msme_marketplace")

// Same collections, same documents
usersCol := db.Collection("users")
productsCol := db.Collection("products")
ordersCol := db.Collection("orders")
```

Existing data is fully preserved — zero migration needed.

---

## Deployment Comparison

### Legacy (Node.js, archived reference)
```bash
# Install dependencies
npm install

# Start server
node server.js
# or
npm run dev   # with nodemon for hot reload
```

### After (Go)
```bash
# Build single binary
go build -o msme-server ./cmd/server

# Run it
./msme-server
# That's it. No runtime dependencies.
```

### Docker Comparison

**Node.js** (~300 MB image):
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]
```

**Go** (~15 MB image):
```dockerfile
# Multi-stage build
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:3.19
COPY --from=builder /app/server /server
CMD ["/server"]
```

---

## Testing Strategy

### Unit Tests (Go built-in)
```bash
go test ./internal/handlers/...     # Test all handlers
go test ./internal/services/...     # Test services
go test -cover ./...                # Coverage report
go test -race ./...                 # Race condition detection
go test -bench ./...                # Performance benchmarks
```

### Integration Tests
```bash
# Start test MongoDB (Docker)
docker run -d -p 27018:27017 mongo:7

# Run integration tests against test DB
MONGODB_URI=mongodb://localhost:27018/test go test -tags=integration ./...
```

### End-to-End Verification Checklist
- [ ] Start Go backend on port 5000
- [ ] Run React web (`npm run dev` in frontend/) → verify all pages work
- [ ] Run Expo mobile (`npx expo start`) → verify all screens work
- [ ] Test auth flow (register → login → profile)
- [ ] Test product CRUD (add → edit → delete)
- [ ] Test order flow (cart → checkout → status update)
- [ ] Test real-time chat (send message → receive on other device)
- [ ] Test forum (create thread → reply)
- [ ] Test nearby map (location → seller markers)
- [ ] Test logo generation
- [ ] Test language toggle (EN ↔ ID) — frontend only, should be unaffected

---

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| WebSocket client change | Medium | Small isolated change; test thoroughly |
| MongoDB query differences | Low | Official Go driver supports same query operators |
| JWT token format mismatch | Low | Use same signing algorithm (HS256) and secret |
| File upload handling differences | Low | Gin handles multipart natively |
| Geospatial query syntax | Low | MongoDB `$near` works identically in Go driver |
| Development speed during migration | Medium | Run both backends in parallel during transition |

---

## Parallel Running Strategy

During migration, both backends can run side-by-side:

```bash
# Go backend on port 5000 (primary)
cd go-backend && PORT=5000 go run ./cmd/server

# Go backend on port 5001 (staging/comparison)
cd go-backend && PORT=5001 go run ./cmd/server

# Point frontends at either one to compare
API_HOST=http://localhost:5001  # Switch to Go to test
```

This allows feature-by-feature validation before fully cutting over.

---

## Timeline Summary

| Phase | Duration | Deliverable |
|---|---|---|
| Foundation | 2 days | Project skeleton, DB connection, middleware |
| Auth & Users | 2 days | Authentication + user management |
| Products | 1 day | Full product CRUD + search |
| Orders | 1 day | Order management + stock tracking |
| Chat & WebSocket | 2 days | Real-time messaging |
| Forum | 1 day | Thread & reply management |
| Logo, Webhooks, Workflows | 1 day | Remaining features |
| Testing & Verification | 2 days | Full E2E testing |
| **Total** | **~12 days** | **Complete migration** |
