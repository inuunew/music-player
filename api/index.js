import express from 'express';
import { search, info, lyrics, related, download } from './scraper.js';

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

// Endpoint Download dengan Auto-Fallback Piped API untuk memecahkan Signature Cipher
app.get('/api/download', async (req, res) => {
  const { id } = req.query;
  try {
    let data = await download(id);
    const hasValidUrl = data?.audioFormats?.some((f) => f.url);

    // Jika YouTube mengunci cipher (url === null) atau status bukan OK, gunakan Piped API
    if (!hasValidUrl || data.status !== 'OK') {
      const pipedInstances = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.yt',
        'https://pipedapi.mha.fi'
      ];

      for (const instance of pipedInstances) {
        try {
          const pipedRes = await fetch(`${instance}/streams/${id}`);
          if (pipedRes.ok) {
            const pipedData = await pipedRes.json();
            const audioStreams = pipedData.audioStreams || [];

            if (audioStreams.length > 0) {
              data = {
                videoId: id,
                status: 'OK',
                title: pipedData.title || data.title,
                artist: pipedData.uploader || data.artist,
                thumbnail: pipedData.thumbnailUrl || data.thumbnail,
                audioFormats: audioStreams.map((s) => ({
                  url: s.url,
                  mimeType: s.mimeType,
                  bitrate: s.bitrate,
                  quality: s.quality
                }))
              };
              break;
            }
          }
        } catch (_) {
          continue;
        }
      }
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default app;
