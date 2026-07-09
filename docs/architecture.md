# WFX ERP Platform: System Architecture & Data Flows

This document details the system design, data flows, and structural layout of the WFX AI-Native ERP exploration layer.

---

## 1. System Overview

The platform uses a decoupling model separating the UI client, intermediate REST translation engine, and backing data sources. The backend coordinates calls to large language models (via OpenRouter) and feature vector extraction APIs (via HuggingFace) to build a unified interface for non-technical users.

```
                  +--------------------------------+
                  |     React Frontend (Vite)      |
                  |  (Dashboard, Chat UI, Search)  |
                  +---------------+----------------+
                                  | HTTP REST / SSE (Port 5000)
                                  v
                  +--------------------------------+
                  |     Express Backend (TS)       |
                  |  (Auth, Search, Stats, NLQ)    |
                  +----+----------+------------+---+
                       |          |            |
      Supabase RPCs /  |          | OpenRouter | HuggingFace
      PostgREST Client |          | (Llama 3)  | (CLIP Model)
                       v          v            v
                +------------+ +------------+ +------------+
                |  Database  | |  AI LLM    | | Embedding  |
                | (Supabase) | | (SQL Gen)  | | Generator  |
                +------------+ +------------+ +------------+
```

---

## 2. Core Components

### 2.1 React Frontend client
- **Design System:** Implemented with Tailwind CSS, supporting dark/light mode configurations.
- **Analytical Rendering:** Renders real-time statistics using **Recharts** charts (Area, Bar, Pie/Donut).
- **Infinite Scrolling:** Implemented using `IntersectionObserver` sentinel callbacks in React hooks to load catalog data dynamically.
- **SSE Stream Listener:** Uses `EventSource` on the client to listen for Server-Sent Events from the backend's NLQ endpoint, parsing text tokens and tables dynamically.

### 2.2 Express Backend Layer
- **REST Controller Mapping:** Decouples path definitions into modular express routers.
- **JWT Authorization:** Auth middleware extracts tokens from headers or request queries, validating them against a `JWT_SECRET` to populate session parameters on incoming requests.
- **Multi-Modal Feature Processor:** Leverages **Multer** to parse multipart files, sending raw memory buffers directly to the CLIP API to retrieve vector representations.

### 2.3 Supabase Database (PostgreSQL 17.6)
- **Data Tables:** Custom relational layout matching the ERP schema specifications.
- **pgvector Extension:** Enabled to support cosine distance vector search.
- **SQL Execution Engine RPC (`exec_sql`):** Runs backend SELECT queries securely using JSON aggregation, bypassing RLS safely while applying string validation checks.

---

## 3. Core Data Flows

### 3.1 Natural Language Query Flow (NL2SQL)
```
[User Query] -> [Backend Controller] -> [OpenRouter LLM Translation]
                                                    |
                                                    v
[Execute SQL via exec_sql RPC] <------- [Sanitize & Validate SELECT Query]
            |
            v
[Success?] 
   +-- YES --> [Stream Explanation + SQL Results Table to UI via SSE]
   +-- NO  --> [Trigger Self-Correction Loop: Reprompt LLM with DB Error Code]
```

### 3.2 Multi-Modal Product Search Flow
```
[Text Description]  ---(Text)----> [HuggingFace CLIP API] ---> [512-dim Vector]
                                                                     |
[Garment Image]     ---(Image)---> [HuggingFace CLIP API] -----------+
                                                                     |
                                                                     v
                                                    [Supabase match_finished_goods RPC]
                                                                     |
                                                                     v
[Return Dynamic Similarity Matches] <-------------- [Cosine Similarity Calculation]
```
