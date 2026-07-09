import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ChevronRight, SlidersHorizontal, Image as ImageIcon, Loader2, X, FileText, Search, Check, RotateCcw } from 'lucide-react';

interface Product {
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
}

interface FilterOptions {
  categories: string[];
  fabrics: string[];
  colors: string[];
  seasons: string[];
  brands: string[];
  suppliers: string[];
}

interface ProductDetails {
  product: Product;
  techPack: {
    tech_pack_id: string;
    style_number: string;
    fabric_details: string;
    construction: string;
    wash_instructions: string;
  } | null;
}

export const FinishedGoodsExplorer: React.FC = () => {
  const { token, apiUrl } = useAuth();
  
  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [], fabrics: [], colors: [], seasons: [], brands: [], suppliers: []
  });

  // Loading/Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination/Infinite Scroll states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 25;

  // Active / Applied filter selection states
  const [selCategory, setSelCategory] = useState('');
  const [selFabric, setSelFabric] = useState('');
  const [selColor, setSelColor] = useState('');
  const [selSeason, setSelSeason] = useState('');
  const [selBrand, setSelBrand] = useState('');
  const [selSupplier, setSelSupplier] = useState('');
  const [gsmMin, setGsmMin] = useState('');
  const [gsmMax, setGsmMax] = useState('');

  // Sort states
  const [sortBy, setSortBy] = useState('style_number');
  const [sortOrder, setSortOrder] = useState('asc');

  // Filter Modal UI states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('category');
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  // Temporary filter states (used in modal, applied on confirm)
  const [tmpCategory, setTmpCategory] = useState('');
  const [tmpFabric, setTmpFabric] = useState('');
  const [tmpColor, setTmpColor] = useState('');
  const [tmpSeason, setTmpSeason] = useState('');
  const [tmpBrand, setTmpBrand] = useState('');
  const [tmpSupplier, setTmpSupplier] = useState('');
  const [tmpGsmMin, setTmpGsmMin] = useState('');
  const [tmpGsmMax, setTmpGsmMax] = useState('');

  // Detail Modal states
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [modalDetails, setModalDetails] = useState<ProductDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Ref for intersection observer target
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Fetch product catalog
  const fetchCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query string params
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort_by: sortBy,
        sort_order: sortOrder
      });

      if (selCategory) params.append('category', selCategory);
      if (selFabric) params.append('fabric', selFabric);
      if (selColor) params.append('color', selColor);
      if (selSeason) params.append('season', selSeason);
      if (selBrand) params.append('brand', selBrand);
      if (selSupplier) params.append('supplier', selSupplier);
      if (gsmMin) params.append('gsm_min', gsmMin);
      if (gsmMax) params.append('gsm_max', gsmMax);

      const response = await fetch(`${apiUrl}/api/products?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve product data.');
      }

      const data = await response.json();
      const newProducts = data.products || [];

      if (page === 1) {
        setProducts(newProducts);
      } else {
        setProducts((prev) => {
          // Prevent duplicates
          const existingStyleNumbers = new Set(prev.map(p => p.style_number));
          const filteredNew = newProducts.filter((p: Product) => !existingStyleNumbers.has(p.style_number));
          return [...prev, ...filteredNew];
        });
      }
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);

      // Populate filter options dropdowns if not populated yet
      if (data.filters && data.filters.categories) {
        setFilterOptions(data.filters);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [page, sortBy, sortOrder, selCategory, selFabric, selColor, selSeason, selBrand, selSupplier, gsmMin, gsmMax, token, apiUrl]);

  // Infinite scroll intersection observer
  useEffect(() => {
    if (loading || page >= totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loading, page, totalPages]);

  // Fetch individual product details for modal
  const fetchProductDetails = async (styleNumber: string) => {
    setSelectedStyle(styleNumber);
    setModalLoading(true);
    setModalDetails(null);
    try {
      const response = await fetch(`${apiUrl}/api/products/${styleNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load item detail details.');
      const data = await response.json();
      setModalDetails(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const clearFilters = () => {
    setSelCategory('');
    setSelFabric('');
    setSelColor('');
    setSelSeason('');
    setSelBrand('');
    setSelSupplier('');
    setGsmMin('');
    setGsmMax('');
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'price_asc') {
      setSortBy('selling_price');
      setSortOrder('asc');
    } else if (val === 'price_desc') {
      setSortBy('selling_price');
      setSortOrder('desc');
    } else if (val === 'gsm_asc') {
      setSortBy('gsm');
      setSortOrder('asc');
    } else if (val === 'gsm_desc') {
      setSortBy('gsm');
      setSortOrder('desc');
    } else {
      setSortBy('style_number');
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Modal Open/Close/Apply Handlers
  const openFilterModal = () => {
    setTmpCategory(selCategory);
    setTmpFabric(selFabric);
    setTmpColor(selColor);
    setTmpSeason(selSeason);
    setTmpBrand(selBrand);
    setTmpSupplier(selSupplier);
    setTmpGsmMin(gsmMin);
    setTmpGsmMax(gsmMax);
    setFilterSearchQuery('');
    setIsFilterModalOpen(true);
  };

  const closeFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  const applyFilterModal = () => {
    setSelCategory(tmpCategory);
    setSelFabric(tmpFabric);
    setSelColor(tmpColor);
    setSelSeason(tmpSeason);
    setSelBrand(tmpBrand);
    setSelSupplier(tmpSupplier);
    setGsmMin(tmpGsmMin);
    setGsmMax(tmpGsmMax);
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const resetTempFilters = () => {
    setTmpCategory('');
    setTmpFabric('');
    setTmpColor('');
    setTmpSeason('');
    setTmpBrand('');
    setTmpSupplier('');
    setTmpGsmMin('');
    setTmpGsmMax('');
    setFilterSearchQuery('');
  };

  // Helper selectors
  const getActiveFiltersCount = () => {
    let count = 0;
    if (selCategory) count++;
    if (selFabric) count++;
    if (selColor) count++;
    if (selSeason) count++;
    if (selBrand) count++;
    if (selSupplier) count++;
    if (gsmMin || gsmMax) count++;
    return count;
  };

  const getFilteredOptions = () => {
    let list: string[] = [];
    if (activeFilterTab === 'category') list = filterOptions.categories;
    else if (activeFilterTab === 'fabric') list = filterOptions.fabrics;
    else if (activeFilterTab === 'brand') list = filterOptions.brands;
    else if (activeFilterTab === 'supplier') list = filterOptions.suppliers;
    else if (activeFilterTab === 'color') list = filterOptions.colors;
    else if (activeFilterTab === 'season') list = filterOptions.seasons;

    if (!filterSearchQuery) return list;
    return list.filter(item => item.toLowerCase().includes(filterSearchQuery.toLowerCase()));
  };

  // Build active filter chips for display
  const activeChips = [];
  if (selCategory) activeChips.push({ id: 'category', label: `Category: ${selCategory}`, remove: () => { setSelCategory(''); setPage(1); } });
  if (selFabric) activeChips.push({ id: 'fabric', label: `Fabric: ${selFabric}`, remove: () => { setSelFabric(''); setPage(1); } });
  if (selColor) activeChips.push({ id: 'color', label: `Color: ${selColor}`, remove: () => { setSelColor(''); setPage(1); } });
  if (selSeason) activeChips.push({ id: 'season', label: `Season: ${selSeason}`, remove: () => { setSelSeason(''); setPage(1); } });
  if (selBrand) activeChips.push({ id: 'brand', label: `Brand: ${selBrand}`, remove: () => { setSelBrand(''); setPage(1); } });
  if (selSupplier) activeChips.push({ id: 'supplier', label: `Supplier: ${selSupplier}`, remove: () => { setSelSupplier(''); setPage(1); } });
  if (gsmMin || gsmMax) {
    let label = 'GSM: ';
    if (gsmMin && gsmMax) label += `${gsmMin} - ${gsmMax}`;
    else if (gsmMin) label += `>= ${gsmMin}`;
    else label += `<= ${gsmMax}`;
    activeChips.push({ id: 'gsm', label, remove: () => { setGsmMin(''); setGsmMax(''); setPage(1); } });
  }

  // Filter tabs for modal
  const filterTabs = [
    { id: 'category', label: 'Category', hasValue: !!tmpCategory },
    { id: 'fabric', label: 'Fabric', hasValue: !!tmpFabric },
    { id: 'brand', label: 'Brand', hasValue: !!tmpBrand },
    { id: 'supplier', label: 'Supplier', hasValue: !!tmpSupplier },
    { id: 'color', label: 'Color', hasValue: !!tmpColor },
    { id: 'season', label: 'Season', hasValue: !!tmpSeason },
    { id: 'gsm', label: 'GSM Range', hasValue: !!(tmpGsmMin || tmpGsmMax) },
  ];

  return (
    <div className="space-y-8 animate-fade-in relative">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Finished Goods</h1>
        <p className="text-sm text-slate-400 mt-1">Browse finished products catalog with details, filtering and sorting</p>
      </div>

      {/* Controls Bar: Filters Button, Sorting, Counts */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-[#0a0b12] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openFilterModal}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/10 hover:shadow-purple-700/20 active:scale-98 transition-all duration-150"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {getActiveFiltersCount() > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-[10px] bg-white text-purple-600 dark:bg-[#0d0e16] dark:text-purple-400 font-bold rounded-full border border-purple-100 dark:border-white/5">
                {getActiveFiltersCount()}
              </span>
            )}
          </button>
          
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
            Showing <span className="font-semibold text-slate-800 dark:text-white">{products.length}</span> of{' '}
            <span className="font-semibold text-slate-800 dark:text-white">{totalItems}</span> styles
          </span>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 justify-between sm:justify-end border-t border-slate-100 dark:border-0 pt-3 sm:pt-0">
          <span className="text-xs text-slate-500">Sort By</span>
          <select
            onChange={handleSortChange}
            value={sortBy === 'selling_price' ? (sortOrder === 'asc' ? 'price_asc' : 'price_desc') : sortBy === 'gsm' ? (sortOrder === 'asc' ? 'gsm_asc' : 'gsm_desc') : 'default'}
            className="text-xs bg-white dark:bg-[#0d0e16] border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white rounded-lg p-2 outline-none focus:border-purple-500/40 transition-all duration-200 cursor-pointer"
          >
            <option value="default">Default</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="gsm_asc">GSM: Low to High</option>
            <option value="gsm_desc">GSM: High to Low</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-[#07080e]/60 border border-slate-100 dark:border-white/5 rounded-xl p-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1">
            Active Filters:
          </span>
          {activeChips.map((chip) => (
            <div
              key={chip.id}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/30 border border-purple-100/85 dark:border-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full shadow-sm"
            >
              <span>{chip.label}</span>
              <button
                onClick={chip.remove}
                className="p-0.5 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-full transition"
                title="Remove Filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={clearFilters}
            className="text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 font-bold uppercase tracking-wider ml-auto pr-1 transition"
          >
            Reset All
          </button>
        </div>
      )}

      {/* Main Grid View */}
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}
        
        {/* Main Products Loading State (Only for first page) */}
        {loading && page === 1 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-xs text-slate-400">Retrieving catalog records...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((item) => (
                <div
                  key={item.style_number}
                  onClick={() => fetchProductDetails(item.style_number)}
                  className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col justify-between cursor-pointer group animate-fade-in"
                >
                  {/* Image banner */}
                  <div className="w-full h-48 bg-slate-100 dark:bg-[#0a0b12] border-b border-slate-200 dark:border-white/5 overflow-hidden relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.style_name} className="w-full h-full object-cover group-hover:scale-102 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-[10px]">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Details Card */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest block">{item.brand}</span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-snug truncate" title={item.style_name}>{item.style_name}</h4>
                      <div className="flex gap-2 items-center text-[10px] text-slate-500 dark:text-slate-400">
                        <span>Style: {item.style_number}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-1">
                        Fabric: {item.fabric}
                      </p>
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-100 dark:border-white/5 pt-3 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Selling Price</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-white">₹{item.selling_price}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">GSM</span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.gsm}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Sentinel element for infinite scroll */}
            <div ref={observerTarget} className="py-8 flex justify-center items-center">
              {loading && page > 1 ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                  <span>Loading more styles...</span>
                </div>
              ) : page >= totalPages ? (
                <p className="text-xs text-slate-400/80">Showing all {totalItems} styles</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-center p-12 bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl">
            <p className="text-slate-400 text-sm">No styles matched selected filter criteria.</p>
          </div>
        )}

      </div>

      {/* Details Tech Pack Drawer Modal */}
      {selectedStyle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#0a0b12]">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Product details & Technical Pack</h3>
                  <span className="text-xs text-slate-500">Style Number: {selectedStyle}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStyle(null)}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40 dark:bg-[#07080e]/44">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-3">
                  <Loader2 className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-spin" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fetching technical construction sheets...</p>
                </div>
              ) : modalDetails ? (
                <>
                  {/* Style Parameters Overview with Product Image */}
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Column: Product Image */}
                    <div className="w-full md:w-1/3 bg-slate-100 dark:bg-[#0d0e16]/50 border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden h-60 relative flex items-center justify-center shadow-sm">
                      {modalDetails.product.image_url ? (
                        <img 
                          src={modalDetails.product.image_url} 
                          alt={modalDetails.product.style_name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-[10px] font-medium">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Parameters Grid */}
                    <div className="w-full md:w-2/3 grid grid-cols-2 gap-4 border border-slate-200 dark:border-white/5 rounded-xl p-4 bg-white dark:bg-[#0d0e16]/50 text-xs shadow-sm">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Brand</span>
                        <span className="font-semibold text-slate-800 dark:text-white mt-0.5 block">{modalDetails.product.brand}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Style Name</span>
                        <span className="font-semibold text-slate-800 dark:text-white mt-0.5 block">{modalDetails.product.style_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Category</span>
                        <span className="font-semibold text-slate-800 dark:text-white mt-0.5 block">{modalDetails.product.category}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Fabric Type</span>
                        <span className="font-semibold text-slate-800 dark:text-white mt-0.5 block">{modalDetails.product.fabric}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">GSM (Thickness)</span>
                        <span className="font-semibold text-slate-800 dark:text-white mt-0.5 block">{modalDetails.product.gsm} gsm</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Color / Print</span>
                        <span className="font-semibold text-slate-800 dark:text-white mt-0.5 block">{modalDetails.product.color} / {modalDetails.product.print}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Supplier</span>
                        <span className="font-semibold text-slate-800 dark:text-white mt-0.5 block">{modalDetails.product.supplier}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Season</span>
                        <span className="font-semibold text-slate-800 dark:text-white mt-0.5 block">{modalDetails.product.season}</span>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Selling Price</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400 mt-0.5 block">₹{modalDetails.product.selling_price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Pack details */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-white/5 pb-2">Technical Specifications</h4>
                    
                    {modalDetails.techPack ? (
                      <div className="space-y-4 text-xs leading-relaxed">
                        <div className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl space-y-1.5 shadow-sm">
                          <span className="font-bold text-slate-800 dark:text-white">Fabric Specifications:</span>
                          <p className="text-slate-600 dark:text-slate-300">{modalDetails.techPack.fabric_details}</p>
                        </div>
                        
                        <div className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl space-y-1.5 shadow-sm">
                          <span className="font-bold text-slate-800 dark:text-white">Construction Parameters:</span>
                          <p className="text-slate-600 dark:text-slate-300">{modalDetails.techPack.construction}</p>
                        </div>

                        <div className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl space-y-1.5 shadow-sm">
                          <span className="font-bold text-slate-800 dark:text-white">Washing Instructions:</span>
                          <p className="text-slate-600 dark:text-slate-300">{modalDetails.techPack.wash_instructions}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-white dark:bg-[#0a0b12] border border-slate-200 dark:border-white/5 rounded-xl text-center shadow-sm">
                        <p className="text-xs text-slate-500">No tech pack sheets mapped for this style number.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <p className="text-xs text-red-500">Failed to load detailed data.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Filters Modal Popup (Amazon style split pane) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-[#0d0e12]/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0a0b12] w-full max-w-2xl h-[520px] max-h-[85vh] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0d0e16] flex-shrink-0">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Filters</h3>
                  <p className="text-[11px] text-slate-400">Select specifications to refine product listing</p>
                </div>
              </div>
              <button
                onClick={closeFilterModal}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* Left Side: Filter Tabs */}
              <div className="w-1/3 bg-slate-50/80 dark:bg-[#07080e]/60 border-r border-slate-100 dark:border-white/5 overflow-y-auto py-2">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveFilterTab(tab.id);
                      setFilterSearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-xs font-semibold transition-all relative ${
                      activeFilterTab === tab.id
                        ? 'bg-white dark:bg-[#0a0b12] text-purple-600 dark:text-purple-400 border-r-2 border-purple-500'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <div className="flex items-center gap-1.5">
                      {tab.hasValue && (
                        <span className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-pulse" />
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400/70" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Side: Options Selector */}
              <div className="w-2/3 flex flex-col p-6 overflow-hidden bg-white dark:bg-[#0a0b12]">
                {activeFilterTab !== 'gsm' ? (
                  <>
                    {/* Dynamic Search Box for Options */}
                    <div className="relative mb-4 flex-shrink-0">
                      <Search className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={`Search ${filterTabs.find(t => t.id === activeFilterTab)?.label}...`}
                        value={filterSearchQuery}
                        onChange={(e) => setFilterSearchQuery(e.target.value)}
                        className="w-full text-xs pl-9 pr-8 bg-slate-50 dark:bg-[#0d0e16] border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white rounded-lg py-2.5 outline-none focus:border-purple-500/40 transition-all duration-200"
                      />
                      {filterSearchQuery && (
                        <button
                          onClick={() => setFilterSearchQuery('')}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Options checklist scroll wrapper */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                      {(() => {
                        let selectedValue = '';
                        let setSelectedValue: (val: string) => void = () => {};
                        
                        if (activeFilterTab === 'category') { selectedValue = tmpCategory; setSelectedValue = setTmpCategory; }
                        else if (activeFilterTab === 'fabric') { selectedValue = tmpFabric; setSelectedValue = setTmpFabric; }
                        else if (activeFilterTab === 'brand') { selectedValue = tmpBrand; setSelectedValue = setTmpBrand; }
                        else if (activeFilterTab === 'supplier') { selectedValue = tmpSupplier; setSelectedValue = setTmpSupplier; }
                        else if (activeFilterTab === 'color') { selectedValue = tmpColor; setSelectedValue = setTmpColor; }
                        else if (activeFilterTab === 'season') { selectedValue = tmpSeason; setSelectedValue = setTmpSeason; }

                        const filtered = getFilteredOptions();

                        return (
                          <>
                            {/* "All / Clear Option" */}
                            <button
                              onClick={() => setSelectedValue('')}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs text-left transition duration-150 ${
                                !selectedValue
                                  ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-500/30 text-purple-700 dark:text-purple-400 font-semibold'
                                  : 'bg-transparent border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                              }`}
                            >
                              <span>All {filterTabs.find(t => t.id === activeFilterTab)?.label === 'Category' ? 'Categories' : `${filterTabs.find(t => t.id === activeFilterTab)?.label}s`}</span>
                              {!selectedValue && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                            </button>

                            {/* Render Filtered Options */}
                            {filtered.length > 0 ? (
                              filtered.map((opt, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedValue(opt === selectedValue ? '' : opt)}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs text-left transition duration-150 ${
                                    selectedValue === opt
                                      ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-500/30 text-purple-700 dark:text-purple-400 font-semibold'
                                      : 'bg-transparent border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {selectedValue === opt && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                                </button>
                              ))
                            ) : (
                              <div className="py-8 text-center text-xs text-slate-400">
                                No records match search query.
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  /* GSM Range Input View */
                  <div className="flex-1 flex flex-col justify-start space-y-6 pt-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">GSM Range Specs</h4>
                      <p className="text-[11px] text-slate-400">Specify material weight thickness bounds in grams per square meter (GSM)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Min GSM</label>
                        <input
                          type="number"
                          placeholder="No Minimum"
                          value={tmpGsmMin}
                          onChange={(e) => setTmpGsmMin(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-[#0d0e16] border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white rounded-lg p-3 outline-none focus:border-purple-500/40 transition-all duration-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Max GSM</label>
                        <input
                          type="number"
                          placeholder="No Maximum"
                          value={tmpGsmMax}
                          onChange={(e) => setTmpGsmMax(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-[#0d0e16] border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white rounded-lg p-3 outline-none focus:border-purple-500/40 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => { setTmpGsmMin('100'); setTmpGsmMax('200'); }}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-[#0d0e16] border border-slate-200 dark:border-white/5 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
                      >
                        100 - 200 (Light)
                      </button>
                      <button
                        onClick={() => { setTmpGsmMin('200'); setTmpGsmMax('300'); }}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-[#0d0e16] border border-slate-200 dark:border-white/5 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
                      >
                        200 - 300 (Heavy)
                      </button>
                      <button
                        onClick={() => { setTmpGsmMin(''); setTmpGsmMax(''); }}
                        className="px-3 py-1.5 bg-[#fef2f2] dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 rounded-lg text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 transition"
                      >
                        Reset Range
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0d0e16] flex-shrink-0">
              <button
                onClick={resetTempFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition duration-155"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={closeFilterModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-transparent border border-slate-200 dark:border-white/5 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={applyFilterModal}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm shadow-purple-600/10 hover:shadow-purple-700/20 transition duration-150"
                >
                  Apply Filters
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
