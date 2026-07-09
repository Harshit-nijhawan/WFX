import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Send, Terminal, Table, HelpCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  status?: string;
  sql?: string;
  explanation?: string;
  results?: any[];
  isStreaming?: boolean;
}

export const NLQuery: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSql, setExpandedSql] = useState<Record<number, boolean>>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const starterQuestions = [
    "Show me all cotton shirts supplied by ABC Textiles.",
    "Which buyers purchased garments above 220 GSM?",
    "Which supplier has the highest average order value?",
    "Show all black hoodies under ₹900."
  ];

  useEffect(() => {
    // Scroll to bottom on new messages
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Cleanup EventSource on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim() || isProcessing) return;

    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsProcessing(true);

    // Prepare assistant message
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      status: 'Connecting to AI coordinator...',
      isStreaming: true
    };
    setMessages((prev) => [...prev, assistantMsg]);

    const targetIdx = messages.length + 1; // index of assistant message we just pushed

    // Connect to Server-Sent Events endpoint
    const sseUrl = `${apiUrl}/api/nlq/query?query=${encodeURIComponent(textToSend)}&token=${encodeURIComponent(token || '')}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    let streamedContent = '';

    es.addEventListener('status', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[targetIdx]) {
          copy[targetIdx].status = data.message;
        }
        return copy;
      });
    });

    es.addEventListener('sql', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[targetIdx]) {
          copy[targetIdx].sql = data.sql;
        }
        return copy;
      });
    });

    es.addEventListener('results', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[targetIdx]) {
          copy[targetIdx].results = data.results;
        }
        return copy;
      });
    });

    es.addEventListener('token', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      streamedContent += data.token;
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[targetIdx]) {
          copy[targetIdx].content = streamedContent;
        }
        return copy;
      });
    });

    es.addEventListener('done', () => {
      es.close();
      setIsProcessing(false);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[targetIdx]) {
          copy[targetIdx].status = undefined;
          copy[targetIdx].isStreaming = false;
        }
        return copy;
      });
    });

    es.addEventListener('error', (e: MessageEvent) => {
      let errMsg = 'Connection error.';
      try {
        const data = JSON.parse((e as any).data);
        errMsg = data.message || errMsg;
      } catch (err) {
        // Fallback
      }
      es.close();
      setIsProcessing(false);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[targetIdx]) {
          copy[targetIdx].status = undefined;
          copy[targetIdx].content = `Failed to execute: ${errMsg}`;
          copy[targetIdx].isStreaming = false;
        }
        return copy;
      });
    });
  };

  const renderFormattedText = (text: string) => {
    const cleanedText = text.replace(/^(here is a direct, clear, and professional explanation of the query results:|here is a direct, clear, and professional explanation of the results:|here is the explanation:)\s*/i, '').trim();
    // Split text by ** to identify bold segments
    const parts = cleanedText.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      // Odd indices contain the text that was between ** asterisks
      if (index % 2 === 1) {
        return (
          <strong key={index} className="font-semibold text-blue-600 dark:text-blue-450 bg-blue-500/5 dark:bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10 mx-0.5">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const renderResultsTable = (results: any[]) => {
    if (!results || results.length === 0) return null;
    const headers = Object.keys(results[0]);

    return (
      <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-w-full shadow-sm">
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="p-3 capitalize whitespace-nowrap">{h.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {results.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  {headers.map((h, j) => {
                    const cellVal = row[h];
                    const displayed = typeof cellVal === 'object' && cellVal !== null ? JSON.stringify(cellVal) : String(cellVal ?? '');
                    return (
                      <td key={j} className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap" title={displayed}>
                        {displayed}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto relative">
      
      {/* Page Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">NL Explorer</h1>
        <p className="text-sm text-slate-400 mt-1">Ask questions in plain English to generate and execute SQL instantly</p>
      </div>

      {/* Chat Thread Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 mb-4 pb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-600 dark:text-blue-450 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">ERP AI Layer Ready</h3>
              <p className="text-sm text-slate-450 dark:text-slate-400 max-w-sm mt-2">
                Ask about styles, invoices, buyers, sales, or supplier performance metrics.
              </p>
            </div>
            
            {/* Starter Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {starterQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-700 rounded-lg text-xs text-left text-slate-600 dark:text-slate-300 transition flex items-start gap-3 shadow-sm"
                >
                  <HelpCircle className="w-4 h-4 text-blue-650 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-6 space-y-4 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600/5 dark:bg-blue-500/10 border border-blue-500/20 text-blue-905 dark:text-blue-100 rounded-br-none'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300 rounded-bl-none'
                }`}
              >
                
                {/* User Message Text */}
                {msg.role === 'user' && msg.content && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Status indicator */}
                {msg.status && (
                  <div className="flex items-center gap-3 text-xs text-blue-600 dark:text-blue-455">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-550 animate-ping" />
                    <span>{msg.status}</span>
                  </div>
                )}

                {/* Assistant Details (AI response layout) */}
                {msg.role === 'assistant' && (
                  <div className="space-y-4">
                    
                    {/* 1. Generated SQL query (Collapsible) */}
                    {msg.sql && (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 shadow-sm">
                        <button
                          onClick={() => setExpandedSql(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100/50 dark:bg-slate-950 text-xs font-semibold text-slate-650 dark:text-slate-400 hover:bg-slate-200/30 dark:hover:bg-slate-900 transition"
                        >
                          <span className="flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" /> 
                            Generated SQL
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-semibold">
                            {expandedSql[idx] ? 'Hide Query' : 'Show Query'}
                            {expandedSql[idx] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </button>
                        {expandedSql[idx] && (
                          <pre className="p-4 text-xs font-mono text-emerald-700 dark:text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed border-t border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/30">
                            {msg.sql}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* 2. SQL Execution Data-Table */}
                    {msg.results && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <Table className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" /> Query Results ({msg.results.length} row(s))
                        </span>
                        {renderResultsTable(msg.results)}
                      </div>
                    )}

                    {/* 3. Plain English Output Explanation for Non-Tech Users */}
                    {msg.content && (
                      <div className="p-4 bg-blue-500/5 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/20 rounded-lg text-xs space-y-1.5 shadow-sm">
                        <span className="font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider text-[10px]">Results Summary</span>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {renderFormattedText(msg.content)}
                        </p>
                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(query);
        }}
        className="flex-shrink-0 relative mb-4"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isProcessing}
          placeholder="Ask a question about finished goods, invoices, suppliers..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-6 pr-14 py-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 transition disabled:opacity-50 shadow-sm"
        />
        <button
          type="submit"
          disabled={!query.trim() || isProcessing}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
