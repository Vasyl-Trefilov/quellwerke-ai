const axios = require("axios");
const cheerio = require("cheerio");

// ---- p-limit loader ----
async function loadPLimit() {
  const { default: pLimit } = await import("p-limit");
  return pLimit;
}
function shouldSkip(url, visited, maxPages) {
  // already seen
  if (visited.has(url)) return true;
  // too many pages
  if (visited.size >= maxPages) return true;
  // unwanted file extensions
  if (url.match(/\.(png|jpe?g|gif|svg|webp|pdf|ico|css|js)(\?.*)?$/i)) return true;
  
  return false;
}
// ---- entry point ----
exports.crawlSite = async (baseUrl, maxPages = 200) => {
  const pLimit = await loadPLimit();
  const limit = pLimit(10);

  const visited = new Set();
  const queue = [baseUrl];
  const allChunks = [];

  async function crawl(url) {
    if (shouldSkip(url, visited, maxPages)) return;
    visited.add(url);

    try {
      const response = await axios.get(url, { timeout: 10000 });
      if (response.status !== 200) return;

      const $ = cheerio.load(response.data);

      // ---- extract clean text ----
      const texts = [];
      $("main, article, section, p, h1, h2, h3").each((_, el) => {
        // skip inside nav/header/footer/aside
        if ($(el).closest("nav, header, footer, aside").length) return;

        let text = $(el).text();
        text = text.replace(/\s+/g, " ").trim(); // normalize whitespace

        if (text.length < 30) return; // too short = noise
        if (/^(?:[\W_]+)$/.test(text)) return; // only symbols
        if (/^(cookie|datenschutz|impressum)/i.test(text)) return; // legal boilerplate

        texts.push(text);
      });

      const chunks = chunkParagraphs(texts, 1000);
      allChunks.push(...chunks);

      // ---- collect internal links ----
      $("a[href]").each((_, a) => {
        const href = $(a).attr("href");
        if (!href) return;

        try {
          const newUrl = new URL(href, baseUrl).toString();
          if (newUrl.startsWith(baseUrl) && !visited.has(newUrl)) {
            queue.push(newUrl.split("#")[0]);
          }
        } catch {}
      });
    } catch (err) {
      console.error(`❌ Error fetching ${url}:`, err.message);
    }
  }

  // ---- main loop ----
  while (queue.length > 0 && visited.size < maxPages) {
    const batch = queue.splice(0, 10); // take up to 10 URLs at once
    await Promise.all(
      batch.map(u =>
        limit(async () => {
          try {
            await crawl(u);
          } catch (err) {
            if (err.response) {
              console.error(`❌ HTTP ${err.response.status} on ${url}`);
            } else if (err.request) {
              console.error(`❌ No response from ${url}`);
            } else {
              console.error(`❌ Error fetching ${url}:`, err.message);
            }
          }
        })
      )
    );
  }


  return {
    pages: visited.size,
    chunks: allChunks,
  };
};

// ---- chunker ----
function chunkParagraphs(paragraphs, maxChars = 3000, overlap = 300) {
  const chunks = [];
  let buffer = "";

  for (const para of paragraphs) {
    if ((buffer + " " + para).length > maxChars) {
      if (buffer.trim()) {
        chunks.push(buffer.trim());
        // start next buffer with overlap from previous
        buffer = buffer.slice(-overlap) + " " + para;
      } else {
        buffer = para;
      }
    } else {
      buffer += " " + para;
    }
  }

  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks;
}
