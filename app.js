const UI = {
  searchInput: document.getElementById('searchInput'),
  searchFilter: document.getElementById('searchFilter'),
  searchBtn: document.getElementById('searchBtn'),
  contentTitle: document.getElementById('contentTitle'),
  resultsGrid: document.getElementById('resultsGrid'),
  loading: document.getElementById('loading'),
  relatedList: document.getElementById('relatedList'),
  lyricsContent: document.getElementById('lyricsContent'),
  npThumb: document.getElementById('npThumb'),
  npTitle: document.getElementById('npTitle'),
  npArtist: document.getElementById('npArtist'),
  audioPlayer: document.getElementById('audioPlayer')
};

// 1. FITUR SEARCH
UI.searchBtn.addEventListener('click', async () => {
  const query = UI.searchInput.value;
  const filter = UI.searchFilter.value;
  if (!query) return;

  setLoading(true);
  UI.contentTitle.innerText = `Hasil pencarian: ${query}`;
  
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&filter=${filter}`);
  const data = await res.json();
  
  UI.resultsGrid.innerHTML = '';
  data.results.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${item.thumbnails[0] || 'https://via.placeholder.com/50'}" alt="thumb">
      <div class="card-info">
        <h4><span class="badge">${item.resultType?.toUpperCase() || 'ITEM'}</span> ${item.title}</h4>
        <p>${item.subtitle || ''}</p>
      </div>
    `;
    
    // Aksi berdasarkan tipe (Song vs Album/Artis)
    card.onclick = () => {
      if (item.videoId) playSong(item.videoId, item.title, item.thumbnails[0]);
      else if (item.browseId) loadInfo(item.browseId, item.title);
    };
    
    UI.resultsGrid.appendChild(card);
  });
  setLoading(false);
});

// 2. FITUR INFO (Album / Artis / Playlist)
async function loadInfo(browseId, title) {
  setLoading(true);
  UI.contentTitle.innerText = `Info: ${title}`;
  UI.resultsGrid.innerHTML = '';

  const res = await fetch(`/api/info?id=${browseId}`);
  const data = await res.json();
  
  const tracks = data.tracks || data.songs || [];
  tracks.forEach(track => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-info" style="margin-left: 10px;">
        <h4>${track.title}</h4>
        <p>${track.artists?.map(a => a.name).join(', ') || ''} • ${track.duration || ''}</p>
      </div>
    `;
    card.onclick = () => playSong(track.videoId, track.title, data.thumbnails?.[0]);
    UI.resultsGrid.appendChild(card);
  });
  setLoading(false);
}

// 3. FITUR DOWNLOAD (Memutar Lagu)
async function playSong(videoId, title, thumb) {
  UI.npTitle.innerText = title;
  UI.npArtist.innerText = "Memuat audio...";
  if (thumb) UI.npThumb.src = thumb;

  try {
    const res = await fetch(`/api/download?id=${videoId}`);
    const data = await res.json();

    // Cari format audio pertama yang memiliki URL valid
    const validAudio = data.audioFormats?.find(f => f.url);

    if (validAudio && validAudio.url) {
      UI.audioPlayer.src = validAudio.url;
      UI.audioPlayer.play();
      UI.npArtist.innerText = data.artist || "-";
      
      loadRelated(videoId);
      loadLyrics(videoId);
    } else {
      UI.npArtist.innerText = "Audio tidak dapat diputar (Situs dibatasi YouTube)";
    }
  } catch (e) {
    UI.npArtist.innerText = "Gagal koneksi ke server";
  }
}


// 4. FITUR RELATED (Up Next / Antrean)
async function loadRelated(videoId) {
  UI.relatedList.innerHTML = 'Memuat antrean...';
  const res = await fetch(`/api/related?id=${videoId}`);
  const data = await res.json();
  
  UI.relatedList.innerHTML = '';
  data.tracks.forEach(track => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${track.thumbnails?.[0] || 'https://via.placeholder.com/50'}" alt="thumb">
      <div class="card-info">
        <h4>${track.title}</h4>
        <p>${track.artists?.map(a => a.name).join(', ') || ''}</p>
      </div>
    `;
    card.onclick = () => playSong(track.videoId, track.title, track.thumbnails?.[0]);
    UI.relatedList.appendChild(card);
  });
}

// 5. FITUR LYRICS
async function loadLyrics(videoId) {
  UI.lyricsContent.innerHTML = 'Mencari lirik...';
  const res = await fetch(`/api/lyrics?id=${videoId}`);
  const data = await res.json();
  
  if (data.lyrics) {
    UI.lyricsContent.innerHTML = data.lyrics + `<br><br><small>Sumber: ${data.source || 'YT Music'}</small>`;
  } else {
    UI.lyricsContent.innerHTML = 'Lirik tidak ditemukan untuk lagu ini.';
  }
}

// Utilitas UI
function setLoading(isLoading) {
  if(isLoading) {
    UI.loading.classList.remove('hidden');
    UI.resultsGrid.classList.add('hidden');
  } else {
    UI.loading.classList.add('hidden');
    UI.resultsGrid.classList.remove('hidden');
  }
}

function switchTab(tabName) {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(t => t.classList.remove('active'));
  document.getElementById('relatedTab').classList.add('hidden');
  document.getElementById('lyricsTab').classList.add('hidden');
  
  if(tabName === 'related') {
    tabs[0].classList.add('active');
    document.getElementById('relatedTab').classList.remove('hidden');
  } else {
    tabs[1].classList.add('active');
    document.getElementById('lyricsTab').classList.remove('hidden');
  }
}

// Enter key to search
UI.searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') UI.searchBtn.click();
});
