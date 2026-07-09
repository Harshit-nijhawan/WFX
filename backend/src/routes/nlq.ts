import { Router, Response } from 'express';
import { nl2SqlService } from '../services/nl2sql';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * Server-Sent Events (SSE) streaming query endpoint
 * GET /api/nlq/query?query=...&token=...
 */
router.get('/query', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const query = req.query.query as string;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  // Configure Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (for Nginx/Render hosting)

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('status', { message: 'Analyzing query and translating to SQL...' });
    
    // Step 1: Generate SQL and execute with self-correction
    const { sql, results } = await nl2SqlService.generateAndExecuteWithSelfCorrection(query);
    sendEvent('sql', { sql });
    sendEvent('results', { results });

    if (results.length === 0) {
      sendEvent('status', { message: 'No records found matching query criteria.' });
    } else {
      sendEvent('status', { message: `Found ${results.length} record(s).` });
    }

    // Step 2: Stream the summary tokens from OpenRouter (explaining the output for non-tech users)
    sendEvent('status', { message: 'Formulating business results summary...' });

    const resultsSubset = results.slice(0, 30);
    const summaryPrompt = `You are a professional business ERP analyst. Formulate a direct, clear, and professional explanation of the query results for a non-technical business user.
User Question: "${query}"
SQL Query Executed: "${sql}"
Database Results:
${JSON.stringify(resultsSubset, null, 2)}

Instructions:
1. Explain the results in plain, easy-to-understand English so a non-tech person understands the business meaning of the data returned.
2. Keep the answer direct, friendly, and professional (2-3 concise sentences).
3. If currency values are present, format them in INR (₹) or the original currency.
4. If no results are returned, explain clearly that no records match the criteria.
5. Do NOT include any introductory lines like "Here is a direct, clear, and professional explanation of the query results:". Begin the explanation directly with the core business findings.
6. Always highlight the key answer (such as the specific supplier name, buyer name, style code, count, or value that directly answers the user's question) in bold markdown formatting using double asterisks (e.g., **Karachi Textile Mills** or **₹15,00,000**).`;

    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.3,
        stream: true
      })
    });

    if (!openrouterResponse.ok) {
      throw new Error(`OpenRouter summary API error: ${openrouterResponse.status}`);
    }

    const reader = openrouterResponse.body;
    if (!reader) {
      throw new Error('Failed to read response body stream.');
    }

    const decoder = new TextDecoder();
    // Read the streaming chunk from OpenRouter
    for await (const chunk of reader as any) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');
      for (const line of lines) {
        const cleanedLine = line.trim();
        if (cleanedLine.startsWith('data: ')) {
          const dataStr = cleanedLine.substring(6);
          if (dataStr === '[DONE]') {
            sendEvent('done', {});
            break;
          }
          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed.choices[0].delta.content;
            if (token) {
              sendEvent('token', { token });
            }
          } catch (e) {
            // Ignore incomplete chunk parsing errors
          }
        }
      }
    }

    sendEvent('done', {});
    res.end();
  } catch (error: any) {
    console.error('NLQ query stream error:', error.message);
    sendEvent('error', { message: error.message });
    res.end();
  }
});

export default router;
