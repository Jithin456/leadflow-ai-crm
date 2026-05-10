const http = require('http');
const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');

const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.csv': 'text/csv',
};

const server = http.createServer((req, res) => {

  // =====================================================
  // CORS
  // =====================================================

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // =====================================================
  // OLLAMA API ROUTE
  // =====================================================

  if (req.method === 'POST' && req.url === '/api/ai') {

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {

      try {

        const parsed = JSON.parse(body);

        // Convert frontend messages into prompt
        const userPrompt = (parsed.messages || [])
  .map(m => m.content)
  .join('\n');

// 🔥 FORCE JSON OUTPUT
const prompt = `
You MUST return ONLY valid JSON.
NO markdown.
NO explanation.
NO extra text.

${userPrompt}
`;

        // =================================================
        // CALL OLLAMA
        // =================================================

        const ollamaResponse = await fetch(
          'http://localhost:11434/api/generate',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({

              // Change this if needed:
              // 'llama3'
              // 'phi3'
              // 'mistral'

              model: 'llama3',

              prompt: prompt,

              stream: false
            })
          }
        );

        const data = await ollamaResponse.json();

        console.log('Ollama Response:', data);

        let text = data.response || '';

// 🔥 CLEAN BAD OUTPUT
text = text
  .replace(/```json/g, '')
  .replace(/```/g, '')
  .trim();

        // =================================================
        // RETURN RESPONSE TO FRONTEND
        // =================================================

        const formatted = {
          content: [
            {
              type: 'text',
              text: text
            }
          ]
        };

        res.writeHead(200, {
          'Content-Type': 'application/json'
        });

        res.end(JSON.stringify(formatted));

      } catch (err) {

        console.log('SERVER ERROR:', err);

        res.writeHead(500, {
          'Content-Type': 'application/json'
        });

        res.end(JSON.stringify({
          error: err.message
        }));
      }
    });

    return;
  }

  // =====================================================
  // STATIC FILE SERVER
  // =====================================================

  let filePath =
    req.url === '/'
      ? '/index.html'
      : req.url;

  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {

    if (err) {

      res.writeHead(404);

      res.end('File not found');

      return;
    }

    const ext = path.extname(filePath);

    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'text/plain'
    });

    res.end(data);
  });
});

// =====================================================
// START SERVER
// =====================================================

server.listen(PORT, () => {

  console.log('\n✅ LeadFlow AI running with Ollama');
  console.log(`🌐 http://localhost:${PORT}\n`);
});