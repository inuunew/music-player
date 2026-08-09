import express from 'express';
import { search, info, lyrics, related, download } from './scraper.js';

const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.get('/api/search', async (req, res) => {
  try {
    const data = await search(req.query.q, req.query.filter);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/info', async (req, res) => {
  try {
    const data = await info(req.query.id);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/lyrics', async (req, res) => {
  try {
    const data = await lyrics(req.query.id);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/related', async (req, res) => {
  try {
    const data = await related(req.query.id);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/download', async (req, res) => {
  try {
    const data = await download(req.query.id);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`🎵 Server berjalan di http://localhost:${PORT}`);
});
