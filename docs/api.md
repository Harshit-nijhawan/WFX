# WFX ERP Platform: REST API Specifications

This document outlines the API endpoints exposed by the WFX ERP Express backend server.

---

## 1. Authentication Endpoints

### 1.1 Register User
- **URL:** `/api/auth/register`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "user@company.com",
    "password": "securepassword123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "email": "user@company.com"
    }
  }
  ```

### 1.2 Login User
- **URL:** `/api/auth/login`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "user@company.com",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "email": "user@company.com"
    }
  }
  ```

---

## 2. Dashboard Endpoints

### 2.1 Get Dashboard Statistics
- **URL:** `/api/dashboard/stats`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "summary": {
      "totalFinishedGoods": 1000,
      "totalSuppliers": 12,
      "totalBuyers": 12,
      "totalOrders": 1500,
      "totalRevenue": 2450000
    },
    "charts": {
      "monthlyRevenue": [
        { "month": "2026-01", "revenue": 120000 },
        { "month": "2026-02", "revenue": 180000 }
      ],
      "topBuyers": [
        { "name": "Zara", "value": 850000 },
        { "name": "H&M", "value": 620000 }
      ],
      "orderStatus": [
        { "name": "Pending", "value": 450 },
        { "name": "Shipped", "value": 1050 }
      ],
      "supplierRatings": [
        { "name": "Apex Textiles", "rating": 4.8 },
        { "name": "Karachi Textiles", "rating": 4.5 }
      ]
    }
  }
  ```

---

## 3. Product Catalog Explorer Endpoints

### 3.1 Get Catalog Styles (Paginated / Filtered / Sorted)
- **URL:** `/api/products`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page`: Page index (default: `1`)
  - `limit`: Records per query (default: `12`)
  - `sort_by`: Field sorting name (default: `style_number`)
  - `sort_order`: Sorting direction (`asc` or `desc`)
  - `category`, `fabric`, `brand`, `supplier`, `season`, `color` (Filters)
- **Response (200 OK):**
  ```json
  {
    "products": [
      {
        "style_number": "FG0001",
        "style_name": "Classic Denim Jacket",
        "category": "Jackets",
        "selling_price": 2450,
        "gsm": 300
      }
    ],
    "pagination": {
      "totalItems": 1000,
      "totalPages": 84,
      "currentPage": 1,
      "limit": 12
    }
  }
  ```

### 3.2 Get Unique Catalog Filter Options
- **URL:** `/api/products/filters`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "categories": ["Shirts", "Jackets", "Hoodies"],
    "fabrics": ["100% Cotton Denim", "Polyester Blend"],
    "brands": ["Brand A", "Brand B"],
    "suppliers": ["Apex Textiles", "Vendor B"],
    "colors": ["Black", "Blue", "White"],
    "seasons": ["Spring/Summer", "Autumn/Winter"]
  }
  ```

---

## 4. Multi-Modal Search Endpoints

### 4.1 Text Semantic Search
- **URL:** `/api/search/text`
- **Method:** `POST`
- **Headers:** 
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "text": "blue denim cotton jacket",
    "category": "Jackets",
    "gsmMin": 200
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "results": [
      {
        "style_number": "FG0001",
        "style_name": "Classic Denim Jacket",
        "category": "Jackets",
        "similarity": 0.94
      }
    ],
    "searchMode": "semantic"
  }
  ```

### 4.2 Image Similarity Search
- **URL:** `/api/search/image`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** Multipart `form-data` with key `image` holding file buffer.
- **Response (200 OK):**
  ```json
  {
    "results": [
      {
        "style_number": "FG0001",
        "style_name": "Classic Denim Jacket",
        "similarity": 0.88
      }
    ]
  }
  ```

---

## 5. Natural Language Query Endpoints

### 5.1 Natural Language Query Stream (SSE)
- **URL:** `/api/nlq/query`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <token>` (Also supports token verification via query string parameter `?token=...`)
- **Query Parameters:**
  - `query`: The business question (e.g. `Show all pending invoices above 1000`)
- **Response (SSE Stream):**
  Streams JSON event chunks sequentially:
  ```
  event: status
  data: {"message":"Analyzing query and translating to SQL..."}

  event: sql
  data: {"sql":"SELECT * FROM public.sales_invoices WHERE payment_status = 'Pending' AND amount > 1000"}

  event: results
  data: {"results":[...]}

  event: token
  data: {"token":"Here "}

  event: token
  data: {"token":"is a list..."}

  event: done
  data: {}
  ```
