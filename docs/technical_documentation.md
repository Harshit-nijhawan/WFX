# WFX AI ERP Sourcing Platform: Technical Documentation

This document serves as the complete technical specification guide for the WFX AI-Native ERP Exploration Platform. It covers the system architecture, deployment configurations, REST API endpoints, user interface screenshots, and plans for future scaling.

---

## 1. System Architecture

The platform separates the user interface from data processing and AI routing to maintain a modular codebase.

### 1.1 Architecture Diagram

```
+--------------------------------------------------------------+
|                         FRONTEND                             |
|  React (Vite + TypeScript) + Tailwind CSS + Recharts (KPIs)  |
+------------------------------+-------------------------------+
                               | HTTP REST / SSE (EventSource)
                               v
+--------------------------------------------------------------+
|                         BACKEND                              |
|  Node.js Express Server (TypeScript) + Multer (File Buffer)  |
+-------------------+----------+---------------+---------------+
                    |          |               |
   PostgreSQL Client|          | HTTP REST     | HTTP REST
   (Bypasses RLS)   |          | (Llama 3.1)   | (CLIP Model)
                    v          v               v
+-------------------+----+ +---+-----------+ +-+---------------+
|      DATABASE      | |   AI LLM    | |  EMBEDDINGS   |
| Supabase (Postgres)| | (OpenRouter)| | (HuggingFace) |
+------------------------+ +---------------+ +---------------+
```

### 1.2 Core Components

* **React Frontend SPA:** The client-side application built with TypeScript and Tailwind CSS. Analytical dashboards are rendered using **Recharts**. The catalog browser features infinite scroll page loads and dropdown filter controllers.
* **Express Backend Engine:** A TypeScript Node.js server that acts as the primary coordinator. It handles user authentication via JWT, handles multipart file uploads in memory using **Multer**, and exposes REST endpoints.
* **Database (Supabase):** Backed by PostgreSQL 17.6 with the `pgvector` extension enabled for storing and searching vector embeddings.
* **OpenRouter LLM Integration:** Translates natural language questions to valid SQL queries using `meta-llama/llama-3.1-70b-instruct` and summarizes results.
* **HuggingFace CLIP Integration:** Queries the `openai/clip-vit-base-patch32` model to generate 512-dimensional vector representations for both text and image search inputs.

### 1.3 System Data Flows

#### Natural Language to SQL (NL2SQL) Flow
1. The frontend initiates a Server-Sent Events (SSE) connection to `/api/nlq/query?query=...`.
2. The backend sends the database table schema along with the user's question to Llama 3.1 via OpenRouter.
3. The LLM translates the question to a valid PostgreSQL SELECT query.
4. The backend runs this query against Supabase using the `exec_sql()` function.
5. If the query fails, a self-correction loop catches the PostgreSQL error code and requests a corrected query from the LLM.
6. The backend executes the corrected query, retrieves the rows, and streams the conversational answer token-by-token using SSE, alongside the raw data table.

#### Multi-Modal Vector Search Flow
1. The user inputs a text description (e.g., *"blue cotton shirt"*) or uploads an image file.
2. The backend sends the input to HuggingFace CLIP to generate a 512-dimensional vector embedding.
3. The backend matches this vector against the database using Supabase's `match_finished_goods` RPC function.
4. Results are returned based on cosine similarity, filtered against a threshold (0.80), and sorted.

---

## 2. Infrastructure Deployment

The application is deployed across three cloud platforms:

### 2.1 Database Setup (Supabase)
1. Enable the `pgvector` extension under **Extensions** in the Supabase dashboard.
2. Open the SQL Editor and execute the DDL script in `schema.sql` to create all tables, primary/foreign keys, indexes, and RPC functions.

### 2.2 Backend Setup (Render)
1. Create a Web Service on Render pointing to the backend subdirectory.
2. Configure the following environment variables in the dashboard:
   * `NODE_ENV` = `production`
   * `PORT` = `10000`
   * `SUPABASE_URL` = `https://<project-ref>.supabase.co`
   * `SUPABASE_KEY` = `<your-service-role-key-or-anon-key>`
   * `JWT_SECRET` = `<secure-random-hash>`
   * `OPENROUTER_API_KEY` = `<your-openrouter-key>`
   * `HUGGINGFACE_TOKEN` = `<your-huggingface-user-token>`
   * `FRONTEND_URL` = `https://wfx-erp.vercel.app` (your frontend deployment URL, without a trailing slash)

### 2.3 Frontend Setup (Vercel)
1. Deploy the frontend subdirectory to Vercel.
2. Configure the following environment variable in the dashboard:
   * `VITE_API_URL` = `https://wfx-backend.onrender.com` (your backend service URL)

---

## 3. REST API Specifications

### 3.1 Authentication Services

#### Register User
- **URL:** `/api/auth/register` | **Method:** `POST`
- **Payload:** `{"email": "user@company.com", "password": "securepassword123"}`
- **Response (210 Created):** `{"token": "eyJ...", "user": {"userId": "uuid", "email": "..."}}`

#### User Login
- **URL:** `/api/auth/login` | **Method:** `POST`
- **Payload:** `{"email": "user@company.com", "password": "securepassword123"}`
- **Response (200 OK):** `{"token": "eyJ...", "user": {"userId": "uuid", "email": "..."}}`

### 3.2 Analytics & Catalog Explorer

#### Get Dashboard Stats
- **URL:** `/api/dashboard/stats` | **Method:** `GET` | **Header:** `Authorization: Bearer <token>`
- **Response (200 OK):** Returns summary stats (total revenue, order counts) and chart arrays.

#### Get Catalog Styles (Filtered & Sorted)
- **URL:** `/api/products` | **Method:** `GET` | **Header:** `Authorization: Bearer <token>`
- **Query Params:** `page`, `limit`, `sort_by`, `sort_order`, `category`, `fabric`, `brand`, `supplier`, `season`, `color`

#### Get Catalog Filter Options
- **URL:** `/api/products/filters` | **Method:** `GET` | **Header:** `Authorization: Bearer <token>`
- **Response (200 OK):** Returns arrays of distinct categories, fabrics, brands, suppliers, colors, and seasons.

### 3.3 AI Search Services

#### Text-Based Semantic Search
- **URL:** `/api/search/text` | **Method:** `POST` | **Header:** `Authorization: Bearer <token>`
- **Payload:** `{"text": "blue denim cotton jacket", "category": "Jackets", "gsmMin": 200}`
- **Response (200 OK):** Returns matching style arrays and `searchMode: "semantic"`.

#### Image-Based Similarity Search
- **URL:** `/api/search/image` | **Method:** `POST` | **Header:** `Authorization: Bearer <token>`
- **Payload:** Multipart `form-data` with file buffer in key `image`.
- **Response (200 OK):** Returns array of matching styles sorted by similarity score.

#### Natural Language Query (SSE Stream)
- **URL:** `/api/nlq/query` | **Method:** `GET` | **Header:** `Authorization: Bearer <token>`
- **Query Params:** `query` (e.g. `Show all pending invoices above 1000`)
- **Response:** Streams JSON events (`status`, `sql`, `results`, `token`, `done`).

---

## 4. UI Screenshots

This section documents the user interface layout of the deployed application:

#### A. Sourcing Analytics Dashboard
*Displays aggregate ERP statistics and Recharts analytics.*
`![Dashboard Screen](./screenshots/dashboard.png)`

#### B. Natural Language Explorer (NL2SQL Chat)
*Chat interface showing SQL translation, database results, and streaming summaries.*
`![NL Explorer Screen](./screenshots/nl_explorer.png)`

#### C. Multi-Modal Product Search
*Combines semantic text queries and image uploads with structured dropdown filters.*
`![Product Search Screen](./screenshots/product_search.png)`

#### D. Finished Goods Catalog Explorer
*An interactive grid gallery with infinite scrolling, sorting, and detail modals.*
`![Finished Goods Explorer Screen](./screenshots/finished_goods.png)`

---

## 5. Future Scalability Improvements

### 5.1 Tuning HNSW Vector Indexes
* As the Finished Goods catalog grows beyond 10,000 styles, speed up similarity matching by tuning HNSW parameters:
  * Increase `m` (maximum connections per graph node) to improve recall accuracy.
  * Adjust `ef_construction` during index creation to build a more accurate index graph.
  * Adjust `ef_search` on active connections to control query speed vs. recall.

### 5.2 SQL Execution Security
* **Access Control:** Revoke direct `EXECUTE` privileges on `exec_sql()` from public and anonymous database roles. Ensure only the backend Node.js server (using the service role key) can run queries.
* **AST Parsing:** Implement an Abstract Syntax Tree (AST) parser on the backend to validate SQL structure before execution, ensuring queries only perform read operations.

### 5.3 Asynchronous Indexing
* **Database Webhooks:** Set up Supabase Webhooks or database triggers to notify background workers (e.g. BullMQ) whenever a new row is added to the `finished_goods` table.
* **Queue Workers:** Workers should generate CLIP embeddings in the background, keeping the primary API thread free.

### 5.4 Semantic Query Caching
* Implement a caching layer (using Redis) to store natural language queries and their generated SQL translations.
* Calculate the CLIP vector of incoming questions and check the cache. If a match is found, return the cached SQL directly to save LLM tokens and reduce query times.
