-- ============================================================================
-- WFX AI ERP DATABASE SCHEMA DEFINITION
-- Description: Complete SQL DDL for reproducing the WFX ERP Database.
--              Includes referential integrity, indexes, and vector functions.
-- ============================================================================

-- 0. Enable pgvector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. Tables Creation
-- ============================================================================

-- A. Buyers Table
CREATE TABLE IF NOT EXISTS public.buyers (
    buyer_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    country TEXT,
    buyer_category TEXT,
    CONSTRAINT buyers_pkey PRIMARY KEY (buyer_id),
    CONSTRAINT buyers_company_name_key UNIQUE (company_name)
);

-- B. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    supplier_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    country TEXT,
    contact TEXT,
    lead_time_days BIGINT,
    rating DOUBLE PRECISION,
    CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id),
    CONSTRAINT suppliers_company_name_key UNIQUE (company_name)
);

-- C. Finished Goods Table
CREATE TABLE IF NOT EXISTS public.finished_goods (
    style_number TEXT NOT NULL,
    style_name TEXT NOT NULL,
    category TEXT,
    fabric TEXT,
    gsm BIGINT,
    color TEXT,
    print TEXT,
    season TEXT,
    brand TEXT,
    supplier TEXT,
    cost DOUBLE PRECISION,
    selling_price DOUBLE PRECISION,
    image_url TEXT,
    CONSTRAINT finished_goods_pkey PRIMARY KEY (style_number),
    CONSTRAINT fk_finished_goods_supplier FOREIGN KEY (supplier) 
        REFERENCES public.suppliers(company_name) ON UPDATE CASCADE ON DELETE SET NULL
);

-- D. Finished Goods Embeddings (Vector Table)
CREATE TABLE IF NOT EXISTS public.finished_goods_embeddings (
    style_number TEXT NOT NULL,
    embedding vector(512),
    CONSTRAINT finished_goods_embeddings_pkey PRIMARY KEY (style_number),
    CONSTRAINT fk_embeddings_style_number FOREIGN KEY (style_number) 
        REFERENCES public.finished_goods(style_number) ON DELETE CASCADE
);

-- E. Tech Packs Table
CREATE TABLE IF NOT EXISTS public.tech_packs (
    tech_pack_id TEXT NOT NULL,
    style_number TEXT,
    fabric_details TEXT,
    construction TEXT,
    wash_instructions TEXT,
    CONSTRAINT tech_packs_pkey PRIMARY KEY (tech_pack_id),
    CONSTRAINT fk_tech_packs_style_number FOREIGN KEY (style_number) 
        REFERENCES public.finished_goods(style_number) ON DELETE CASCADE
);

-- F. Sales Orders Table
CREATE TABLE IF NOT EXISTS public.sales_orders (
    order_number TEXT NOT NULL,
    buyer TEXT,
    style_number TEXT,
    quantity BIGINT,
    unit_price DOUBLE PRECISION,
    shipment_date TEXT, -- Stored as text for date matching or simple parsing
    status TEXT,
    CONSTRAINT sales_orders_pkey PRIMARY KEY (order_number),
    CONSTRAINT fk_sales_orders_buyer FOREIGN KEY (buyer) 
        REFERENCES public.buyers(company_name) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_sales_orders_style_number FOREIGN KEY (style_number) 
        REFERENCES public.finished_goods(style_number) ON DELETE SET NULL
);

-- G. Sales Invoices Table
CREATE TABLE IF NOT EXISTS public.sales_invoices (
    invoice_number TEXT NOT NULL,
    sales_order TEXT,
    amount DOUBLE PRECISION,
    currency TEXT,
    payment_status TEXT,
    CONSTRAINT sales_invoices_pkey PRIMARY KEY (invoice_number),
    CONSTRAINT fk_sales_invoices_order FOREIGN KEY (sales_order) 
        REFERENCES public.sales_orders(order_number) ON DELETE SET NULL
);

-- H. Users Table (Authentication)
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (user_id),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- ============================================================================
-- 2. Indexes & Performance Optimization
-- ============================================================================

-- Standard B-Tree Indexes for Foreign Keys / Join fields
CREATE INDEX IF NOT EXISTS idx_finished_goods_supplier ON public.finished_goods(supplier);
CREATE INDEX IF NOT EXISTS idx_tech_packs_style_number ON public.tech_packs(style_number);
CREATE INDEX IF NOT EXISTS idx_sales_orders_buyer ON public.sales_orders(buyer);
CREATE INDEX IF NOT EXISTS idx_sales_orders_style_number ON public.sales_orders(style_number);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_order ON public.sales_invoices(sales_order);

-- Vector Index for Semantic Matching (HNSW with Cosine Distance)
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON public.finished_goods_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- 3. Stored Procedures & RPC Functions
-- ============================================================================

-- RPC A: SQL Query Executor (Security Definer with restricted syntax blocks)
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result json;
BEGIN
    -- Strict regex validation at the DB level for safety
    IF sql_query ~* '\m(insert|update|delete|drop|truncate|alter|create|grant|revoke|vacuum|analyze)\M' THEN
        RAISE EXCEPTION 'Security restriction: Only SELECT/WITH queries are allowed.';
    END IF;

    -- Execute query and aggregate to JSON
    EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$function$;

-- RPC B: Vector Search for finished goods similarity mapping
CREATE OR REPLACE FUNCTION public.match_finished_goods(
    query_embedding vector, 
    match_threshold double precision, 
    match_count integer
)
 RETURNS TABLE(
    style_number text, 
    style_name text, 
    category text, 
    fabric text, 
    gsm bigint, 
    color text, 
    print text, 
    season text, 
    brand text, 
    supplier text, 
    cost double precision, 
    selling_price double precision, 
    image_url text, 
    similarity double precision
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        fg.style_number,
        fg.style_name,
        fg.category,
        fg.fabric,
        fg.gsm,
        fg.color,
        fg.print,
        fg.season,
        fg.brand,
        fg.supplier,
        fg.cost,
        fg.selling_price,
        fg.image_url,
        (1 - (fge.embedding <=> query_embedding))::double precision AS similarity
    FROM public.finished_goods fg
    JOIN public.finished_goods_embeddings fge ON fg.style_number = fge.style_number
    WHERE 1 - (fge.embedding <=> query_embedding) > match_threshold
    ORDER BY fge.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$function$;
