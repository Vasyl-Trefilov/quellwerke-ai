const express = require('express');
const axios = require('axios');
const client = require('prom-client');
const {crawlSite} = require('./parser');
const fs = require('fs');
async function loadPLimit() {
  const {default: pLimit} = await import('p-limit');
  return pLimit;
}
require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

const cors = require('cors');

const {Pool} = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};

const app = express();
app.use(express.json());
app.use(cors());
// const OLLAMA_HOST = 'http://localhost:11434/api/embeddings';
const OLLAMA_HOST = 'http://ollama:11434/api/embeddings';
const QDRANT_URL = 'http://qdrant:6333';
// const QDRANT_URL = 'http://localhost:6333';
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({method: req.method, route: req.path, status_code: res.statusCode});
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/hello', (req, res) => {
  res.json({message: 'Hello, World!'});
});

app.post('/search', async (req, res) => {
  const {query, settings} = req.body;

  try {
    // 1) Embed
    const embRes = await axios.post(OLLAMA_HOST, {
      model: 'nomic-embed-text:v1.5',
      prompt: query,
    });
    const vector = embRes.data.embedding;

    // 2) Qdrant search
    const searchRes = await axios.post(
        `${QDRANT_URL}/collections/kb_v1/points/search`, {vector, limit: 8});
    const hits = searchRes.data?.result || [];
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Transfer-Encoding', 'chunked');

    if (!hits.length) {
      res.write(JSON.stringify({delta: 'Ich weiß es nicht'}) + '\n');
      return res.end();
    }

    // 3) Pull chunks from Postgres
    const ids = hits.map((r) => r.id);
    const textFromDb = await db.query(
        `SELECT * FROM chunks WHERE chunk_id = ANY($1::int[])`, [ids]);

    const context = textFromDb.rows.map((r) => r.text).join('\n---\n');
    let lengthHint = '';
    switch (settings?.answer_length) {
      case 'short':
        lengthHint = 'Keep the answer brief, 1-2 sentences.';
        break;
      case 'medium':
        lengthHint = 'Provide a balanced, 2-3 paragraph answer.';
        break;
      case 'long':
        lengthHint = 'Provide a very detailed, comprehensive answer.';
        break;
    }

    // 4) Stream OpenAI
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        {
          role: 'system',
          content:
              `You are an assistant for answering customer questions about QuellWerke. Use only the provided context. ${
                  lengthHint}`,
        },
        {
          role: 'user',
          content: `Question: ${query}\n\nContext:\n${context}\n\nAnswer:`,
        },
      ],
    });

    req.on('close', () => {
      try {
        stream.controller?.abort?.();
      } catch {
      }
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        res.write(JSON.stringify({delta}) + '\n');
      }
    }

    // 5) Send simple "citations" at the end
    // res.write(JSON.stringify({
    //   sources: textFromDb.rows.map(
    //       (r) => ({
    //         title: `Doc ${r.doc_id} (chunk ${r.chunk_index})`,
    //         url: `db://${r.doc_id}#${r.chunk_index}`,
    //       })),
    // }) + '\n');

    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).end(JSON.stringify({error: 'server error'}) + '\n');
    } else {
      res.write(JSON.stringify({error: 'server error'}) + '\n');
      res.end();
    }
  }
});

async function ensureCollection(name, vectorSize) {
  try {
    await axios.get(`http://qdrant:6333/collections/${name}`);
    console.log(`Collection ${name} already exists`);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.log(`Creating collection ${name}...`);
      await axios.put('http://qdrant:6333/collections/kb_v1', {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        params: {
          on_disk_payload: true,
        },
        hnsw_config: {
          m: 16,
          ef_construct: 100,
        },
      });
    } else {
      throw err;
    }
  }
}

app.post('/parse-url', async (req, res) => {
  const {url, lang, title} = req.body;
  try {
    const pLimit = await loadPLimit();
    const limit = pLimit(10);  // run up to 10 concurrent ops

    const start = Date.now();
    const data = await crawlSite(url);
    const jsonData = JSON.stringify(data, null, 2);

    fs.writeFile('data.json', jsonData, 'utf8', (err) => {
      if (err) {
        console.error('Error writing to file', err);
      } else {
        console.log('Data written to file');
      }
    });

    console.log('Total chunks:', data.chunks.length);

    // Insert document
    const docRes = await db.query(
        `
      INSERT INTO documents (source_type, source_uri, title, lang) 
      VALUES($1, $2, $3, $4) 
      RETURNING doc_id;
    `,
        ['website', url, title, lang]);

    const doc_id = docRes.rows[0].doc_id;
    console.log('Inserted doc id:', doc_id);

    await ensureCollection('kb_v1', 768);

    // Process chunks concurrently with limit
    await Promise.all(data.chunks.map(
        (chunkText, i) => limit(async () => {
          try {
            // Get embedding
            const embeddingRes = await axios.post(OLLAMA_HOST, {
              model: 'nomic-embed-text:v1.5',
              prompt: chunkText,
            });
            const vector = embeddingRes.data.embedding;

            // Insert chunk in Postgres
            const chunkRes = await db.query(
                `
              INSERT INTO chunks (doc_id, chunk_index, text, tokens, embedding_version) 
              VALUES($1, $2, $3, $4, $5)
              RETURNING chunk_id;
            `,
                [doc_id, i + 1, chunkText, chunkText.length, '0.0.1']);

            const chunk_id = chunkRes.rows[0].chunk_id;

            // Insert into Qdrant
            await axios.put('http://qdrant:6333/collections/kb_v1/points', {
              points: [
                {
                  id: chunk_id,
                  vector,
                  payload: {
                    doc_id,
                    chunk_id,
                    chunk_index: i + 1,
                    title,
                    lang,
                    preview: chunkText.slice(0, 50),
                    version: '0.0.1',
                  },
                },
              ],
            });
          } catch (err) {
            console.error(`Error processing chunk ${i + 1}:`, err.message);
          }
        })));

    const end = Date.now();
    console.log('Total embedding + insert time:', (end - start) / 1000, 'sec');

    res.status(200).json({chunks: data.chunks.length});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'server error'});
  }
});

app.listen(
    3000, () => console.log('🚀 Server running on http://localhost:3000'));
