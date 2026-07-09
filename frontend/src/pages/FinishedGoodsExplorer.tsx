import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  SlidersHorizontal, X, ChevronRight, Check, Search, RotateCcw, 
  Loader2, ImageIcon, FileText
} from 'lucide-react';

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

  // Primary Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination parameters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Applied catalog filters
  const [category, setCategory] = useState('');
  const [fabric, setFabric] = useState('');
  const [brand, setBrand] = useState('');
  const [supplier, setSupplier] = useState('');
  const [color, setColor] = useState('');
  const [season, setSeason] = useState('');
  const [gsmMin, setGsmMin] = useState('');
  const [gsmMax, setGsmMax] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<string>('style_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter popup controls & temporary state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('category');
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  // Available options mapped from backend aggregates
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableFabrics, setAvailableFabrics] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);

  // Temporary filters state for popup modal
  const [tmpCategory, setTmpCategory] = useState('');
  const [tmpFabric, setTmpFabric] = useState('');
  const [tmpBrand, setTmpBrand] = useState('');
  const [tmpSupplier, setTmpSupplier] = useState('');
  const [tmpColor, setTmpColor] = useState('');
  const [tmpSeason, setTmpSeason] = useState('');
  const [tmpGsmMin, setTmpGsmMin] = useState('');
  const [tmpGsmMax, setTmpGsmMax] = useState('');

  // Details tech pack modal states
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [modalDetails, setModalDetails] = useState<ProductDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Scroll sentinel reference
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Initial load of unique options for filtering
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/products/filters`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableCategories(data.categories || []);
          setAvailableFabrics(data.fabrics || []);
          setAvailableBrands(data.brands || []);
          setAvailableSuppliers(data.suppliers || []);
          setAvailableColors(data.colors || []);
          setAvailableSeasons(data.seasons || []);
        }
      } catch (err) {
        console.error('Failed to retrieve catalog search options:', err);
      }
    };
    fetchOptions();
  }, [token, apiUrl]);

  // Main catalog fetching logic
  const fetchProducts = async (pageNumber: number, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: '25', // 25 products per scroll
        sortBy,
        sortOrder
      });

      if (category) params.append('category', category);
      if (fabric) params.append('fabric', fabric);
      if (brand) params.append('brand', brand);
      if (supplier) params.append('supplier', supplier);
      if (color) params.append('color', color);
      if (season) params.append('season', season);
      if (gsmMin) params.append('gsmMin', gsmMin);
      if (gsmMax) params.append('gsmMax', gsmMax);

      const response = await fetch(`${apiUrl}/api/products?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve catalog styles from backend.');
      }

      const data = await response.json();

      setProducts((prev) => {
        if (append) {
          // Remove duplicates using a Map
          const uniqueMap = new Map();
          prev.forEach(item => uniqueMap.set(item.style_number, item));
          data.products.forEach((item: Product) => uniqueMap.set(item.style_number, item));
          return Array.from(uniqueMap.values());
        }
        return data.products;
      });

      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.totalItems);
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching catalog.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch catalog when filter states or sorting parameters modify
  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [category, fabric, brand, supplier, color, season, gsmMin, gsmMax, sortBy, sortOrder]);

  // Fetch next page (incremental scroll)
  useEffect(() => {
    if (page > 1) {
      fetchProducts(page, true);
    }
  }, [page]);

  // Observer sentinel hook for scroll-to-load
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && page < totalPages) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, loading, page, totalPages]);

  // Fetch technical construction sheet details for modal
  const fetchProductDetails = async (styleNum: string) => {
    setSelectedStyle(styleNum);
    setModalLoading(true);
    setModalDetails(null);
    try {
      const response = await fetch(`${apiUrl}/api/products/${styleNum}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setModalDetails(data);
      }
    } catch (err) {
      console.error('Failed to retrieve tech pack details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Clear all filters completely
  const clearFilters = () => {
    setCategory('');
    setFabric('');
    setBrand('');
    setSupplier('');
    setColor('');
    setSeason('');
    setGsmMin('');
    setGsmMax('');
    resetTempFilters();
  };

  // Synchronize temp state when opening modal
  const openFilterModal = () => {
    setTmpCategory(category);
    setTmpFabric(fabric);
    setTmpBrand(brand);
    setTmpSupplier(supplier);
    setTmpColor(color);
    setTmpSeason(season);
    setTmpGsmMin(gsmMin);
    setTmpGsmMax(gsmMax);
    setIsFilterModalOpen(true);
  };

  // Clear modal local filters
  const resetTempFilters = () => {
    setTmpCategory('');
    setTmpFabric('');
    setTmpBrand('');
    setTmpSupplier('');
    setTmpColor('');
    setTmpSeason('');
    setTmpGsmMin('');
    setTmpGsmMax('');
  };

  const closeFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  // Apply modal filters to main catalog state
  const applyFilterModal = () => {
    setCategory(tmpCategory);
    setFabric(tmpFabric);
    setBrand(tmpBrand);
    setSupplier(tmpSupplier);
    setColor(tmpColor);
    setSeason(tmpSeason);
    setGsmMin(tmpGsmMin);
    setGsmMax(tmpGsmMax);
    closeFilterModal();
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'price_asc') {
      setSortBy('selling_price');
      setSortOrder('asc');
    } else if (value === 'price_desc') {
      setSortBy('selling_price');
      setSortOrder('desc');
    } else if (value === 'gsm_asc') {
      setSortBy('gsm');
      setSortOrder('asc');
    } else if (value === 'gsm_desc') {
      setSortBy('gsm');
      setSortOrder('desc');
    } else {
      setSortBy('style_number');
      setSortOrder('asc');
    }
  };

  // Helper count of active catalog filters
  const getActiveFiltersCount = () => {
    let count = 0;
    if (category) count++;
    if (fabric) count++;
    if (brand) count++;
    if (supplier) count++;
    if (color) count++;
    if (season) count++;
    if (gsmMin || gsmMax) count++;
    return count;
  };

  // Tabs mapping inside Filter modal
  const filterTabs = [
    { id: 'category', label: 'Category', hasValue: !!tmpCategory },
    { id: 'fabric', label: 'Fabric', hasValue: !!tmpFabric },
    { id: 'brand', label: 'Brand', hasValue: !!tmpBrand },
    { id: 'supplier', label: 'Supplier', hasValue: !!tmpSupplier },
    { id: 'color', label: 'Color', hasValue: !!tmpColor },
    { id: 'season', label: 'Season', hasValue: !!tmpSeason },
    { id: 'gsm', label: 'GSM Range', hasValue: !!tmpGsmMin || !!tmpGsmMax },
  ];

  // Dynamic filter lists search
  const getFilteredOptions = () => {
    let rawOptions: string[] = [];
    if (activeFilterTab === 'category') rawOptions = availableCategories;
    else if (activeFilterTab === 'fabric') rawOptions = availableFabrics;
    else if (activeFilterTab === 'brand') rawOptions = availableBrands;
    else if (activeFilterTab === 'supplier') rawOptions = availableSuppliers;
    else if (activeFilterTab === 'color') rawOptions = availableColors;
    else if (activeFilterTab === 'season') rawOptions = availableSeasons;

    if (!filterSearchQuery.trim()) return rawOptions;
    return rawOptions.filter((opt) =>
      opt.toLowerCase().includes(filterSearchQuery.toLowerCase())
    );
  };

  // Generate individual active filter chips properties
  const getActiveChips = () => {
    const chips: Array<{ id: string; label: string; remove: () => void }> = [];
    if (category) chips.push({ id: 'category', label: `Category: ${category}`, remove: () => setCategory('') });
    if (fabric) chips.push({ id: 'fabric', label: `Fabric: ${fabric}`, remove: () => setFabric('') });
    if (brand) chips.push({ id: 'brand', label: `Brand: ${brand}`, remove: () => setBrand('') });
    if (supplier) chips.push({ id: 'supplier', label: `Supplier: ${supplier}`, remove: () => setSupplier('') });
    if (color) chips.push({ id: 'color', label: `Color: ${color}`, remove: () => setColor('') });
    if (season) chips.push({ id: 'season', label: `Season: ${season}`, remove: () => setSeason('') });
    if (gsmMin || gsmMax) {
      const label = gsmMin && gsmMax ? `GSM: ${gsmMin} - ${gsmMax}` : gsmMin ? `GSM: ≥ ${gsmMin}` : `GSM: ≤ ${gsmMax}`;
      chips.push({
        id: 'gsm',
        label,
        remove: () => { setGsmMin(''); setGsmMax(''); }
      });
    }
    return chips;
  };

  const activeChips = getActiveChips();

  return (
    <div className="space-y-6">
      
      {/* Page Title Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Finished Goods</h1>
        <p className="text-sm text-slate-400 mt-1">Browse finished products catalog with details, filtering and sorting</p>
      </div>

      {/* Controls Bar: Filters Button, Sorting, Counts */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openFilterModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-98 transition-all duration-150"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {getActiveFiltersCount() > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-[10px] bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-500 font-bold rounded-full border border-blue-500/10">
                {getActiveFiltersCount()}
              </span>
            )}
          </button>
          
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
            Showing <span className="font-semibold text-slate-850 dark:text-white">{products.length}</span> of{' '}
            <span className="font-semibold text-slate-850 dark:text-white">{totalItems}</span> styles
          </span>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 justify-between sm:justify-end border-t border-slate-200 dark:border-0 pt-3 sm:pt-0">
          <span className="text-xs text-slate-550">Sort By</span>
          <select
            onChange={handleSortChange}
            value={sortBy === 'selling_price' ? (sortOrder === 'asc' ? 'price_asc' : 'price_desc') : sortBy === 'gsm' ? (sortOrder === 'asc' ? 'gsm_asc' : 'gsm_desc') : 'default'}
            className="text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-white rounded-lg p-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-655/20 transition-all duration-200 cursor-pointer"
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
        <div className="flex flex-wrap items-center gap-2 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 rounded-lg p-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1">
            Active Filters:
          </span>
          {activeChips.map((chip) => (
            <div
              key={chip.id}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded shadow-sm"
            >
              <span>{chip.label}</span>
              <button
                onClick={chip.remove}
                className="p-0.5 hover:bg-blue-500/10 rounded-full transition"
                title="Remove Filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={clearFilters}
            className="text-[10px] text-blue-600 dark:text-blue-550 hover:text-blue-500 font-semibold uppercase tracking-wider ml-auto pr-1 transition"
          >
            Reset All
          </button>
        </div>
      )}

      {/* Main Grid View */}
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-xs text-red-650 dark:text-red-400">
            {error}
          </div>
        )}
        
        {/* Main Products Loading State (Only for first page) */}
        {loading && page === 1 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400">Retrieving catalog records...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((item) => (
                <div
                  key={item.style_number}
                  onClick={() => fetchProductDetails(item.style_number)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700 transition duration-200 animate-fade-in"
                >
                  {/* Image banner */}
                  <div className="w-full h-48 bg-slate-55 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-hidden relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.style_name} className="w-full h-full object-cover group-hover:scale-102 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-650 gap-2">
                        <ImageIcon className="w-7 h-7" />
                        <span className="text-[10px] font-semibold">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Details Card */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">{item.brand}</span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-snug truncate" title={item.style_name}>{item.style_name}</h4>
                      <div className="flex gap-2 items-center text-[10px] text-slate-500">
                        <span>Style: {item.style_number}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-1">
                        Fabric: {item.fabric}
                      </p>
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-150 dark:border-slate-800 pt-3 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Selling Price</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white">₹{item.selling_price}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">GSM</span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-350">{item.gsm}</span>
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
                  <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-500 animate-spin" />
                  <span>Loading more styles...</span>
                </div>
              ) : page >= totalPages ? (
                <p className="text-xs text-slate-400/80 font-medium">Showing all {totalItems} styles</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-center p-12 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <p className="text-slate-400 text-sm font-medium">No styles matched selected filter criteria.</p>
          </div>
        )}

      </div>

      {/* Details Tech Pack Drawer Modal */}
      {selectedStyle && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Product details & Technical Pack</h3>
                  <span className="text-xs text-slate-550">Style Number: {selectedStyle}</span>
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
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/20 dark:bg-slate-950/20">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-500 dark:text-slate-450">Fetching technical construction sheets...</p>
                </div>
              ) : modalDetails ? (
                <>
                  {/* Style Parameters Overview with Product Image */}
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Column: Product Image */}
                    <div className="w-full md:w-1/3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg overflow-hidden h-60 relative flex items-center justify-center shadow-sm">
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
                    <div className="w-full md:w-2/3 grid grid-cols-2 gap-4 border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-950 text-xs shadow-sm">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Brand</span>
                        <span className="font-semibold text-slate-850 dark:text-white mt-0.5 block">{modalDetails.product.brand}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Style Name</span>
                        <span className="font-semibold text-slate-850 dark:text-white mt-0.5 block">{modalDetails.product.style_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Category</span>
                        <span className="font-semibold text-slate-850 dark:text-white mt-0.5 block">{modalDetails.product.category}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Fabric Type</span>
                        <span className="font-semibold text-slate-850 dark:text-white mt-0.5 block">{modalDetails.product.fabric}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">GSM (Thickness)</span>
                        <span className="font-semibold text-slate-850 dark:text-white mt-0.5 block">{modalDetails.product.gsm} gsm</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Color / Print</span>
                        <span className="font-semibold text-slate-850 dark:text-white mt-0.5 block">{modalDetails.product.color} / {modalDetails.product.print}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Supplier</span>
                        <span className="font-semibold text-slate-850 dark:text-white mt-0.5 block">{modalDetails.product.supplier}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Season</span>
                        <span className="font-semibold text-slate-850 dark:text-white mt-0.5 block">{modalDetails.product.season}</span>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">Selling Price</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">₹{modalDetails.product.selling_price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Pack details */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Technical Specifications</h4>
                    
                    {modalDetails.techPack ? (
                      <div className="space-y-4 text-xs leading-relaxed">
                        <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg space-y-1.5 shadow-sm">
                          <span className="font-bold text-slate-855 dark:text-white">Fabric Specifications:</span>
                          <p className="text-slate-600 dark:text-slate-300">{modalDetails.techPack.fabric_details}</p>
                        </div>
                        
                        <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-lg space-y-1.5 shadow-sm">
                          <span className="font-bold text-slate-855 dark:text-white">Construction Parameters:</span>
                          <p className="text-slate-600 dark:text-slate-300">{modalDetails.techPack.construction}</p>
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-lg space-y-1.5 shadow-sm">
                          <span className="font-bold text-slate-855 dark:text-white">Washing Instructions:</span>
                          <p className="text-slate-600 dark:text-slate-300">{modalDetails.techPack.wash_instructions}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-center shadow-sm">
                        <p className="text-xs text-slate-500">No tech pack sheets mapped for this style number.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <p className="text-xs text-red-500 font-semibold">Failed to load detailed data.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Filters Modal Popup (Amazon style split pane) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-[#0d0e12]/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[520px] max-h-[85vh] rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-5 h-5 text-blue-600 dark:text-blue-500" />
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
              <div className="w-1/3 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 overflow-y-auto py-2">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveFilterTab(tab.id);
                      setFilterSearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-xs font-semibold transition-all relative ${
                      activeFilterTab === tab.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-500 border-r-2 border-blue-500'
                        : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850/40'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <div className="flex items-center gap-1.5">
                      {tab.hasValue && (
                        <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-500 rounded-full" />
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400/70" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Side: Options Selector */}
              <div className="w-2/3 flex flex-col p-6 overflow-hidden bg-white dark:bg-slate-900">
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
                        className="w-full text-xs pl-9 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-800 dark:text-white rounded-lg py-2.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-650/20 transition-all duration-200"
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
                                  ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold'
                                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                              }`}
                            >
                              <span>All {filterTabs.find(t => t.id === activeFilterTab)?.label === 'Category' ? 'Categories' : `${filterTabs.find(t => t.id === activeFilterTab)?.label}s`}</span>
                              {!selectedValue && <Check className="w-3.5 h-3.5 text-blue-650 dark:text-blue-500" />}
                            </button>

                            {/* Render Filtered Options */}
                            {filtered.length > 0 ? (
                              filtered.map((opt, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedValue(opt === selectedValue ? '' : opt)}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs text-left transition duration-150 ${
                                    selectedValue === opt
                                      ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold'
                                      : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-855/50'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {selectedValue === opt && <Check className="w-3.5 h-3.5 text-blue-650 dark:text-blue-500" />}
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
                          className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-white rounded-lg p-3 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 transition-all duration-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Max GSM</label>
                        <input
                          type="number"
                          placeholder="No Maximum"
                          value={tmpGsmMax}
                          onChange={(e) => setTmpGsmMax(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 text-slate-800 dark:text-white rounded-lg p-3 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => { setTmpGsmMin('100'); setTmpGsmMax('200'); }}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-semibold text-slate-655 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-450 hover:bg-slate-100 dark:hover:bg-slate-850 transition"
                      >
                        100 - 200 (Light)
                      </button>
                      <button
                        onClick={() => { setTmpGsmMin('200'); setTmpGsmMax('300'); }}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-semibold text-slate-655 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-450 hover:bg-slate-100 dark:hover:bg-slate-850 transition"
                      >
                        200 - 300 (Heavy)
                      </button>
                      <button
                        onClick={() => { setTmpGsmMin(''); setTmpGsmMax(''); }}
                        className="px-3 py-1.5 bg-red-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 rounded-lg text-[10px] font-semibold text-red-600 dark:text-red-400 hover:text-red-750 transition"
                      >
                        Reset Range
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
              <button
                onClick={resetTempFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/5 dark:hover:bg-red-500/10 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={closeFilterModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white bg-transparent border border-slate-200 dark:border-slate-850 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={applyFilterModal}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition duration-150"
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
