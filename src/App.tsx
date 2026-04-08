import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, TrendingUp, Newspaper, Clock, ExternalLink, AlertCircle, Loader2, ChevronRight, ChevronDown, ChevronUp, X, Languages, Check, Sun, Moon, Heart, LogIn, LogOut, User as UserIcon, Bookmark, Trash2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import Cookies from 'js-cookie';
import he from 'he';
import DOMPurify from 'dompurify';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  Timestamp,
  User,
  handleFirestoreError,
  OperationType
} from './firebase';

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
  const isGoogleFeed = item.source?.includes('Google');
  
  if (isGoogleFeed) {
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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
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
  const [searchCount, setSearchCount] = useState<number | null>(null);
  const [searchRelation, setSearchRelation] = useState<'eq' | 'gte'>('eq');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  const [riverPage, setRiverPage] = useState(0);
  const [hasMoreRiver, setHasMoreRiver] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'river' | 'search' | 'readLater'>('river');
  const [selectedImage, setSelectedImage] = useState<NewsItem | null>(null);
  const [isLangFilterOpen, setIsLangFilterOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('newspulse_lang_filter_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [isTrendingOpen, setIsTrendingOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('newspulse_trending_open');
    return saved !== null ? saved === 'true' : false;
  });
  const [isSearchHistoryOpen, setIsSearchHistoryOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('newspulse_search_history_open');
    return saved !== null ? saved === 'true' : true;
  });

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showLoginPromptModal, setShowLoginPromptModal] = useState(false);
  const [pendingLocalReadLater, setPendingLocalReadLater] = useState<NewsItem[]>([]);
  const [searchToDelete, setSearchToDelete] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);

  const [readLater, setReadLater] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('newspulse_readLater');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchHistory, setSearchHistory] = useState<Record<string, { lastSearchTime: number; lastRecordTime: number }>>(() => {
    const saved = localStorage.getItem('newspulse_search_history');
    return saved ? JSON.parse(saved) : {};
  });
  const [prevSearchRecordTime, setPrevSearchRecordTime] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('newspulse_lang_filter_open', String(isLangFilterOpen));
  }, [isLangFilterOpen]);

  useEffect(() => {
    localStorage.setItem('newspulse_trending_open', String(isTrendingOpen));
  }, [isTrendingOpen]);

  useEffect(() => {
    localStorage.setItem('newspulse_search_history_open', String(isSearchHistoryOpen));
  }, [isSearchHistoryOpen]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!user && readLater.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved "Read Later" articles. Login to save them permanently.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, readLater]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const wasLoggedOut = !userRef.current && currentUser;
      userRef.current = currentUser;
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Check if there are local read later items to sync
        const localReadLater = JSON.parse(localStorage.getItem('newspulse_readLater') || '[]');
        if (wasLoggedOut && localReadLater.length > 0) {
          setPendingLocalReadLater(localReadLater);
          setShowSyncModal(true);
        }

        // Load preferences from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.selectedLangs) setSelectedLangs(data.selectedLangs);
            if (data.darkMode !== undefined) setDarkMode(data.darkMode);
          } else {
            // Create user doc if it doesn't exist
            await setDoc(doc(db, 'users', currentUser.uid), {
              selectedLangs,
              darkMode,
              updatedAt: serverTimestamp()
            });
          }
        } catch (e) {
          console.error('Error loading user preferences:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const syncReadLater = async () => {
    if (!user) return;
    try {
      for (const item of pendingLocalReadLater) {
        const itemId = btoa(item.link).replace(/[/+=]/g, '_');
        await setDoc(doc(db, 'users', user.uid, 'readLater', itemId), {
          ...item,
          savedAt: serverTimestamp()
        });
      }
      setShowSyncModal(false);
      setPendingLocalReadLater([]);
    } catch (e) {
      console.error('Sync failed:', e);
    }
  };

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'users', user.uid, 'readLater'), orderBy('savedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => doc.data() as NewsItem);
        setReadLater(items);
        localStorage.setItem('newspulse_readLater', JSON.stringify(items));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/readLater`);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'users', user.uid, 'searchHistory'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const history: Record<string, { lastSearchTime: number; lastRecordTime: number }> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.query) {
            history[data.query] = {
              lastSearchTime: data.lastSearchTime?.toMillis() || Date.now(),
              lastRecordTime: data.lastRecordTime?.toMillis() || Date.now()
            };
          }
        });
        setSearchHistory(history);
        localStorage.setItem('newspulse_search_history', JSON.stringify(history));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/searchHistory`);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('newspulse_readLater', JSON.stringify(readLater));
  }, [readLater]);

  useEffect(() => {
    localStorage.setItem('newspulse_search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Login failed:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear local storage on logout to avoid mixing data
      localStorage.removeItem('newspulse_readLater');
      localStorage.removeItem('newspulse_search_history');
      setReadLater([]);
      setSearchHistory({});
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const deleteSearch = async (queryStr: string) => {
    if (user) {
      try {
        const queryId = btoa(queryStr.toLowerCase()).replace(/[/+=]/g, '_');
        await deleteDoc(doc(db, 'users', user.uid, 'searchHistory', queryId));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/searchHistory`);
      }
    } else {
      setSearchHistory(prev => {
        const next = { ...prev };
        delete next[queryStr];
        return next;
      });
    }
    setSearchToDelete(null);
  };

  const toggleReadLater = async (item: NewsItem) => {
    const isSaved = readLater.some(f => f.link === item.link);
    const itemId = btoa(item.link).replace(/[/+=]/g, '_');

    if (user) {
      try {
        if (isSaved) {
          await deleteDoc(doc(db, 'users', user.uid, 'readLater', itemId));
        } else {
          await setDoc(doc(db, 'users', user.uid, 'readLater', itemId), {
            ...item,
            savedAt: serverTimestamp()
          });
        }
      } catch (e) {
        handleFirestoreError(e, isSaved ? OperationType.DELETE : OperationType.WRITE, `users/${user.uid}/readLater/${itemId}`);
      }
    } else {
      if (!isSaved) {
        setShowLoginPromptModal(true);
      }
      setReadLater(prev => {
        if (isSaved) {
          return prev.filter(f => f.link !== item.link);
        } else {
          return [...prev, item];
        }
      });
    }
  };

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
    
    if (user) {
      updateDoc(doc(db, 'users', user.uid), {
        selectedLangs,
        updatedAt: serverTimestamp()
      }).catch(e => console.error('Error updating langs in Firestore:', e));
    }

    // Re-fetch when languages change
    if (activeTab === 'river') {
      fetchInitialData();
    } else if (activeTab === 'search' && searchQuery) {
      const e = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(e);
    }
  }, [selectedLangs, user]);

  useEffect(() => {
    Cookies.set(THEME_COOKIE_NAME, darkMode ? 'dark' : 'light', { expires: 365 });
    if (user) {
      updateDoc(doc(db, 'users', user.uid), {
        darkMode,
        updatedAt: serverTimestamp()
      }).catch(e => console.error('Error updating theme in Firestore:', e));
    }
  }, [darkMode, user]);

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
        fetchWithTimeout(`/api/latest?langs=${encodeURIComponent(langsParam)}&from=0&size=50`, { timeout: 30000 }).catch(e => ({ ok: false, statusText: e.message })),
        fetchWithTimeout('/api/trending', { timeout: 30000 }).catch(e => ({ ok: false, statusText: e.message }))
      ]);

      if (latestRes.ok) {
        const latestData = await (latestRes as Response).json();
        setLatestNews(latestData.items);
        setHasMoreRiver(latestData.hasMore);
        setRiverPage(0);
      } else {
        console.error('Latest news failed');
        setLatestNews(MOCK_NEWS);
        setHasMoreRiver(false);
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
      const langsParam = selectedLangs.join(',');
      const res = await fetchWithTimeout(`/api/latest?langs=${encodeURIComponent(langsParam)}&from=0&size=50`, { timeout: 10000 });
      if (res.ok) {
        const data = await res.json();
        setLatestNews(data.items);
        setHasMoreRiver(data.hasMore);
        setRiverPage(0);
      }
    } catch (err) {
      console.error('Auto-refresh failed or timed out');
    }
  };

  const loadMoreRiver = async () => {
    if (isLoadingMore || !hasMoreRiver) return;
    
    setIsLoadingMore(true);
    const nextPage = riverPage + 1;
    const from = nextPage * 50;
    
    try {
      const langsParam = selectedLangs.join(',');
      const res = await fetch(`/api/latest?langs=${encodeURIComponent(langsParam)}&from=${from}&size=50`);
      if (res.ok) {
        const data = await res.json();
        if (data.items.length === 0 && !data.hasMore) {
          setHasMoreRiver(false);
        } else {
          setLatestNews(prev => [...prev, ...data.items]);
          setRiverPage(nextPage);
          setHasMoreRiver(data.hasMore);
        }
      }
    } catch (err) {
      console.error('Load more river failed');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setActiveTab('search');
    setSearchPage(0);
    setHasMoreSearch(true);
    
    // Store the previous record time for the "new" ribbon logic before updating history
    const existingHistory = searchHistory[searchQuery.trim()];
    setPrevSearchRecordTime(existingHistory ? existingHistory.lastRecordTime : null);

    try {
      const langsParam = selectedLangs.join(',');
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&langs=${encodeURIComponent(langsParam)}&from=0&size=50`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.items);
        setSearchCount(data.total);
        setSearchRelation(data.relation || 'eq');
        setHasMoreSearch(data.hasMore);

        // Update search history
        if (data.items.length > 0) {
          const newestRecordTime = new Date(data.items[0].pubDate).getTime();
          const queryId = btoa(searchQuery.trim().toLowerCase()).replace(/[/+=]/g, '_');
          
          if (user) {
            await setDoc(doc(db, 'users', user.uid, 'searchHistory', queryId), {
              query: searchQuery.trim(),
              lastSearchTime: serverTimestamp(),
              lastRecordTime: Timestamp.fromMillis(newestRecordTime)
            });
          } else {
            setSearchHistory(prev => ({
              ...prev,
              [searchQuery.trim()]: {
                lastSearchTime: Date.now(),
                lastRecordTime: newestRecordTime
              }
            }));
          }
        }
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
          setSearchCount(data.total);
          setSearchRelation(data.relation || 'eq');
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
      if (entries[0].isIntersecting) {
        if (activeTab === 'search' && hasMoreSearch) {
          loadMoreSearch();
        } else if (activeTab === 'river' && hasMoreRiver) {
          loadMoreRiver();
        }
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
            <h1 className={`text-xl font-bold tracking-tighter uppercase hidden sm:block ${darkMode ? 'text-white' : 'text-black'}`}>NewsPulse</h1>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-2 sm:mx-8 relative group">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              darkMode ? 'text-white/40 group-focus-within:text-orange-500' : 'text-black/40 group-focus-within:text-orange-500'
            }`} />
            <input
              type="text"
              placeholder="Search historical news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-full py-2 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-sm ${
                darkMode 
                  ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/20' 
                  : 'bg-black/5 border border-black/10 text-black placeholder:text-black/30'
              }`}
            />
            <button
              type="submit"
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                darkMode 
                  ? 'bg-orange-600 text-black hover:bg-orange-500' 
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          <div className={`flex items-center gap-4 text-xs font-mono ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            {isAuthReady && (
              <div className="flex items-center gap-3 mr-2 border-r pr-4 border-white/10">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end hidden md:flex">
                      <span className={`text-[10px] font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{user.displayName}</span>
                      <span className="text-[9px] opacity-50">Authorized</span>
                    </div>
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-orange-500/50" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-black font-bold">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      className={`p-2 rounded-full transition-all hover:bg-red-500/10 text-red-500`}
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all ${
                      darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Login
                  </button>
                )}
              </div>
            )}

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
            <button 
              onClick={() => setIsLangFilterOpen(!isLangFilterOpen)}
              className="w-full flex items-center justify-between mb-4 text-orange-500 group"
            >
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                <h2 className="font-bold uppercase tracking-widest text-xs">Language Filter</h2>
              </div>
              {isLangFilterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {isLangFilterOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section>
            <button 
              onClick={() => setIsTrendingOpen(!isTrendingOpen)}
              className="w-full flex items-center justify-between mb-4 text-orange-500 group"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <h2 className="font-bold uppercase tracking-widest text-xs">Trending Topics</h2>
              </div>
              {isTrendingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {isTrendingOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {user && (
            <section>
              <button 
                onClick={() => setIsSearchHistoryOpen(!isSearchHistoryOpen)}
                className="w-full flex items-center justify-between mb-4 text-orange-500 group"
              >
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  <h2 className="font-bold uppercase tracking-widest text-xs">Saved Searches</h2>
                </div>
                {isSearchHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {isSearchHistoryOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      {Object.keys(searchHistory).length > 0 ? (
                        (Object.entries(searchHistory) as [string, { lastSearchTime: number; lastRecordTime: number }][]).map(([queryStr, data]) => (
                          <div
                            key={queryStr}
                            className={`w-full p-3 rounded-lg border transition-all flex flex-col gap-1 relative group ${
                              darkMode 
                                ? 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10' 
                                : 'bg-white border-black/5 hover:border-black/10 hover:bg-gray-50 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => {
                                  setSearchQuery(queryStr);
                                  handleSearch({ preventDefault: () => {} } as any);
                                }}
                                className={`text-sm font-bold truncate max-w-[160px] text-left ${
                                  darkMode ? 'text-white group-hover:text-orange-400' : 'text-black group-hover:text-orange-600'
                                }`}
                              >
                                {queryStr}
                              </button>
                              <button
                                onClick={() => setSearchToDelete(queryStr)}
                                className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                                  darkMode ? 'hover:bg-red-500/20 text-red-500/50 hover:text-red-500' : 'hover:bg-red-500/10 text-red-500/50 hover:text-red-500'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className={`text-[9px] font-mono flex items-center gap-1 ${darkMode ? 'text-white/30' : 'text-black/30'}`}>
                              <Clock className="w-2.5 h-2.5" />
                              Latest: {new Date(data.lastRecordTime).toLocaleString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={`text-xs italic p-2 ${darkMode ? 'text-white/30' : 'text-black/30'}`}>
                          Ainda sem pesquisas guardadas
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

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
            {hasSearched && (
              <button
                onClick={() => setActiveTab('search')}
                className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${
                  activeTab === 'search' 
                    ? (darkMode ? 'text-white' : 'text-black') 
                    : (darkMode ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60')
                }`}
              >
                Search Results {searchCount !== null && `(${searchRelation === 'gte' ? '+' : ''}${searchCount.toLocaleString()})`}
                {activeTab === 'search' && (
                  <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab('readLater')}
              className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${
                activeTab === 'readLater' 
                  ? (darkMode ? 'text-white' : 'text-black') 
                  : (darkMode ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60')
              }`}
            >
              Read Later {readLater.length > 0 && `(${readLater.length})`}
              {activeTab === 'readLater' && (
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
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {latestNews.map((item, i) => (
                      <div key={`${item.link}-${i}`}>
                        <NewsCard 
                          item={item} 
                          index={i} 
                          onOpenDetail={() => setSelectedImage(item)} 
                          darkMode={darkMode}
                          isFavorite={readLater.some(f => f.link === item.link)}
                          onToggleFavorite={toggleReadLater}
                        />
                      </div>
                    ))}
                </AnimatePresence>
                
                {/* Sentinel for Infinite Scroll */}
                <div ref={lastElementRef} className="h-10 flex items-center justify-center">
                  {(isLoading || isLoadingMore) && (
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  )}
                </div>

                {latestNews.length === 0 && !isLoading && (
                  <div className={`text-center py-24 border-2 border-dashed rounded-2xl ${darkMode ? 'border-white/5' : 'border-black/5'}`}>
                    <Languages className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-white/10' : 'text-black/10'}`} />
                    <p className={`${darkMode ? 'text-white/40' : 'text-black/40'} text-sm`}>No news matching your language filters</p>
                  </div>
                )}

                {!hasMoreRiver && latestNews.length > 0 && (
                  <div className={`text-center py-8 text-xs font-mono uppercase tracking-widest ${darkMode ? 'text-white/20' : 'text-black/20'}`}>
                    End of news river
                  </div>
                )}
              </div>
            ) : activeTab === 'search' ? (
              <div className="space-y-4">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                    <p className={`text-sm font-mono ${darkMode ? 'text-white/40' : 'text-black/40'}`}>Querying historical index...</p>
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
                          isFavorite={readLater.some(f => f.link === item.link)}
                          onToggleFavorite={toggleReadLater}
                          isNew={prevSearchRecordTime !== null && prevSearchRecordTime < new Date(item.pubDate).getTime()}
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
                      <div className={`text-center py-8 text-xs font-mono uppercase tracking-widest ${darkMode ? 'text-white/20' : 'text-black/20'}`}>
                        End of historical records
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`text-center py-24 border-2 border-dashed rounded-2xl ${darkMode ? 'border-white/5' : 'border-black/5'}`}>
                    <Search className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-white/10' : 'text-black/10'}`} />
                    <p className={`${darkMode ? 'text-white/40' : 'text-black/40'} text-sm`}>
                      {searchResults.length > 0 ? 'No results matching your language filters' : 'Enter a query to search millions of records'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {readLater.map((item, i) => (
                      <div key={`fav-${item.link}-${i}`}>
                        <NewsCard 
                          item={item} 
                          index={i} 
                          onOpenDetail={() => setSelectedImage(item)} 
                          darkMode={darkMode}
                          isFavorite={true}
                          onToggleFavorite={toggleReadLater}
                        />
                      </div>
                    ))}
                </AnimatePresence>
                
                {readLater.length === 0 && (
                  <div className={`text-center py-24 border-2 border-dashed rounded-2xl ${darkMode ? 'border-white/5' : 'border-black/5'}`}>
                    <Bookmark className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-white/10' : 'text-black/10'}`} />
                    <p className={`${darkMode ? 'text-white/40' : 'text-black/40'} text-sm max-w-md mx-auto`}>
                      Your "Read Later" list is empty. Save articles to read them later, and they'll be synced across your devices when logged in.
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

      {/* Login Prompt Modal */}
      <AnimatePresence>
        {showLoginPromptModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl ${
                darkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-black/10'
              }`}
            >
              <div className="flex items-center gap-3 mb-4 text-orange-500">
                <LogIn className="w-6 h-6" />
                <h3 className="text-xl font-bold">Save Permanently?</h3>
              </div>
              <p className={`text-sm mb-6 leading-relaxed ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
                You're saving this article locally. Log in now to save it to your account and access it from any device!
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowLoginPromptModal(false);
                    handleLogin();
                  }}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Log In with Google
                </button>
                <button
                  onClick={() => setShowLoginPromptModal(false)}
                  className={`w-full py-3 font-bold rounded-xl transition-all ${
                    darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                  }`}
                >
                  Continue Locally
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sync Modal */}
      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl ${
                darkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-black/10'
              }`}
            >
              <div className="flex items-center gap-3 mb-4 text-orange-500">
                <Bookmark className="w-6 h-6" />
                <h3 className="text-xl font-bold">Sync Read Later?</h3>
              </div>
              <p className={`text-sm mb-6 leading-relaxed ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
                You have {pendingLocalReadLater.length} articles saved locally. Would you like to sync them to your account so they're available on all your devices?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={syncReadLater}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-black font-bold rounded-xl transition-all"
                >
                  Yes, Sync Now
                </button>
                <button
                  onClick={() => {
                    setShowSyncModal(false);
                    setPendingLocalReadLater([]);
                  }}
                  className={`flex-1 py-2.5 font-bold rounded-xl transition-all ${
                    darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                  }`}
                >
                  No, Keep Local
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Search Confirmation Modal */}
      <AnimatePresence>
        {searchToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-sm w-full p-6 rounded-2xl border shadow-2xl ${
                darkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-black/10'
              }`}
            >
              <div className="flex items-center gap-3 mb-4 text-red-500">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-xl font-bold">Delete Search?</h3>
              </div>
              <p className={`text-sm mb-6 leading-relaxed ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
                Are you sure you want to delete the saved search for <strong>"{searchToDelete}"</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteSearch(searchToDelete)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSearchToDelete(null)}
                  className={`flex-1 py-2.5 font-bold rounded-xl transition-all ${
                    darkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NewsCard({ item, index, onOpenDetail, darkMode, isFavorite, onToggleFavorite, isNew }: { item: NewsItem; index: number; onOpenDetail: () => void; darkMode: boolean; isFavorite: boolean; onToggleFavorite: (item: NewsItem) => void; isNew?: boolean }) {
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
      className={`group border rounded-xl overflow-hidden transition-all flex flex-col md:flex-row relative ${
        darkMode 
          ? 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20' 
          : 'bg-white border-black/10 hover:bg-gray-50 hover:border-black/20 shadow-sm'
      }`}
    >
      {isNew && (
        <div className="absolute top-0 right-0 z-10 overflow-hidden w-10 h-10 pointer-events-none">
          <div className="bg-orange-600 text-black text-[7px] font-black py-0.5 w-16 absolute top-1.5 -right-5 transform rotate-45 text-center shadow-sm uppercase tracking-widest">
            New
          </div>
        </div>
      )}
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
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item);
              }}
              className={`p-1.5 rounded-md transition-all ${
                isFavorite 
                  ? 'text-red-500 bg-red-500/10' 
                  : (darkMode ? 'text-white/20 hover:text-red-400 hover:bg-white/5' : 'text-black/20 hover:text-red-500 hover:bg-black/5')
              }`}
            >
              <Heart className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
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
            className={`w-full h-full object-cover transition-all duration-500 scale-105 group-hover:scale-100 grayscale group-hover:grayscale-0`}
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
