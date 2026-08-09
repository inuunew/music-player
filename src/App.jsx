import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Search, Volume2, Volume1, VolumeX, Heart, Music2, Loader2 } from "lucide-react";

// ⚠️ Ganti dengan API key kamu sendiri dari Google Cloud Console (YouTube Data API v3).
// Karena ini dibundle jadi JS publik, WAJIB restrict key ini ke domain kamu:
// Google Cloud Console → Credentials → key ini → Application restrictions → Websites → masukin domain Vercel-mu.
const YOUTUBE_API_KEY = "TARUH_API_KEY_KAMU_DI_SINI";

const QUICK_PICKS = ["Tulus", "Raisa", "Lofi Chill", "Pop Hits", "Indie Rock", "Jazz Malam"];

export default function App() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeGenre, setActiveGenre] = useState("Tulus");
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [liked, setLiked] = useState(new Set());

  const playerRef = useRef(null);
  const pollRef = useRef(null);
  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;

  // Load YouTube IFrame API sekali saat app mount
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = createPlayer;
    return () => {
      window.onYouTubeIframeAPIReady = null;
    };
  }, []);

  function createPlayer() {
    playerRef.current = new window.YT.Player("yt-player-slot", {
      height: "100%",
      width: "100%",
      playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0 },
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            setDuration(playerRef.current.getDuration());
            startPoll();
          } else if (e.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            stopPoll();
          } else if (e.data === window.YT.PlayerState.ENDED) {
            playNext();
          }
        },
      },
    });
  }

  function startPoll() {
    stopPoll();
    pollRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setProgress(playerRef.current.getCurrentTime());
      }
    }, 500);
  }
  function stopPoll() {
    if (pollRef.current) clearInterval(pollRef.current);
  }

  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  const runSearch = useCallback(async (term) => {
    if (!term.trim()) return;
    setLoading(true);
    setError("");
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=24&q=${encodeURIComponent(
        term
      )}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Gagal mengambil data. Cek API key kamu.");
        setTracks([]);
      } else {
        setTracks(
          (data.items || []).map((it) => ({
            id: it.id.videoId,
            title: it.snippet.title,
            channel: it.snippet.channelTitle,
            thumb: it.snippet.thumbnails?.medium?.url,
          }))
        );
      }
    } catch (e) {
      setError("Gagal terhubung ke YouTube API.");
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search otomatis begitu player siap — tidak perlu input apa-apa dari user
  useEffect(() => {
    if (playerReady) runSearch(activeGenre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerReady]);

  function playTrack(idx) {
    if (idx === currentIndex) {
      togglePlay();
      return;
    }
    setCurrentIndex(idx);
    setProgress(0);
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(tracks[idx].id);
    }
  }

  function togglePlay() {
    if (!playerRef.current || !currentTrack) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }

  function playNext() {
    if (!tracks.length) return;
    const next = (currentIndex + 1) % tracks.length;
    playTrack(next);
  }
  function playPrev() {
    if (!tracks.length) return;
    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    playTrack(prev);
  }

  function seek(e) {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = pct * duration;
    playerRef.current.seekTo(t, true);
    setProgress(t);
  }

  function toggleLike(id) {
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function fmt(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (query.trim()) {
      setActiveGenre(query.trim());
      runSearch(query.trim());
    }
  }

  const VolIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className="min-h-screen w-full bg-white text-[#16161A] pb-28" style={{ fontFamily: "Inter, ui-sans-serif, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');
        .display { font-family: 'Space Grotesk', ui-sans-serif, sans-serif; }
        @keyframes eq { 0%,100% { height: 4px; } 50% { height: 16px; } }
        .eq-bar { animation: eq 0.9s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: #E5E5EA; border-radius: 4px; }
      `}</style>

      {/* Player YouTube asli — tetap kelihatan kecil di pojok sesuai ToS YouTube */}
      <div className="fixed bottom-[72px] right-3 w-24 h-16 rounded-xl overflow-hidden z-40 shadow-lg border border-[#E5E5EA] bg-black">
        <div id="yt-player-slot" />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/85 border-b border-[#EEEEF0]">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center">
              <Music2 size={18} className="text-white" />
            </div>
            <span className="display text-lg font-bold tracking-tight">Denyut</span>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9CA3]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari lagu, artis, atau album..."
              className="w-full bg-[#F5F5F7] border border-transparent rounded-full pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-400/60 focus:bg-white transition-colors placeholder:text-[#9C9CA3]"
            />
          </form>
        </div>
        <div className="max-w-6xl mx-auto px-5 pb-3 flex gap-2 overflow-x-auto">
          {QUICK_PICKS.map((g) => (
            <button
              key={g}
              onClick={() => {
                setActiveGenre(g);
                setQuery("");
                runSearch(g);
              }}
              className={`whitespace-nowrap text-xs px-3.5 py-1.5 rounded-full border transition-colors font-medium ${
                activeGenre === g
                  ? "bg-gradient-to-r from-orange-500 to-violet-500 border-transparent text-white shadow-[0_4px_12px_-4px_rgba(255,75,46,0.5)]"
                  : "border-[#E5E5EA] text-[#6E6E76] hover:text-[#16161A] hover:border-[#C9C9CF]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        <h1 className="display text-xl font-bold mb-4">
          Hasil untuk <span className="bg-gradient-to-r from-orange-500 to-violet-500 bg-clip-text text-transparent">{activeGenre}</span>
        </h1>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-[#9C9CA3]">
            <Loader2 size={22} className="animate-spin mr-2" /> Memuat lagu...
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-24 text-[#9C9CA3] text-sm">Tidak ada hasil. Coba kata kunci lain.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tracks.map((t, idx) => {
              const active = idx === currentIndex;
              return (
                <div
                  key={t.id}
                  className={`group relative rounded-2xl overflow-hidden bg-[#F5F5F7] border transition-all cursor-pointer ${
                    active ? "border-orange-400/70 shadow-[0_10px_28px_-10px_rgba(255,75,46,0.4)]" : "border-[#EEEEF0] hover:border-[#D9D9DE] hover:shadow-[0_8px_20px_-10px_rgba(0,0,0,0.15)]"
                  }`}
                  onClick={() => playTrack(idx)}
                >
                  <div className="relative aspect-square">
                    <img src={t.thumb} alt={t.title} className="w-full h-full object-cover" />
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/35 transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md">
                        {active && isPlaying ? <Pause size={16} className="text-[#16161A]" /> : <Play size={16} className="text-[#16161A] ml-0.5" />}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(t.id);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm"
                    >
                      <Heart size={12} className={liked.has(t.id) ? "fill-orange-500 text-orange-500" : "text-[#6E6E76]"} />
                    </button>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{t.title}</p>
                    <p className="text-[11px] text-[#9C9CA3] truncate">{t.channel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-[#EEEEF0] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.15)]">
          <div onClick={seek} className="h-1 w-full bg-[#EEEEF0] cursor-pointer relative">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-violet-500"
              style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
            />
          </div>
          <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-4">
            <div className="flex items-center gap-3 w-1/3 min-w-0">
              <img src={currentTrack.thumb} alt="" className="w-11 h-11 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{currentTrack.title}</p>
                <p className="text-[11px] text-[#9C9CA3] truncate">{currentTrack.channel}</p>
              </div>
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-4 ml-1">
                  <span className="eq-bar w-0.5 bg-orange-500" style={{ animationDelay: "0s" }} />
                  <span className="eq-bar w-0.5 bg-violet-500" style={{ animationDelay: "0.2s" }} />
                  <span className="eq-bar w-0.5 bg-orange-500" style={{ animationDelay: "0.4s" }} />
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-center gap-5">
                <button onClick={playPrev} className="text-[#6E6E76] hover:text-[#16161A] transition-colors">
                  <SkipBack size={18} />
                </button>
                <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center hover:scale-105 transition-transform shadow-[0_6px_16px_-4px_rgba(255,75,46,0.5)]">
                  {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                </button>
                <button onClick={playNext} className="text-[#6E6E76] hover:text-[#16161A] transition-colors">
                  <SkipForward size={18} />
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#9C9CA3] tabular-nums">
                <span>{fmt(progress)}</span>
                <span>/</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 w-1/3 justify-end">
              <VolIcon size={16} className="text-[#9C9CA3]" />
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-24 accent-orange-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
