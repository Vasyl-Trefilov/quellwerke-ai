// i don`t want to explain it, i am tired...

use reqwest::Client;
use scraper::{Html, Selector};
use regex::Regex;
use std::collections::{HashSet, VecDeque};
use futures::stream::{FuturesUnordered, StreamExt};

/// Result of a crawl operation
pub struct CrawlResult {
    pub pages: usize,        // number of pages successfully crawled
    pub chunks: Vec<String>, // extracted & chunked text content
}

/// Decide if a URL should be skipped
fn should_skip(url: &str, visited: &HashSet<String>, max_pages: usize) -> bool {
    // Already visited? -> skip
    if visited.contains(url) {
        return true;
    }
    // Already reached the page limit? -> skip
    if visited.len() >= max_pages {
        return true;
    }

    // Skip static resources like images, pdfs, css, js, etc.
    let re = Regex::new(r"\.(png|jpe?g|gif|svg|webp|pdf|ico|css|js)(\?.*)?$").unwrap();
    if re.is_match(url) {
        return true;
    }

    false
}

/// Split text into overlapping chunks (for embedding or LLM processing)
fn chunk_paragraphs(paragraphs: Vec<String>, max_chars: usize, overlap: usize) -> Vec<String> {
    let mut chunks = Vec::new();   // resulting text chunks
    let mut buffer = String::new(); // rolling buffer for accumulating text

    for para in paragraphs {
        // If adding the paragraph would exceed max_chars
        if buffer.len() + para.len() + 1 > max_chars {
            if !buffer.trim().is_empty() {
                // push current buffer as a chunk
                chunks.push(buffer.trim().to_string());

                // keep some overlap from the end of the buffer
                let overlap_len = overlap.min(buffer.len());

                // find safe UTF-8 boundary for overlap
                let start = buffer.char_indices()
                    .nth(buffer.chars().count().saturating_sub(overlap_len))
                    .map(|(idx, _)| idx)
                    .unwrap_or(0);

                // reset buffer with the overlap portion
                buffer = buffer[start..].to_string();
                buffer.push(' ');
                buffer.push_str(&para);
            } else {
                // if buffer empty, just take current paragraph
                buffer = para;
            }
        } else {
            // otherwise keep adding to current buffer
            if !buffer.is_empty() {
                buffer.push(' ');
            }
            buffer.push_str(&para);
        }
    }

    // push the last buffer if not empty
    if !buffer.trim().is_empty() {
        chunks.push(buffer.trim().to_string());
    }

    chunks
}

/// Extract meaningful text content from HTML
fn extract_text(html: &str) -> Vec<String> {
    let doc = Html::parse_document(html);
    let selector = Selector::parse("main, article, section, p, h1, h2, h3").unwrap();
    let mut texts = Vec::new();

    for el in doc.select(&selector) {
        // get inner text and normalize whitespace
        let mut text = el.text().collect::<Vec<_>>().join(" ");
        text = text.split_whitespace().collect::<Vec<_>>().join(" ");

        // skip too-short snippets
        if text.len() < 30 {
            continue;
        }
        // skip strings that are just symbols
        if Regex::new(r"^(?:[\W_]+)$").unwrap().is_match(&text) {
            continue;
        }
        // skip boilerplate like "cookie", "impressum", "datenschutz"
        if Regex::new(r"^(cookie|datenschutz|impressum)").unwrap().is_match(&text.to_lowercase()) {
            continue;
        }

        texts.push(text);
    }

    texts
}

/// Crawl a site and return extracted text chunks
pub async fn crawl_site(base_url: &str, max_pages: usize) -> CrawlResult {
    // HTTP client with timeout
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();

    let mut visited = HashSet::new();  // visited URLs
    let mut queue = VecDeque::new();   // queue of URLs to process
    queue.push_back(base_url.to_string());

    let mut all_chunks = Vec::new();

    while !queue.is_empty() && visited.len() < max_pages {
        // process up to 10 URLs concurrently
        let batch: Vec<String> = queue.drain(0..queue.len().min(10)).collect();
        let mut futures = FuturesUnordered::new();

        for url in batch {
            // skip already visited or unwanted resources
            if should_skip(&url, &visited, max_pages) {
                continue;
            }
            visited.insert(url.clone());

            let client = client.clone();
            let base_url = base_url.to_string();

            // async crawl task
            futures.push(async move {
                if let Ok(resp) = client.get(&url).send().await {
                    if resp.status() != 200 {
                        return (url, None, Vec::new());
                    }
                    if let Ok(body) = resp.text().await {
                        println!("parsing {}", url.clone());
                        // extract and chunk text
                        let texts = extract_text(&body);
                        let chunks = chunk_paragraphs(texts, 3000, 300);

                        // extract links from page
                        let doc = Html::parse_document(&body);
                        let selector = Selector::parse("a[href]").unwrap();
                        let mut new_links = Vec::new();

                        for a in doc.select(&selector) {
                            if let Some(href) = a.value().attr("href") {
                                if let Ok(new_url) = url::Url::parse(&url)
                                    .and_then(|u| u.join(href))
                                {
                                    let new_url_str = new_url.to_string();
                                    // only keep links under base_url
                                    if new_url_str.starts_with(&base_url) {
                                        new_links.push(
                                            new_url_str.split('#').next().unwrap().to_string()
                                        );
                                    }
                                }
                            }
                        }

                        return (url, Some(chunks), new_links);
                    }
                }
                (url, None, Vec::new())
            });
        }

        // collect results as they complete
        while let Some((_, chunks_opt, new_links)) = futures.next().await {
            if let Some(chunks) = chunks_opt {
                all_chunks.extend(chunks);
            }
            for link in new_links {
                if !visited.contains(&link) {
                    queue.push_back(link);
                }
            }
        }
    }

    CrawlResult {
        pages: visited.len(),
        chunks: all_chunks,
    }
}
