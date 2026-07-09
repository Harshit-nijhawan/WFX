import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Search, Upload, Image as ImageIcon, Loader2, Sparkles, Sliders, Database, AlertCircle } from 'lucide-react';

interface StyleMatch {
  style_number: string;
  style_name: string;
  category: string;
  fabric: string;
  gsm: number;
  color: string;
  print: string;
  season: string;
  brand: string;
  supplier: string;
  cost: number;
  selling_price: number;
  image_url: string;
  similarity: number;
}

export const ProductSearch: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [textQuery, setTextQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.15);
  const [limit, setLimit] = useState(12);
  const [results, setResults] = useState<StyleMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Indexing states
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setTextQuery(''); // clear text query when uploading image
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange(e.dataTransfer.files[0]);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textQuery && !imageFile) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let response;
      if (imageFile) {
        // Image-to-image similarity search
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('threshold', String(threshold));
        formData.append('limit', String(limit));

        response = await fetch(`${apiUrl}/api/search/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        // Text-to-image semantic search
        response = await fetch(`${apiUrl}/api/search/text`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: textQuery,
            threshold,
            limit
          })
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Search query failed.');
      }

      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const runIndexing = async () => {
    setIndexing(true);
    setIndexResult(null);
    try {
      const response = await fetch(`${apiUrl}/api/search/index`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setIndexResult(`Successfully indexed ${data.success} items!`);
      } else {
        throw new Error(data.error || 'Indexing request failed.');
      }
    } catch (err: any) {
      setIndexResult(`Indexing failed: ${err.message}`);
    } finally {
      setIndexing(false);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Product Search</h1>
          <p className="text-sm text-slate-400 mt-1">Multi-modal query system: search via descriptions or uploaded images</p>
        </div>

        {/* Indexing trigger panel */}
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={runIndexing}
            disabled={indexing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0a0b12] hover:bg-purple-500/5 dark:hover:bg-purple-600/5 border border-slate-200 dark:border-white/5 hover:border-purple-500/20 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 rounded-xl transition disabled:opacity-50 shadow-sm"
          >
            {indexing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            {indexing ? 'Indexing Database...' : 'Run Vector Indexer'}
          </button>
          {indexResult && (
            <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
              {indexResult}
            </span>
          )}
        </div>
      </div>

      {/* Main Search Controller panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Form Panel */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          
          <form onSubmit={handleSearch} className="space-y-6">
            
            {/* Conditional input selector */}
            {!imagePreview ? (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Text Description Query
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    placeholder="Describe what you are looking for (e.g., 'blue floral dress', 'cotton black t-shirt')..."
                    className="w-full bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-450 dark:placeholder-slate-550 focus:outline-none focus:border-purple-500/40 shadow-sm transition-all duration-200"
                  />
                  <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            ) : null}

            {/* OR separator */}
            {!textQuery && !imagePreview ? (
              <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-455 dark:text-slate-500 uppercase">
                <hr className="w-full border-slate-200 dark:border-white/5" />
                <span>OR</span>
                <hr className="w-full border-slate-200 dark:border-white/5" />
              </div>
            ) : null}

            {/* Image upload area */}
            {!textQuery ? (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Visual Image Query
                </label>

                {imagePreview ? (
                  <div className="relative w-48 h-48 border border-purple-500/20 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0d0e16] shadow-sm">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/90 text-white rounded-lg p-1.5 text-xs font-medium border border-white/5 transition"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-white/5 hover:border-purple-500/20 rounded-xl p-8 text-center bg-slate-50 dark:bg-[#0d0e16]/50 hover:bg-purple-500/5 dark:hover:bg-purple-900/5 cursor-pointer transition flex flex-col items-center justify-center gap-3"
                  >
                    <div className="p-3 bg-slate-150 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                      <Upload className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-white">Drag & drop garment image</p>
                      <p className="text-xs text-slate-500 mt-1">or click to browse files (JPEG, PNG up to 5MB)</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageChange(e.target.files[0]);
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            ) : null}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (!textQuery && !imageFile)}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl border border-purple-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Perform Product Search
                </>
              )}
            </button>

          </form>

        </div>

        {/* Right 1 Col: Search Tuners */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-6 shadow-md shadow-black/5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4">
            <Sliders className="w-4 h-4 text-purple-650 dark:text-purple-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Search Parameters</h3>
          </div>

          {/* Slider Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">Similarity Threshold</span>
              <span className="text-purple-600 dark:text-purple-400">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-[#0d0e16] rounded-lg appearance-none cursor-pointer accent-purple-500 transition duration-150"
            />
            <p className="text-[10px] text-slate-500 leading-normal">
              Lower values return more broad matches. Higher values enforce strict similarity.
            </p>
          </div>

          {/* Limit Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">Result Limit</span>
              <span className="text-purple-600 dark:text-purple-400">{limit} items</span>
            </div>
            <input
              type="range"
              min="4"
              max="32"
              step="4"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-[#0d0e16] rounded-lg appearance-none cursor-pointer accent-purple-500 transition duration-150"
            />
          </div>

        </div>

      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Matches Grid Results */}
      <div className="space-y-6">
        {results.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Product Matches</h3>
            <p className="text-xs text-slate-400">Sorted by vector similarity confidence</p>
          </div>
        )}

        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {results.map((item, idx) => (
              <div key={idx} className="glass-card rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col justify-between relative group">
                
                {/* Vector confidence badge */}
                <div className="absolute top-3 left-3 bg-purple-650/95 dark:bg-purple-600/90 border border-purple-500/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                  {(item.similarity * 100).toFixed(0)}% match
                </div>

                {/* Garment Image */}
                <div className="w-full h-48 bg-slate-100 dark:bg-[#0a0b12] overflow-hidden relative border-b border-slate-200 dark:border-white/5">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.style_name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[10px]">No Image Available</span>
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest block">{item.brand}</span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-snug truncate" title={item.style_name}>{item.style_name}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal line-clamp-2">
                      {item.color} • {item.print} • {item.fabric}
                    </p>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100 dark:border-white/5 pt-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Selling Price</span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-white">₹{item.selling_price}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">GSM</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.gsm}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : !loading && (textQuery || imageFile) ? (
          <div className="text-center p-12 bg-white/5 border border-white/5 rounded-2xl">
            <p className="text-slate-400 text-sm">No styles matched the criteria above threshold.</p>
          </div>
        ) : null}
      </div>

    </div>
  );
};
