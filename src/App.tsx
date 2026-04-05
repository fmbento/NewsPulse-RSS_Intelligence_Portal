import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, TrendingUp, Newspaper, Clock, ExternalLink, AlertCircle, Loader2, ChevronRight, X, Languages, Check, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import Cookies from 'js-cookie';
import he from 'he';
import DOMPurify from 'dompurify';

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source?: string;
  imageUrl?: string;
  imageAlt?: string;
  tags?: string[];
}

const LANGUAGES = [
  { 
    id: 'English', 
    label: 'English', 
    flags: (
      <div className="flex gap-1">
        <svg className="w-5 h-3.5 rounded-sm shadow-sm" viewBox="0 0 60 30">
          <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
          <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
        </svg>
        <svg className="w-5 h-3.5 rounded-sm shadow-sm" viewBox="0 0 7410 3900">
          <rect width="7410" height="3900" fill="#3c3b6e"/>
          <path d="M0,450H7410M0,1050H7410M0,1650H7410M0,2250H7410M0,2850H7410M0,3450H7410" stroke="#fff" strokeWidth="300"/>
          <path d="M0,150H7410M0,750H7410M0,1350H7410M0,1950H7410M0,2550H7410M0,3150H7410M0,3750H7410" stroke="#b22234" strokeWidth="300"/>
          <rect width="2964" height="2100" fill="#3c3b6e"/>
        </svg>
      </div>
    )
  },
  { 
    id: 'Português', 
    label: 'Português', 
    flags: (
      <div className="flex gap-1">
        <svg className="w-5 h-3.5 rounded-sm shadow-sm" viewBox="0 0 600 400">
          <rect width="240" height="400" fill="#006600"/>
          <rect x="240" width="360" height="400" fill="#FF0000"/>
          <circle cx="240" cy="200" r="80" fill="#FFFF00"/>
        </svg>
        <svg className="w-5 h-3.5 rounded-sm shadow-sm" viewBox="0 0 1000 700">
          <rect width="1000" height="700" fill="#009739"/>
          <path d="M500,50 L950,350 L500,650 L50,350 Z" fill="#fedd00"/>
          <circle cx="500" cy="350" r="175" fill="#012169"/>
        </svg>
      </div>
    )
  },
  { 
    id: 'Deutsch', 
    label: 'Deutsch', 
    flags: (
      <svg className="w-5 h-3.5 rounded-sm shadow-sm" viewBox="0 0 5 3">
        <rect width="5" height="3" y="0" fill="#000"/>
        <rect width="5" height="2" y="1" fill="#D00"/>
        <rect width="5" height="1" y="2" fill="#FFCE00"/>
      </svg>
    )
  },
  { 
    id: 'Français', 
    label: 'Français', 
    flags: (
      <svg className="w-5 h-3.5 rounded-sm shadow-sm" viewBox="0 0 3 2">
        <rect width="1" height="2" x="0" fill="#002395"/>
        <rect width="1" height="2" x="1" fill="#fff"/>
        <rect width="1" height="2" x="2" fill="#ED2939"/>
      </svg>
    )
  },
  { 
    id: 'Español', 
    label: 'Español', 
    flags: (
      <svg className="w-5 h-3.5 rounded-sm shadow-sm" viewBox="0 0 750 500">
        <rect width="750" height="500" fill="#c60b1e"/>
        <rect width="750" height="250" y="125" fill="#ffc400"/>
      </svg>
    )
  },
  { 
    id: 'Italiano', 
    label: 'Italiano', 
    flags: (
      <svg className="w-5 h-3.5 rounded-sm shadow-sm" viewBox="0 0 3 2">
        <rect width="1" height="2" x="0" fill="#009246"/>
        <rect width="1" height="2" x="1" fill="#fff"/>
        <rect width="1" height="2" x="2" fill="#ce2b37"/>
      </svg>
    )
  },
];

const COOKIE_NAME = 'newspulse_languages';
const THEME_COOKIE_NAME = 'newspulse_theme';

interface TrendingTopic {
  key: string;
  doc_count: number;
}

const DescriptionRenderer = ({ item, darkMode, isModal = false }: { item: NewsItem; darkMode: boolean; isModal?: boolean }) => {
  const isGoogleNews = item.source?.startsWith('Google News:');
  
  if (isGoogleNews) {
    try {
      const decoded = he.decode(item.description);
      
      // Configure DOMPurify to add target="_blank" to all links
      DOMPurify.addHook('afterSanitizeAttributes', function (node) {
        if ('target' in node) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      });

      const sanitized = DOMPurify.sanitize(decoded, {
        ADD_ATTR: ['target', 'rel'],
      });

      return (
        <div 
          className={`${isModal ? 'text-sm md:text-base' : 'text-sm line-clamp-2'} leading-relaxed google-news-html [&_a]:text-orange-500 [&_a]:hover:underline [&_ul]:list-disc [&_ul]:ml-4`}
          dangerouslySetInnerHTML={{ __html: sanitized }} 
        />
      );
    } catch (e) {
      console.error('Error decoding HTML:', e);
    }
  }
  
  return (
    <span className={isModal ? '' : 'line-clamp-2'}>
      {item.description.replace(/<[^>]*>?/gm, '')}
    </span>
  );
};

export default function App() {
  const [selectedLangs, setSelectedLangs] = useState<string[]>(() => {
    const saved = Cookies.get(COOKIE_NAME);
    return saved ? JSON.parse(saved) : LANGUAGES.map(l => l.id);
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = Cookies.get(THEME_COOKIE_NAME);
    return saved ? saved === 'dark' : true;
  });
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [searchResults, setSearchResults] = useState<NewsItem[]>([]);
  const [totalRecords, setTotalRecords] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'river' | 'search'>('river');
  const [selectedImage, setSelectedImage] = useState<NewsItem | null>(null);

  const riverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    
    // WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'NEW_NEWS') {
          console.log('[WS] Received fresh news update');
          setLatestNews(message.data);
        }
      } catch (e) {
        console.error('[WS] Error parsing message:', e);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Connection closed. Retrying in 5s...');
      setTimeout(() => {
        // Simple way to trigger a reconnect logic if needed, 
        // but for now we'll rely on the next mount or manual refresh
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, []);

  const fetchWithTimeout = async (resource: string, options: any = {}) => {
    const { timeout = 10000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  };

  useEffect(() => {
    Cookies.set(COOKIE_NAME, JSON.stringify(selectedLangs), { expires: 365 });
    
    // Re-fetch when languages change
    if (activeTab === 'river') {
      fetchInitialData();
    } else if (activeTab === 'search' && searchQuery) {
      const e = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(e);
    }
  }, [selectedLangs]);

  useEffect(() => {
    Cookies.set(THEME_COOKIE_NAME, darkMode ? 'dark' : 'light', { expires: 365 });
  }, [darkMode]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    // Fetch stats first as it's usually the fastest
    try {
      const statsRes = await fetchWithTimeout('/api/stats', { timeout: 10000 });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setTotalRecords(statsData.count);
      }
    } catch (e) {
      console.error('Stats fetch failed or timed out');
    }

    try {
      // Fetch latest and trending in parallel with individual error handling
      const langsParam = selectedLangs.join(',');
      const [latestRes, trendingRes] = await Promise.all([
        fetchWithTimeout(`/api/latest?langs=${encodeURIComponent(langsParam)}`, { timeout: 30000 }).catch(e => ({ ok: false, statusText: e.message })),
        fetchWithTimeout('/api/trending', { timeout: 30000 }).catch(e => ({ ok: false, statusText: e.message }))
      ]);

      if (latestRes.ok) {
        const latestData = await (latestRes as Response).json();
        setLatestNews(latestData);
      } else {
        console.error('Latest news failed');
        setLatestNews(MOCK_NEWS);
      }

      if (trendingRes.ok) {
        const trendingData = await (trendingRes as Response).json();
        setTrending(trendingData);
      } else {
        console.error('Trending failed');
        setTrending(MOCK_TRENDING);
      }

      if (!latestRes.ok && !trendingRes.ok) {
        throw new Error('Both news and trending services are currently unavailable.');
      }

    } catch (err: any) {
      const isLocalhost = (process.env.ELASTICSEARCH_URL || '').includes('localhost') || !process.env.ELASTICSEARCH_URL;
      const baseMsg = isLocalhost 
        ? 'Could not connect to Elasticsearch at localhost:9200.'
        : 'Connection to Elasticsearch is taking too long or failed.';
      
      setError(`${baseMsg} Details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLatest = async () => {
    try {
      const res = await fetchWithTimeout('/api/latest', { timeout: 10000 });
      if (res.ok) {
        const data = await res.json();
        setLatestNews(data);
      }
    } catch (err) {
      console.error('Auto-refresh failed or timed out');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setActiveTab('search');
    setSearchPage(0);
    setHasMoreSearch(true);
    try {
      const langsParam = selectedLangs.join(',');
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&langs=${encodeURIComponent(langsParam)}&from=0&size=50`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.items);
        setHasMoreSearch(data.hasMore);
      }
    } catch (err) {
      console.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const loadMoreSearch = async () => {
    if (isLoadingMore || !hasMoreSearch || !searchQuery) return;
    
    setIsLoadingMore(true);
    const nextPage = searchPage + 1;
    const from = nextPage * 50;
    
    try {
      const langsParam = selectedLangs.join(',');
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&langs=${encodeURIComponent(langsParam)}&from=${from}&size=50`);
      if (res.ok) {
        const data = await res.json();
        if (data.items.length === 0 && !data.hasMore) {
          setHasMoreSearch(false);
        } else {
          setSearchResults(prev => [...prev, ...data.items]);
          setSearchPage(nextPage);
          setHasMoreSearch(data.hasMore);
        }
      }
    } catch (err) {
      console.error('Load more failed');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = (node: HTMLDivElement | null) => {
    if (isSearching || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreSearch) {
        loadMoreSearch();
      }
    }, { threshold: 0.1 });
    if (node) observer.current.observe(node);
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-orange-500/30 transition-colors duration-300 ${
      darkMode ? 'bg-[#0a0a0a] text-[#e0e0e0]' : 'bg-[#f8f9fa] text-[#212529]'
    }`}>
      {/* Header */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-50 transition-colors duration-300 ${
        darkMode ? 'border-white/10 bg-black/50' : 'border-black/10 bg-white/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center font-bold text-black shadow-lg shadow-orange-600/20">NP</div>
            <h1 className={`text-xl font-bold tracking-tighter uppercase ${darkMode ? 'text-white' : 'text-black'}`}>NewsPulse</h1>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-white/40' : 'text-black/40'}`} />
            <input
              type="text"
              placeholder="Search historical news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500/50 transition-all text-sm ${
                darkMode 
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20' 
                  : 'bg-black/5 border-black/10 text-black placeholder:text-black/30'
              }`}
            />
          </form>

          <div className={`flex items-center gap-4 text-xs font-mono ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${
                darkMode ? 'bg-white/5 hover:bg-white/10 text-orange-400' : 'bg-black/5 hover:bg-black/10 text-orange-600'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              LIVE
            </div>
            <div className="hidden sm:block">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Trending & Filters */}
        <aside className="lg:col-span-3 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4 text-orange-500">
              <TrendingUp className="w-5 h-5" />
              <h2 className="font-bold uppercase tracking-widest text-xs">Featured Groups</h2>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSearchQuery('Google News');
                  handleSearch({ preventDefault: () => {} } as any);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-all group flex items-center justify-between ${
                  darkMode 
                    ? 'bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10' 
                    : 'bg-orange-50 border-orange-200 hover:bg-orange-100 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md ${darkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                    <Newspaper className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                    Most Popular - Google News
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${darkMode ? 'text-white/20' : 'text-black/20'}`} />
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-orange-500">
              <Languages className="w-5 h-5" />
              <h2 className="font-bold uppercase tracking-widest text-xs">Language Filter</h2>
            </div>
            <div className={`space-y-1 p-3 rounded-xl border transition-colors duration-300 ${
              darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10 shadow-sm'
            }`}>
              {LANGUAGES.map((lang) => (
                <label
                  key={lang.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${
                    darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedLangs.includes(lang.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLangs([...selectedLangs, lang.id]);
                        } else {
                          setSelectedLangs(selectedLangs.filter(id => id !== lang.id));
                        }
                      }}
                      className={`peer appearance-none w-4 h-4 rounded border transition-all ${
                        darkMode ? 'border-white/20 checked:bg-orange-600 checked:border-orange-600' : 'border-black/20 checked:bg-orange-600 checked:border-orange-600'
                      }`}
                    />
                    <Check className={`absolute w-3 h-3 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none ${
                      darkMode ? 'text-black' : 'text-white'
                    }`} />
                  </div>
                  <span className="text-sm flex items-center gap-2">
                    <span className="text-base grayscale group-hover:grayscale-0 transition-all">{lang.flags}</span>
                    <span className={`${selectedLangs.includes(lang.id) ? (darkMode ? 'text-white' : 'text-black') : (darkMode ? 'text-white/40' : 'text-black/40')} transition-colors`}>
                      {lang.label}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-orange-500">
              <TrendingUp className="w-5 h-5" />
              <h2 className="font-bold uppercase tracking-widest text-xs">Trending Topics</h2>
            </div>
            <div className="space-y-2">
              {trending.length > 0 ? (
                trending.map((topic, i) => (
                  <button
                    key={topic.key}
                    onClick={() => {
                      setSearchQuery(topic.key);
                      handleSearch({ preventDefault: () => {} } as any);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all group flex items-center justify-between ${
                      darkMode 
                        ? 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10' 
                        : 'bg-white border-black/5 hover:border-black/10 hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs ${darkMode ? 'text-white/20' : 'text-black/20'}`}>0{i + 1}</span>
                      <span className={`text-sm font-medium transition-colors truncate max-w-[140px] ${
                        darkMode ? 'text-white group-hover:text-orange-400' : 'text-black group-hover:text-orange-600'
                      }`}>
                        {topic.key}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono ${darkMode ? 'text-white/30' : 'text-black/30'}`}>{topic.doc_count}</span>
                  </button>
                ))
              ) : (
                <div className={`text-xs italic ${darkMode ? 'text-white/30' : 'text-black/30'}`}>No trends detected</div>
              )}
            </div>
          </section>

          <section className={`p-4 rounded-xl border transition-colors duration-300 ${
            darkMode ? 'bg-orange-600/10 border-orange-600/20' : 'bg-orange-50 border-orange-200'
          }`}>
            <h3 className="text-orange-500 font-bold text-xs uppercase mb-2">System Status</h3>
            <div className="space-y-2">
              <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
                Connected to Elasticsearch cluster. Monitoring 42 active RSS feeds. Real-time indexing enabled.
              </p>
              {totalRecords !== null && (
                <div className={`pt-2 border-t ${darkMode ? 'border-orange-600/20' : 'border-orange-200'}`}>
                  <div className={`text-[10px] uppercase font-mono ${darkMode ? 'text-white/40' : 'text-black/40'}`}>Total Records</div>
                  <div className={`text-lg font-bold tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>
                    {totalRecords.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>

        {/* Main Content: News River or Search */}
        <div className="lg:col-span-9">
          <div className={`flex items-center gap-6 border-b mb-6 ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
            <button
              onClick={() => setActiveTab('river')}
              className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${
                activeTab === 'river' 
                  ? (darkMode ? 'text-white' : 'text-black') 
                  : (darkMode ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60')
              }`}
            >
              News River
              {activeTab === 'river' && (
                <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${
                activeTab === 'search' 
                  ? (darkMode ? 'text-white' : 'text-black') 
                  : (darkMode ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60')
              }`}
            >
              Search Results
              {activeTab === 'search' && (
                <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
              )}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col gap-3">
              <div className="flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm text-red-200/80">
                  <p className="font-bold text-red-500 mb-1">Connection Error</p>
                  {error}
                </div>
              </div>
              <button 
                onClick={fetchInitialData}
                className="self-start px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest rounded transition-colors"
              >
                Retry Connection
              </button>
            </div>
          )}

          <div className="space-y-4">
            {activeTab === 'river' ? (
              <div ref={riverRef} className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {latestNews.map((item, i) => (
                      <div key={`${item.link}-${i}`}>
                        <NewsCard 
                          item={item} 
                          index={i} 
                          onOpenDetail={() => setSelectedImage(item)} 
                          darkMode={darkMode}
                        />
                      </div>
                    ))}
                </AnimatePresence>
                {latestNews.length === 0 && !isLoading && (
                  <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-2xl">
                    <Languages className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-white/40 text-sm">No news matching your language filters</p>
                  </div>
                )}
                {isLoading && (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                    <p className="text-sm font-mono text-white/40">Querying historical index...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map((item, i) => (
                      <div key={`search-${item.link}-${i}`}>
                        <NewsCard 
                          item={item} 
                          index={i} 
                          onOpenDetail={() => setSelectedImage(item)} 
                          darkMode={darkMode}
                        />
                      </div>
                    ))}
                    
                    {/* Sentinel for Infinite Scroll */}
                    <div ref={lastElementRef} className="h-10 flex items-center justify-center">
                      {isLoadingMore && (
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                      )}
                    </div>

                    {!hasMoreSearch && searchResults.length > 0 && (
                      <div className="text-center py-8 text-white/20 text-xs font-mono uppercase tracking-widest">
                        End of historical records
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-2xl">
                    <Search className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-white/40 text-sm">
                      {searchResults.length > 0 ? 'No results matching your language filters' : 'Enter a query to search millions of records'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-sm ${
              darkMode ? 'bg-black/95' : 'bg-white/90'
            }`}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`relative w-[90vw] h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border transition-colors duration-300 ${
                darkMode ? 'bg-black border-white/10' : 'bg-white border-black/10'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedImage(null)}
                className={`absolute top-6 right-6 z-50 p-2 rounded-full transition-colors ${
                  darkMode ? 'bg-black/50 hover:bg-white/20 text-white' : 'bg-white/50 hover:bg-black/10 text-black'
                }`}
              >
                <X className="w-6 h-6" />
              </button>

              {/* External Link Button */}
              <a
                href={selectedImage.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSelectedImage(null)}
                className={`absolute top-20 right-6 z-50 p-2 rounded-full transition-colors group/link ${
                  darkMode ? 'bg-black/50 hover:bg-orange-600 text-white' : 'bg-white/50 hover:bg-orange-600 text-black'
                }`}
                title="Open original article"
              >
                <ExternalLink className={`w-6 h-6 transition-colors ${darkMode ? 'group-hover/link:text-black' : 'group-hover/link:text-white'}`} />
              </a>

              {/* Image */}
              {selectedImage.imageUrl ? (
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.imageAlt || selectedImage.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                  <Newspaper className={`w-24 h-24 ${darkMode ? 'text-white/10' : 'text-black/10'}`} />
                </div>
              )}

              {/* Top Overlay: Title and Metadata */}
              <div className={`absolute top-0 left-0 right-0 p-8 bg-gradient-to-b ${
                darkMode ? 'from-black/90 via-black/60 to-transparent' : 'from-white/90 via-white/60 to-transparent'
              }`}>
                <div className="flex items-center gap-3 text-xs md:text-sm font-mono text-orange-500 mb-3 uppercase tracking-wider">
                  <span className={`px-2 py-0.5 rounded border ${
                    darkMode ? 'bg-orange-600/20 border-orange-600/30' : 'bg-orange-100 border-orange-200'
                  }`}>
                    {selectedImage.source || 'Global Feed'}
                  </span>
                  <span className={darkMode ? 'text-white/40' : 'text-black/40'}>•</span>
                  <span className={`flex items-center gap-1.5 ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(selectedImage.pubDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <h2 className={`text-2xl md:text-4xl font-bold max-w-4xl leading-tight tracking-tight ${
                  darkMode ? 'text-white' : 'text-black'
                }`}>
                  {selectedImage.title}
                </h2>
              </div>

              {/* Bottom Overlay: Description */}
              <div className={`absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t ${
                darkMode ? 'from-black/80 to-transparent' : 'from-white/80 to-transparent'
              }`}>
                <div className={`max-w-4xl ${darkMode ? 'text-white/80' : 'text-black/80'}`}>
                  {selectedImage.imageAlt ? (
                    <p className="text-sm md:text-base">{selectedImage.imageAlt}</p>
                  ) : (
                    <DescriptionRenderer item={selectedImage} darkMode={darkMode} isModal={true} />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NewsCard({ item, index, onOpenDetail, darkMode }: { item: NewsItem; index: number; onOpenDetail: () => void; darkMode: boolean }) {
  const safeDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
      return new Date();
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.5) }}
      className={`group border rounded-xl overflow-hidden transition-all flex flex-col md:flex-row ${
        darkMode 
          ? 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20' 
          : 'bg-white border-black/10 hover:bg-gray-50 hover:border-black/20 shadow-sm'
      }`}
    >
      <div className="flex-1 p-5 flex flex-col min-w-0">
        <div className="flex justify-between items-start gap-4 mb-3">
          <div className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-tighter ${
            darkMode ? 'text-orange-500/80' : 'text-orange-600'
          }`}>
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(safeDate(item.pubDate), { addSuffix: true })}
            <span className={darkMode ? 'text-white/20' : 'text-black/20'}>•</span>
            <span className={darkMode ? 'text-white/40' : 'text-black/40'}>{item.source || 'Global Feed'}</span>
          </div>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md ${
              darkMode ? 'bg-white/10 text-white hover:bg-orange-600 hover:text-black' : 'bg-black/5 text-black hover:bg-orange-600 hover:text-white'
            }`}
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <button 
          onClick={onOpenDetail}
          className="block group/title mb-2 text-left w-full"
        >
          <h3 className={`text-lg font-bold leading-tight transition-colors line-clamp-2 ${
            darkMode ? 'text-white group-hover/title:text-orange-400' : 'text-black group-hover/title:text-orange-600'
          }`}>
            {item.title}
          </h3>
        </button>
        
        <div className={`text-sm leading-relaxed mb-4 ${
          darkMode ? 'text-white/50' : 'text-black/60'
        }`}>
          <DescriptionRenderer item={item} darkMode={darkMode} />
        </div>

        <div className={`mt-auto flex items-center justify-between pt-4 border-t ${
          darkMode ? 'border-white/5' : 'border-black/5'
        }`}>
          <div className="flex flex-wrap gap-1">
            {item.tags && item.tags.length > 0 ? (
              item.tags.slice(0, 3).map(tag => (
                <span key={tag} className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
                  LANGUAGES.some(l => l.id === tag) 
                    ? (darkMode ? 'bg-orange-600/20 text-orange-400' : 'bg-orange-100 text-orange-700') 
                    : (darkMode ? 'bg-white/5 text-white/40' : 'bg-black/5 text-black/40')
                }`}>
                  #{tag.toUpperCase()}
                </span>
              ))
            ) : (
              ['Politics', 'Tech', 'World'].slice(0, Math.floor(Math.random() * 2) + 1).map(tag => (
                <span key={tag} className={`px-2 py-0.5 rounded-full font-mono text-[9px] ${
                  darkMode ? 'bg-white/5 text-white/40' : 'bg-black/5 text-black/40'
                }`}>
                  #{tag.toUpperCase()}
                </span>
              ))
            )}
          </div>
          <a 
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${
              darkMode ? 'text-white/30 hover:text-white' : 'text-black/30 hover:text-black'
            }`}
          >
            Read Full <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {item.imageUrl && (
        <div 
          className="w-full md:w-[20%] h-48 md:h-auto relative cursor-zoom-in overflow-hidden"
          onClick={onOpenDetail}
        >
          <img 
            src={item.imageUrl} 
            alt={item.imageAlt || item.title}
            className={`w-full h-full object-cover transition-all duration-500 scale-105 group-hover:scale-100 ${
              darkMode ? 'grayscale group-hover:grayscale-0' : ''
            }`}
            referrerPolicy="no-referrer"
          />
          <div className={`absolute inset-0 transition-colors ${darkMode ? 'bg-black/20 group-hover:bg-transparent' : 'bg-transparent'}`} />
        </div>
      )}
    </motion.article>
  );
}

const MOCK_NEWS: NewsItem[] = [
  {
    title: "Global Markets React to New Economic Data",
    description: "Investors are closely watching the latest inflation figures as central banks signal potential rate shifts in the coming months.",
    link: "#1",
    pubDate: new Date().toISOString(),
    source: "Reuters"
  },
  {
    title: "Breakthrough in Fusion Energy Research Announced",
    description: "Scientists at the National Ignition Facility have achieved a net energy gain for the third time, paving the way for clean power.",
    link: "#2",
    pubDate: new Date(Date.now() - 3600000).toISOString(),
    source: "Science Daily"
  },
  {
    title: "Tech Giants Unveil Next-Generation AI Models",
    description: "The latest large language models promise better reasoning and multimodal capabilities, sparking new debates on safety.",
    link: "#3",
    pubDate: new Date(Date.now() - 7200000).toISOString(),
    source: "TechCrunch"
  },
  {
    title: "SpaceX Successfully Launches 60 More Starlink Satellites",
    description: "The mission aims to expand global internet coverage, bringing high-speed connectivity to remote regions worldwide.",
    link: "#4",
    pubDate: new Date(Date.now() - 10800000).toISOString(),
    source: "Space.com"
  }
];

const MOCK_TRENDING: TrendingTopic[] = [
  { key: "Artificial Intelligence", doc_count: 1240 },
  { key: "Climate Change", doc_count: 890 },
  { key: "Space Exploration", doc_count: 560 },
  { key: "Quantum Computing", doc_count: 430 },
  { key: "Renewable Energy", doc_count: 310 }
];
