import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import fs from "fs";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const PORT = 3000;

const getElasticsearchUrl = () => {
  const url = process.env.ELASTICSEARCH_URL || "https://9c63-150-230-120-132.ngrok-free.app";
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `http://${formattedUrl}`;
  }
  console.log(`[ES] Initializing client with URL: ${formattedUrl}`);
  return formattedUrl;
};

const esClient = new Client({
  node: getElasticsearchUrl(),
  auth: {
    username: process.env.ELASTIC_USERNAME || "elastic",
    password: process.env.ELASTIC_PASSWORD || "",
  },
  maxRetries: 5, // Increased retries for unstable tunnels
  requestTimeout: 60000, // Increased to 60s to handle slow responses from 28M docs
  sniffOnStart: false,
  sniffOnConnectionFault: false,
  headers: {
    "ngrok-skip-browser-warning": "69420",
    "User-Agent": "Elasticsearch-Client-AI-Studio",
    "Connection": "keep-alive" // Explicitly request keep-alive
  },
  tls: {
    rejectUnauthorized: false
  }
});

app.use(cors());
app.use(express.json());

// Middleware to log all API requests
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Helper to clean mangled characters from common encoding issues
const cleanText = (text: string) => {
  if (!text) return "";
  try {
    // Attempt to fix common "double-encoded" UTF-8 or ISO-8859-1 issues
    // This is a common pattern for "Edição" -> "Ediï¿½ï¿½ï¿½o"
    return text
      .replace(/ï¿½/g, "")
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  } catch (e) {
    return text;
  }
};

// Helper to extract image URL from various possible fields
const getImageUrl = (source: any) => {
  // 1. Direct fields (highest priority)
  if (source.mediaURL) return source.mediaURL;
  if (source.image_url) return source.image_url;
  if (source.image) return source.image;
  if (source.thumbnail) return source.thumbnail;
  if (source.media_url) return source.media_url;
  if (source.featured_image) return source.featured_image;
  
  // 2. Media Content (Media RSS standard)
  // Check for various possible field names due to different XML parsers/ES mappings
  const mediaContent = source.mediaContent || source["media:content"] || source.media_content || source["media-content"];
  if (mediaContent) {
    const items = Array.isArray(mediaContent) ? mediaContent : [mediaContent];
    // Some parsers put the URL in 'url' attribute, others in 'href'
    const imgMedia = items.find((m: any) => {
      if (!m) return false;
      const url = m.url || m.href || m.src;
      if (!url) return false;
      const type = m.type || m.medium || "";
      return type.includes("image") || url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i);
    });
    if (imgMedia) return imgMedia.url || imgMedia.href || imgMedia.src;
  }

  // 3. Enclosure (RSS 2.0 standard)
  if (source.enclosure) {
    const items = Array.isArray(source.enclosure) ? source.enclosure : [source.enclosure];
    const imgEnclosure = items.find((e: any) => {
      if (!e) return false;
      const url = e.url || e.href || e.src;
      if (!url) return false;
      const type = e.type || "";
      return type.startsWith("image/") || url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i);
    });
    if (imgEnclosure) return imgEnclosure.url || imgEnclosure.href || imgEnclosure.src;
  }

  // 4. Description parsing (Robust fallback)
  if (source.description && typeof source.description === 'string') {
    // Regex to find <img> tags and capture the 'src' attribute
    // Handles different attribute orders, spaces, and single/double quotes
    const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    
    // Try to find a "real" image (skipping common tracking pixel patterns)
    while ((match = imgRegex.exec(source.description)) !== null) {
      const url = match[1];
      const isLikelyPixel = url.includes('pixel') || url.includes('analytics') || url.includes('/track') || url.includes('doubleclick');
      if (url && !isLikelyPixel && url.length > 15) {
        return url;
      }
    }
    
    // Final fallback: just take the first src found if the filter was too strict
    const firstMatch = source.description.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
    if (firstMatch && firstMatch[1]) {
      return firstMatch[1];
    }
  }
  
  return null;
};

// API Routes
app.get("/api/health", async (req, res) => {
  const activeUrl = getElasticsearchUrl();
  try {
    // Get indices to see what's available
    const indices = await esClient.cat.indices({ format: "json" });
    
    // Get the absolute latest document across all indices starting with rss
    const latestDoc = await esClient.search({
      index: "rss*",
      size: 1,
      sort: [{ "@timestamp": { order: "desc" } }]
    } as any);

    // Get latest doc specifically for rss_feeds
    const latestRssFeedsDoc = await esClient.search({
      index: "rss_feeds",
      size: 1,
      sort: [{ "@timestamp": { order: "desc" } }]
    } as any);

    const { count } = await esClient.count({ index: "rss_feeds" }).catch(() => ({ count: 0 }));
    
    res.json({ 
      status: "ok", 
      count,
      connectedTo: activeUrl,
      indices: indices.map((i: any) => ({ 
        name: i.index, 
        docs: i["docs.count"],
        status: i.status
      })),
      globalLatest: {
        timestamp: (latestDoc.hits.hits[0]?._source as any)?.["@timestamp"],
        index: latestDoc.hits.hits[0]?._index,
        title: (latestDoc.hits.hits[0]?._source as any)?.title
      },
      rssFeedsLatest: {
        timestamp: (latestRssFeedsDoc.hits.hits[0]?._source as any)?.["@timestamp"],
        title: (latestRssFeedsDoc.hits.hits[0]?._source as any)?.title
      }
    });
  } catch (error: any) {
    console.error(`[ES] Health check failed:`, error.message);
    res.status(500).json({ 
      status: "error",
      error: error.message,
      attemptedUrl: activeUrl
    });
  }
});

// Cache for news and stats
let latestNewsCache: any[] = [];
let statsCache: { count: number; timestamp: number } | null = null;
const STATS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// WebSocket broadcast helper
const broadcastNews = (news: any[]) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "NEW_NEWS", data: news }));
    }
  });
};

// Background fetcher for latest news
const fetchLatestFromES = async () => {
  try {
    console.log("[Background] Fetching latest news from ES...");
    
    const result = await esClient.search({
      index: "*", // Search everything
      query: {
        bool: {
          must: [
            { exists: { field: "title" } },
            { exists: { field: "@timestamp" } }
          ],
          filter: [{ 
            range: { 
              "@timestamp": { 
                gte: "now-7d", 
                lte: "now" 
              } 
            } 
          }]
        }
      },
      sort: [{ "@timestamp": { order: "desc" } }],
      size: 150, // Fetch more to allow for de-duplication
    } as any);

    const seenTitles = new Set();
    const uniqueHits = result.hits.hits
      .map((hit: any) => {
        const source = hit._source;
        
        return {
          ...source,
          type: "news",
          title: cleanText(source.title),
          description: cleanText(source.description),
          pubDate: source["@timestamp"],
          source: source["name"],
          tags: source.tags || [],
          imageUrl: getImageUrl(source),
          imageAlt: source.mediaDescription || source.altText || null
        };
      })
      .filter((item: any) => {
        if (!item.title) return false;
        const normalizedTitle = item.title.toLowerCase().trim();
        if (seenTitles.has(normalizedTitle)) return false;
        seenTitles.add(normalizedTitle);
        return true;
      })
      .slice(0, 50); // Return top 50 unique items

    // Only broadcast if data changed (simple check)
    const hasChanged = JSON.stringify(uniqueHits) !== JSON.stringify(latestNewsCache);
    latestNewsCache = uniqueHits;
    
    if (hasChanged) {
      console.log("[Background] News updated, broadcasting to clients.");
      broadcastNews(latestNewsCache);
    }
  } catch (error: any) {
    console.error("[Background] Fetch error:", error.message);
  }
};

// Initial fetch and schedule every 5 minutes
fetchLatestFromES();
setInterval(fetchLatestFromES, 5 * 60 * 1000);

app.get("/api/stats", async (req, res) => {
  try {
    if (statsCache && (Date.now() - statsCache.timestamp < STATS_CACHE_DURATION)) {
      return res.json({ count: statsCache.count });
    }
    const { count } = await esClient.count({ index: "rss*" });
    statsCache = { count, timestamp: Date.now() };
    res.json({ count });
  } catch (error: any) {
    console.error("[API] Stats error:", error.message || error);
    res.json({ count: statsCache?.count || 0 });
  }
});

app.get("/api/latest", async (req, res) => {
  const { langs, from = 0, size = 50 } = req.query;
  try {
    const query: any = {
      bool: {
        must: [
          { exists: { field: "title" } },
          { exists: { field: "@timestamp" } }
        ],
        filter: [{ 
          range: { 
            "@timestamp": { 
              gte: "now-7d", 
              lte: "now" 
            } 
          } 
        }]
      }
    };

    if (langs) {
      const langList = (langs as string).split(",");
      query.bool.filter.push({
        terms: {
          "tags.keyword": langList
        }
      });
    }

    const result = await esClient.search({
      index: "*",
      query,
      from: Number(from),
      size: Number(size),
      sort: [{ "@timestamp": { order: "desc" } }],
    } as any);

    const seenTitles = new Set();
    const uniqueHits = result.hits.hits
      .map((hit: any) => {
        const source = hit._source;
        return {
          ...source,
          type: "news",
          title: cleanText(source.title),
          description: cleanText(source.description),
          pubDate: source["@timestamp"],
          source: source["name"],
          tags: source.tags || [],
          imageUrl: getImageUrl(source),
          imageAlt: source.mediaDescription || source.altText || null
        };
      })
      .filter((item: any) => {
        if (!item.title) return false;
        const normalizedTitle = item.title.toLowerCase().trim();
        if (seenTitles.has(normalizedTitle)) return false;
        seenTitles.add(normalizedTitle);
        return true;
      });

    res.json({
      items: uniqueHits,
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total.value,
      relation: typeof result.hits.total === 'number' ? 'eq' : result.hits.total.relation,
      hasMore: result.hits.hits.length === Number(size)
    });
  } catch (error: any) {
    console.error("[API] Latest fetch error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Simple in-memory cache for trending topics
let trendingCache: { data: any[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.get("/api/trending", async (req, res) => {
  try {
    // Check cache first
    if (trendingCache && (Date.now() - trendingCache.timestamp < CACHE_DURATION)) {
      return res.json(trendingCache.data);
    }

    // Optimization: Use tags instead of titles for faster aggregation
    // and limit the search to a large but manageable sample
    const result = await esClient.search({
      index: "rss*",
      size: 0,
      terminate_after: 50000, // Stop after 50k docs for speed
      query: {
        bool: {
          must: [{ match_all: {} }],
          filter: [{ range: { "@timestamp": { lte: "now" } } }]
        }
      },
      aggs: {
        trending_topics: {
          terms: {
            field: "tags.keyword", // Tags are much faster than titles
            size: 12,
          },
        },
      },
    } as any);
    
    const buckets = (result.aggregations?.trending_topics as any)?.buckets || [];
    const cleanedBuckets = buckets
      .filter((b: any) => b.key && b.key.length > 2)
      .map((b: any) => ({ ...b, key: cleanText(b.key) }));
    
    // Update cache
    trendingCache = { data: cleanedBuckets, timestamp: Date.now() };
    res.json(cleanedBuckets);
  } catch (error: any) {
    console.error("[API] Trending error:", error.message);
    res.json(trendingCache?.data || []);
  }
});

app.get("/api/debug/artemis", async (req, res) => {
  try {
    const result = await esClient.search({
      index: "rss*",
      query: {
        match: {
          title: "Artemis II Completes First Day of Its NASA Lunar Mission"
        }
      }
    } as any);
    res.json(result.hits.hits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/debug/mapping", async (req, res) => {
  try {
    const mapping = await esClient.indices.getMapping({ index: "rss_feeds" });
    res.json(mapping);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/search", async (req, res) => {
  const { q, langs, from = 0, size = 50 } = req.query;
  try {
    const filter: any[] = [{ range: { "@timestamp": { lte: "now" } } }];
    
    if (langs) {
      const langList = (langs as string).split(",");
      filter.push({
        terms: {
          "tags.keyword": langList
        }
      });
    }

    const result = await esClient.search({
      index: "*",
      from: Number(from),
      size: Number(size),
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: q as string,
                      fields: ["title", "description", "content"],
                      type: "best_fields",
                      operator: "or",
                      boost: 1.0
                    }
                  },
                  {
                    match_phrase: {
                      title: {
                        query: q as string,
                        boost: 5.0
                      }
                    }
                  }
                ]
              }
            }
          ],
          filter
        }
      },
      sort: [
        { "@timestamp": { order: "desc" } }
      ],
    } as any);
    
    const seenTitles = new Set();
    const uniqueHits = result.hits.hits
      .map((hit: any) => {
        const source = hit._source;
        return {
          ...source,
          title: cleanText(source.title),
          description: cleanText(source.description),
          pubDate: source["@timestamp"],
          source: source["name"],
          tags: source.tags || [],
          imageUrl: getImageUrl(source),
          imageAlt: source.mediaDescription || source.altText || null
        };
      })
      .filter((item: any) => {
        if (!item.title) return false;
        const normalizedTitle = item.title.toLowerCase().trim();
        if (seenTitles.has(normalizedTitle)) return false;
        seenTitles.add(normalizedTitle);
        return true;
      })
      .slice(0, 100);
    
    res.json({
      items: uniqueHits,
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total.value,
      relation: typeof result.hits.total === 'number' ? 'eq' : result.hits.total.relation,
      hasMore: result.hits.hits.length === Number(size)
    });
  } catch (error: any) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Trigger initial fetch
    fetchLatestFromES().catch(err => console.error("Initial fetch failed:", err));
  });
}

startServer();
