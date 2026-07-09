# WFX ERP Platform: Future Improvements & Performance Optimizations

This document outlines architectural recommendations and engineering practices for scaling the WFX AI ERP platform for large-scale enterprise deployments.

---

## 1. Database Scaling & Vector Performance

- **HNSW Vector Indexing tuning:** As catalog item numbers grow, similarity search performance should be optimized by tuning HNSW parameters:
  - Increase `m` (max connections per node) and `ef_construction` (size of dynamic candidate list) during index creation to improve retrieval accuracy.
  - Set `ef_search` dynamically on search connections to control query speed vs. recall.
- **pgvector vs. dedicated Vector Stores:** If embeddings scale beyond 1,000,000 styles, consider migrating to a dedicated vector store (e.g. Pinecone, Qdrant, or Typesense Cloud) to offload memory consumption from the primary transactional PostgreSQL instance.

---

## 2. API Security Hardening

- **Secure raw SQL execution wrapper:**
  - Revoke direct `EXECUTE` privileges on the `exec_sql()` RPC function from `public` and `anon` user roles. Ensure only the backend node server (authenticating via service_role key) can execute queries.
  - Implement read-only schemas and specific PostgreSQL database roles (e.g. `read_only_analyst`) that restrict `exec_sql` from accessing system tables or auth schemas.
- **SQL Sanitization:**
  - Use AST (Abstract Syntax Tree) parsers on the backend to validate that generated queries only contain SELECT actions.
  - Apply row limits (e.g., `LIMIT 100`) on execution queries to prevent Denial of Service (DoS) attacks from queries returning too many rows.

---

## 3. Embedding Indexing Workers

- **Background Workers:** In the current implementation, indexing is triggered via a `/api/search/index` route. For production, new products should be indexed asynchronously.
- **Event-Driven Embeddings Generation:** Setup Supabase Database Webhooks or PostgreSQL triggers to notify a background worker (e.g. BullMQ, Celery, or a serverless function) whenever a new row is added to the `finished_goods` table. The worker should generate the vector embedding and upsert it into the vector table.

---

## 4. Caching & LLM Optimization

- **Semantic Query Caching:** Implement a semantic cache (such as GPTCache or Redis) to store natural language queries and their corresponding SQL translations. If a user asks a similar question (measured by vector similarity), return the cached SQL directly to save LLM tokens and decrease response time.
- **LLM Context Limits:** Keep system prompts clean and token-efficient. If database schemas expand, use a dynamic schema selector (RAG) to inject only the relevant tables into the prompt, rather than sending the entire database catalog in every API request.
