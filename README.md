# Sentinel — AI Content Moderation Platform

A full-stack content moderation system that screens user-submitted images against six policy categories using a multimodal vision LLM, with admin-configurable enforcement, a user appeal workflow, and an analytics dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go + Gin |
| Database | MongoDB |
| Frontend | React + React Router + Axios + Recharts |
| AI | Multimodal vision LLM via OpenAI-compatible chat completions API |
| Auth | JWT, bcrypt password hashing |
| Deployment | Docker + Docker Compose |

---

## Quick Start

### 1. Environment variables

Create `backend/.env`:

```env
MONGO_URI=mongodb://mongo:27017
JWT_SECRET=replace_with_a_long_random_string
PORT=8080

LLM_VISION_API_URL=https://router.huggingface.co/v1/chat/completions
LLM_VISION_MODEL=Qwen/Qwen2.5-VL-7B-Instruct:together
LLM_VISION_API_TOKEN=hf_your_token_here
```

### 2. Run with Docker

```bash
docker-compose up --build
```

### 3. Run locally

```bash
# backend
cd backend && go mod tidy && go run ./cmd/api/main.go

# frontend
cd frontend && npm install && npm run dev
```

---

## Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `PORT` | No (default `8080`) | API port |
| `LLM_VISION_API_URL` | No (has default) | OpenAI-compatible vision endpoint |
| `LLM_VISION_MODEL` | No (has default) | Vision model identifier |
| `LLM_VISION_API_TOKEN` | Yes | Provider API key (falls back to `HF_API_TOKEN`) |

---

## Project Structure

```
backend/
├── cmd/api/             # main.go — entry point
├── internal/
│   ├── config/           # env loading
│   ├── database/          # MongoDB connection
│   ├── dto/                # request/response shapes
│   ├── handlers/             # route handlers
│   ├── middlewares/            # JWT auth, admin guard
│   ├── models/                   # MongoDB document structs
│   ├── repository/                 # DB queries, one file per collection
│   ├── server/                       # Gin router setup
│   └── services/                       # moderator.go — AI moderation engine
├── uploads/                               # submitted images
└── .env

frontend/
├── src/
│   ├── api/              # axios client + per-resource calls
│   ├── components/        # Sidebar, StatusBadge, ProtectedRoute, icons
│   ├── context/             # AuthContext, ToastContext
│   ├── pages/
│   │   ├── auth/               # Login, Register
│   │   ├── user/                 # Submit, History, Detail, My Appeals
│   │   └── admin/                  # Analytics, Appeal Queue, Policies, Submissions
│   ├── App.jsx
│   └── main.jsx
└── vite.config.js
```

---

## Data Model

- **`users`** — `{ _id, name, email, password, role }`
- **`submissions`** — `{ _id, userId, images[], createdAt }`
- **`verdicts`** — `{ _id, submissionId, imageUrl, outcome, policyVersion, categoryResults[], createdAt, overriddenBy? }`
- **`appeals`** — `{ _id, submissionId, userId, reason, status, adminResponse?, createdAt, updatedAt }`
- **`policies`** — `{ _id, category, enabled, threshold, action, version }` (seeded on first run)

Each verdict stores its own `policyVersion` snapshot, so later policy edits never retroactively change past verdicts.

---

## Core Workflows

**Submission → Verdict**: User uploads images → each screened independently by the vision LLM against all 6 categories → confidence compared to each category's threshold → `AutoBlock` action sets outcome `Blocked`, `FlagReview` sets `Flagged` (`Blocked` always wins) → one `Verdict` saved per image.

**Appeals**: User appeals any `Flagged`/`Blocked` submission with a written reason → enters admin's `Pending` queue → admin accepts/rejects with optional response → acceptance overrides all verdicts on that submission to `Approved`.

**Policy Configuration**: Admin toggles each category, sets threshold (0–100%), and sets enforcement (`Auto-Block`/`Flag for Review`). Applies only to future submissions.

**Manual Override**: Admin can directly change any verdict's outcome, independent of the appeal process.

**Analytics**: Live MongoDB aggregations — submission volume/timeline, verdict distribution by outcome and category, appeal resolution rates, top users by submissions and by violations.

---

## AI Model Integration

A single multimodal vision LLM is called once per image via an OpenAI-compatible `chat/completions` endpoint. The prompt embeds the spec's exact category definitions and requires a strict JSON response with a confidence score (0–100) and reason for **all six categories in one call**.

**Default**: Hugging Face's Inference Providers router (`router.huggingface.co/v1/chat/completions`) with `Qwen/Qwen2.5-VL-7B-Instruct:together`. Fully provider-agnostic via env vars — any OpenAI-compatible vision endpoint (e.g. Groq) can be swapped in without a code change.

### Why a single vision LLM instead of HF's classification models

The original plan was CLIP zero-shot classification on HF's free Inference API. In practice:

1. Querying HF's model registry directly (`pipeline_tag=zero-shot-image-classification&inference_provider=hf-inference`) returned **zero** live models — this provider tier no longer hosts zero-shot image classification.
2. The one live image-safety model, `Falconsai/nsfw_image_detection`, is a binary NSFW-only classifier. Tested against a clear self-harm image, it returned 0.03% confidence — empirically confirmed it cannot be repurposed for Self-Harm or Graphic Violence detection.
3. An image-captioning + text-zero-shot fallback was also dead-ended: no image-to-text model is hosted on this provider tier either.

No combination of narrow, single-purpose free classifiers could cover all 6 spec categories — five of six would have been permanently stuck at a hardcoded 0%. A single multimodal vision LLM solves this directly: one model, one call, genuine reasoning across all 6 categories.

### Reliability features

- JSON-only output enforced by prompt + automatic stripping of markdown code fences
- Missing categories in the model's response default to `0%` with an explicit "model did not return a score" reason — never silently dropped
- Confidence values clamped to 0–100 before threshold comparison
- Any provider error fails the request loudly (real HTTP error) rather than defaulting to `Approved` — an earlier version of this service had that exact silent-failure bug, found via structured logging and a deliberate positive test image
- Every classification step is logged: endpoint, model, image size, raw model output, final per-category decision

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | — | Create account |
| POST | `/api/login` | — | Authenticate |
| POST | `/api/submit` | User | Upload images |
| GET | `/api/submissions` | User | List own submissions (filterable) |
| GET | `/api/submissions/:id` | User/Admin | Submission detail |
| POST | `/api/appeals` | User | File an appeal |
| GET | `/api/appeals/my` | User | List own appeals |
| GET | `/api/admin/appeals` | Admin | Appeal queue |
| PATCH | `/api/admin/appeals/:id` | Admin | Accept/reject appeal |
| GET | `/api/admin/policies` | Admin | List policies |
| PUT | `/api/admin/policies/:id` | Admin | Update policy |
| PATCH | `/api/admin/verdicts/:id` | Admin | Override verdict |
| GET | `/api/admin/analytics` | Admin | Platform analytics |
| GET | `/api/admin/users` | Admin | List users |
| GET | `/api/admin/submissions` | Admin | All submissions |

All authenticated routes require `Authorization: Bearer <jwt>`; admin routes require `role: admin`.

---

## Known Limitations

- Analytics computed live, not cached/pre-aggregated
- Vision LLM accuracy not benchmarked against a labeled moderation dataset
- No rate limiting on submission/auth endpoints
- File-type validation is extension-based; malformed files fail at the LLM call rather than at upload

---

## Key Architecture Decisions

- **Go + Gin**: simple routing, strong stdlib HTTP client for the provider calls this service makes
- **Denormalized `Verdict` documents** (not embedded in `Submission`) so verdicts are independently queryable, filterable, and overridable, each with its own immutable policy snapshot
- **JWT with role claims**: stateless API, Docker-friendly
- **Provider-agnostic AI integration** via env vars: a direct response to discovering mid-project that a specific provider's free-tier model lineup is not stable enough to hard-code
- **One LLM call per image covering all categories**, rather than one call per category: lower latency/cost, and a single coherent visual read is more consistent than several independent narrow queries
