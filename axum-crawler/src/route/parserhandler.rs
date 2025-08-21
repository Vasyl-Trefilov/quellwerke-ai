use reqwest::Client;
use scraper::{Html, Selector};
use regex::Regex;
use std::collections::{HashSet, VecDeque};
use futures::stream::{FuturesUnordered, StreamExt};

/// Crawl result
pub struct CrawlResult {
    pub pages: usize,
    pub chunks: Vec<String>,
}

/// Skip rules (like shouldSkip in JS)
fn should_skip(url: &str, visited: &HashSet<String>, max_pages: usize) -> bool {
    if visited.contains(url) {
        return true;
    }
    if visited.len() >= max_pages {
        return true;
    }

    // skip images, pdf, css, js, etc.
    let re = Regex::new(r"\.(png|jpe?g|gif|svg|webp|pdf|ico|css|js)(\?.*)?$").unwrap();
    if re.is_match(url) {
        return true;
    }

    false
}

/// Split long text into overlapping chunks
fn chunk_paragraphs(paragraphs: Vec<String>, max_chars: usize, overlap: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let mut buffer = String::new();

    for para in paragraphs {
        if buffer.len() + para.len() + 1 > max_chars {
            if !buffer.trim().is_empty() {
                chunks.push(buffer.trim().to_string());

                let overlap_len = overlap.min(buffer.len());

                // find a safe char boundary
                let start = buffer.char_indices()
                    .nth(buffer.chars().count().saturating_sub(overlap_len))
                    .map(|(idx, _)| idx)
                    .unwrap_or(0);

                buffer = buffer[start..].to_string();
                buffer.push(' ');
                buffer.push_str(&para);
            } else {
                buffer = para;
            }
        } else {
            if !buffer.is_empty() {
                buffer.push(' ');
            }
            buffer.push_str(&para);
        }
    }

    if !buffer.trim().is_empty() {
        chunks.push(buffer.trim().to_string());
    }

    chunks
}

/// Extract clean text from HTML (like cheerio selectors)
fn extract_text(html: &str) -> Vec<String> {
    let doc = Html::parse_document(html);
    let selector = Selector::parse("main, article, section, p, h1, h2, h3").unwrap();
    let mut texts = Vec::new();

    for el in doc.select(&selector) {
        let mut text = el.text().collect::<Vec<_>>().join(" ");
        text = text.split_whitespace().collect::<Vec<_>>().join(" "); // normalize whitespace

        if text.len() < 30 {
            continue;
        }
        if Regex::new(r"^(?:[\W_]+)$").unwrap().is_match(&text) {
            continue;
        }
        if Regex::new(r"^(cookie|datenschutz|impressum)").unwrap().is_match(&text.to_lowercase()) {
            continue;
        }

        texts.push(text);
    }

    texts
}

/// Crawl site (like crawlSite in JS)
pub async fn crawl_site(base_url: &str, max_pages: usize) -> CrawlResult {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();

    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();
    queue.push_back(base_url.to_string());

    let mut all_chunks = Vec::new();

    while !queue.is_empty() && visited.len() < max_pages {
        // Take up to 10 URLs like Node.js batch
        let batch: Vec<String> = queue.drain(0..queue.len().min(10)).collect();

        let mut futures = FuturesUnordered::new();

        for url in batch {
            if should_skip(&url, &visited, max_pages) {
                continue;
            }
            visited.insert(url.clone());

            let client = client.clone();
            let base_url = base_url.to_string();
            futures.push(async move {
                if let Ok(resp) = client.get(&url).send().await {
                    if resp.status() != 200 {
                        return (url, None, Vec::new());
                    }
                    if let Ok(body) = resp.text().await {
                        let texts = extract_text(&body);
                        let chunks = chunk_paragraphs(texts, 3000, 300);

                        // extract links
                        let doc = Html::parse_document(&body);
                        let selector = Selector::parse("a[href]").unwrap();
                        let mut new_links = Vec::new();

                        for a in doc.select(&selector) {
                            if let Some(href) = a.value().attr("href") {
                                if let Ok(new_url) = url::Url::parse(&url)
                                    .and_then(|u| u.join(href))
                                {
                                    let new_url_str = new_url.to_string();
                                    if new_url_str.starts_with(&base_url) {
                                        new_links.push(new_url_str.split('#').next().unwrap().to_string());
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
