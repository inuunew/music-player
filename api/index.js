import express from 'express';
// Hapus fungsi 'download' dari import karena sudah digantikan oleh API Cuki
import { search, info, lyrics, related } from './scraper.js';

const app = express();

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

// Endpoint Download menggunakan API Cuki Digital
app.get('/api/download', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID diperlukan' });

  // Format URL YouTube dari ID
  const youtubeUrl = `https://youtu.be/${id}`;
  
  // Endpoint API Downloader (Cuki Digital)
  const apiUrl = `https://api.cuki.biz.id/api/downloader/ytmp3?apikey=cuki-x&url=${encodeURIComponent(youtubeUrl)}&quality=192`;

  try {
    const response = await fetch(apiUrl);
    const result = await response.json();

    // Pastikan status API success dan downloadUrl tersedia
    if (result.success && result.data?.audio?.download?.downloadUrl) {
      return res.json({
        videoId: id,
        status: 'OK',
        title: result.data.metadata.title,
        artist: result.data.metadata.channel || "-",
        // Mengirimkan format data yang persis seperti ekspektasi frontend app.js
        audioFormats: [
          { 
            url: result.data.audio.download.downloadUrl, 
            mimeType: 'audio/mp3' 
          }
        ]
      });
    }

    throw new Error('Gagal mendapatkan link audio dari API');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export default untuk Vercel Serverless
export default app;
