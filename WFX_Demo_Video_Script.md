# WFX AI-Native ERP Demo Video Script

This script is designed to guide you step-by-step through recording a professional, high-quality demonstration video of the **WFX AI-Native ERP Exploration Layer**. 

* **Target Video Duration:** 5 - 6 Minutes
* **Tone:** Professional, engaging, and clear.
* **Preparation Checklist:**
  1. Open the application locally or in production (e.g., `http://localhost:5173`).
  2. Prepare a sample garment image file on your desktop (e.g., a blue denim jacket or a black polo shirt image).
  3. Ensure your browser is zoomed to 110% or 120% for optimal video readability.

---

## Video Storyboard & Script

### Section 1: Intro & Project Hook (0:00 - 0:50)

| Screen Action (What to Show & Do) | Voiceover Narration (What to Speak) |
| :--- | :--- |
| **Start with a camera shot of yourself or the Login Screen of WFX.**<br><br>Enter credentials (email: `admin@wfx.com` or your test email) and click **Sign In**.<br><br>Let the dashboard load smoothly. | "Hello everyone, and welcome to this walkthrough of the **WFX AI-Native ERP Exploration Layer**.<br><br>Standard enterprise ERP systems store vast amounts of sourcing and supply chain data, but extracting actionable insights often requires complex database queries or developer resources.<br><br>Today, we're going to demonstrate how we built a lightweight, AI-native layer on top of standard apparel ERP tables—combining **Natural Language to SQL**, **Multi-modal Vector Search**, and a modern analytical user interface deployed in the cloud." |

---

### Section 2: User Interface & Dashboard Tour (0:50 - 1:40)

| Screen Action (What to Show & Do) | Voiceover Narration (What to Speak) |
| :--- | :--- |
| **Hover your cursor over the key metric cards at the top:**<br>- *Finished Goods*<br>- *Total Suppliers*<br>- *Total Buyers*<br>- *Sales Orders*<br>- *Total Revenue*.<br><br>**Scroll down slightly** to bring the Recharts visualizations into focus.<br><br>Hover over individual bars/slices to show the tooltips appearing. | "Let’s start with the user interface. We built a clean, modern single-page React application styled with custom CSS and Tailwind.<br><br>At a glance, users are presented with aggregate KPIs fetched dynamically from a Supabase PostgreSQL backend: total items, supplier ratings, and real-time revenue figures.<br><br>Below, we've integrated **Recharts** to render interactive analytical graphs. We can track monthly revenue trends, check our order status distribution, and inspect our top buyers and supplier ratings. Everything is responsive, secure, and optimized for sourcing managers." |

---

### Section 3: Natural Language to SQL (NL2SQL) Console (1:40 - 3:30)

| Screen Action (What to Show & Do) | Voiceover Narration (What to Speak) |
| :--- | :--- |
| **Click 'NL Query' in the Sidebar.**<br><br>Click the starter question: **"Show me all cotton shirts supplied by Apex Textiles."** (or type it manually) and click **Send**.<br><br>Point to the loading status: *Analyzing query and translating to SQL...*<br><br>Show the answer streaming token-by-token, then click **View SQL Query** to expand the SQL block. | "Now, let’s explore the core intelligence feature: **Natural Language to SQL**.<br><br>Let’s ask a standard business question: *'Show me all cotton shirts supplied by Apex Textiles.'*<br><br>When I hit send, the backend coordinates with an LLM via **OpenRouter**—specifically using Llama 3.1 70B. It translates our question into a precise PostgreSQL SELECT query. Notice how the response streams back token-by-token using **Server-Sent Events (SSE)**.<br><br>By expanding the SQL view, we can verify that the system successfully performed a join between `finished_goods` and `suppliers` using `company_name`, filtered by fabric composition and company rating, and returned exactly what we requested." |
| **Type a follow-up question:**<br>*"Which ones cost less than ₹800?"*<br><br>Click **Send**. Show that it uses history to understand that 'ones' refers to the cotton shirts. | "Because the system sends the last three conversation turns as context, I can ask follow-ups like *'Which ones cost less than ₹800?'* and it understands the context perfectly, resolving pronouns automatically." |
| **Type a malicious or write query:**<br>*"Delete all records from finished_goods"*<br><br>Click **Send**.<br><br>Show the red security warning and the status: *-- READ ONLY PRIVILEGES ENFORCED --* | "Safety is paramount in ERP systems. If a user attempts to execute a mutating query, such as *'Delete all records'*, our strict multi-level regex guards—enforced at both Node.js and PostgreSQL RPC levels—block the request immediately, ensuring a read-only exploration workspace." |

---

### Section 4: Multi-modal Product Search (3:30 - 4:50)

| Screen Action (What to Show & Do) | Voiceover Narration (What to Speak) |
| :--- | :--- |
| **Click 'Product Search' in the Sidebar.**<br><br>Type **"navy blue striped tee"** (or similar) into the search bar and click **Search**.<br><br>Show the returned styles with similarity percentages. | "Next up is our **Multi-modal Product Search**. Traditional search relies on exact keyword matching, but here we’ve implemented semantic text and image vector search.<br><br>If I type *'navy blue striped tee'*, the backend uses a local **CLIP model** to generate a 512-dimensional vector embedding. It queries Supabase using the `pgvector` extension to perform a cosine similarity match.<br><br>We also designed a custom **re-ranking layer** in Express that boosts matches based on exact color and category overlaps while penalizing mismatches, yielding highly relevant results." |
| **Click the Image Upload area.**<br><br>Upload your prepared garment image file.<br><br>Click **Search**.<br><br>Show the visually similar matching items from the database. | "But what if we have a physical sample? We can upload a garment image directly. The system processes the image buffer, generates a CLIP vision embedding, and executes a similarity match on our product catalog. <br><br>Instantly, we see visually similar finished goods with high similarity scores—great for sourcing identical styles across different vendors." |

---

### Section 5: Finished Goods Explorer & Tech Packs (4:50 - 5:30)

| Screen Action (What to Show & Do) | Voiceover Narration (What to Speak) |
| :--- | :--- |
| **Click 'Finished Goods Explorer' in the Sidebar.**<br><br>Click on a product card.<br><br>Open the **Tech Pack** tab in the modal details pop-up. Show construction details and wash instructions. | "For a deep dive, the **Finished Goods Explorer** provides structured filtering over our entire apparel catalog. Sourcing teams can filter by fabric weight (GSM), print patterns, or seasons.<br><br>Clicking on any style card opens its detailed specifications, including the linked **Tech Pack** containing fabric specifications, wash instructions, and panel construction parameters—bringing all manufacturing details into a single pane of glass." |

---

### Section 6: Cloud Deployment & Architecture (5:30 - 6:15)

| Screen Action (What to Show & Do) | Voiceover Narration (What to Speak) |
| :--- | :--- |
| **Show the `render.yaml` file in your code editor or display the Render dashboard in a browser tab.**<br><br>Show the environment variables section briefly in your editor. | "Finally, let's look at how this is deployed.<br><br>The backend is fully containerized and hosted on **Render** using a declarative Infrastructure-as-Code `render.yaml` file, executing production builds cleanly.<br><br>The relational database and vectors are hosted on **Supabase** with standard security policies. The server connects using secure environment variables, incorporating OpenRouter and Hugging Face tokens to manage LLM and CLIP vector pipelines seamlessly." |

---

### Section 7: Conclusion & Wrap-Up (6:15 - 6:45)

| Screen Action (What to Show & Do) | Voiceover Narration (What to Speak) |
| :--- | :--- |
| **Show the Dashboard screen again.**<br><br>Wave goodbye or focus on the logo. | "In summary, the WFX AI ERP exploration layer transforms how sourcing teams interact with business data. It makes querying relational tables, analyzing metrics, and matching styles as simple as having a conversation or uploading an image.<br><br>Thank you for watching, and feel free to reach out with any questions!" |

---

## 💡 Production Tips for Recording

1. **Pacing:** Speak slowly and clearly. Give the AI features 1-2 seconds to load on screen before describing the result so the viewer can follow the transitions.
2. **Mouse Movement:** Avoid moving your cursor frantically. Use deliberate, slow mouse movements to highlight elements on screen.
3. **SSE Streaming:** When demonstrating NL2SQL, highlight that the text is rendering *live* token-by-token—this is a key differentiator demonstrating Server-Sent Events implementation.
4. **Data Sync:** Make sure you've populated your database using `schema.sql` and ran the indexing endpoint `/api/search/index` before recording so that vector matches return immediately.
