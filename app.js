// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
    // Default to empty, require user input if invalid
    TMDB_API_KEY: localStorage.getItem('tmdb_api_key') || '',
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p/w500',
    VIDSRC_BASE_URL: 'https://vidsrc.xyz/embed',
    DEBOUNCE_DELAY: 500
};

// ==========================================
// STATE
// ==========================================

const state = {
    searchResults: [],
    currentVideo: null,
    searchTimeout: null
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
    searchInput: document.getElementById('searchInput'),
    searchStatus: document.getElementById('searchStatus'),
    resultsGrid: document.getElementById('resultsGrid'),
    videoModal: document.getElementById('videoModal'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalClose: document.getElementById('modalClose'),
    videoTitle: document.getElementById('videoTitle'),
    videoMeta: document.getElementById('videoMeta'),
    episodeSelector: document.getElementById('episodeSelector'),
    seasonSelect: document.getElementById('seasonSelect'),
    episodeSelect: document.getElementById('episodeSelect'),
    changeEpisode: document.getElementById('changeEpisode'),
    modalVideoContainer: document.getElementById('modalVideoContainer'),
    // Settings
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    settingsOverlay: document.getElementById('settingsOverlay'),
    settingsClose: document.getElementById('settingsClose'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn')
};

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
    // Check for API key
    if (!CONFIG.TMDB_API_KEY) {
        showSettings();
        elements.searchStatus.innerHTML = '⚠️ Please set your TMDB API Key in <a href="#" onclick="showSettings(); return false;" class="accent-link">Settings</a> to enable search.';
    }

    // Search input listener with debouncing
    elements.searchInput.addEventListener('input', handleSearchInput);

    // Modal close listeners
    elements.modalClose.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', closeModal);

    // Settings listeners
    elements.settingsBtn.addEventListener('click', showSettings);
    elements.settingsClose.addEventListener('click', hideSettings);
    elements.settingsOverlay.addEventListener('click', hideSettings);
    elements.saveSettingsBtn.addEventListener('click', saveSettings);

    // Episode change listener
    elements.changeEpisode.addEventListener('click', handleEpisodeChange);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            hideSettings();
        }
    });

    console.log('VidStream initialized');
}

// ==========================================
// SETTINGS
// ==========================================

function showSettings() {
    elements.apiKeyInput.value = CONFIG.TMDB_API_KEY;
    elements.settingsModal.classList.add('active');
}

function hideSettings() {
    elements.settingsModal.classList.remove('active');
}

function saveSettings() {
    const key = elements.apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('tmdb_api_key', key);
        CONFIG.TMDB_API_KEY = key;
        hideSettings();
        elements.searchStatus.textContent = 'API Key saved! Try searching now.';
        // Trigger search if input exists
        if (elements.searchInput.value) {
            searchContent(elements.searchInput.value);
        }
    } else {
        elements.searchStatus.textContent = 'Please enter a valid API Key.';
    }
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

function handleSearchInput(e) {
    const query = e.target.value.trim();

    // Clear existing timeout
    if (state.searchTimeout) {
        clearTimeout(state.searchTimeout);
    }

    // Clear results if query is empty
    if (!query) {
        clearResults();
        return;
    }

    // Show searching status
    elements.searchStatus.textContent = 'Searching...';

    // Debounced search
    state.searchTimeout = setTimeout(() => {
        searchContent(query);
    }, CONFIG.DEBOUNCE_DELAY);
}

async function searchContent(query) {
    if (!CONFIG.TMDB_API_KEY) {
        elements.searchStatus.innerHTML = '⚠️ API Key invalid or missing. Update in <a href="#" onclick="showSettings(); return false;" class="accent-link">Settings</a>.';
        return;
    }

    try {
        const url = `${CONFIG.TMDB_BASE_URL}/search/multi?api_key=${CONFIG.TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`;

        const response = await fetch(url);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.status_message || 'Search failed');
        }

        const data = await response.json();

        // Filter only movies and TV shows
        const results = data.results.filter(item =>
            (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
        );

        state.searchResults = results;
        displayResults(results);

        // Update status
        if (results.length === 0) {
            elements.searchStatus.textContent = 'No results found';
        } else {
            elements.searchStatus.textContent = `Found ${results.length} result${results.length !== 1 ? 's' : ''}`;
        }

    } catch (error) {
        console.error('Search error:', error);
        elements.searchStatus.innerHTML = `Search failed: ${error.message}. Check your <a href="#" onclick="showSettings(); return false;" class="accent-link">API Key</a>.`;
        clearResults();
    }
}

function displayResults(results) {
    if (results.length === 0) {
        elements.resultsGrid.innerHTML = '';
        return;
    }

    elements.resultsGrid.innerHTML = results.map((item, index) => {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const posterUrl = item.poster_path
            ? `${CONFIG.TMDB_IMAGE_BASE}${item.poster_path}`
            : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%231a1a24" width="300" height="450"/%3E%3Ctext fill="%236e6e8f" font-family="Arial" font-size="20" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Poster%3C/text%3E%3C/svg%3E';

        const mediaType = item.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show';

        return `
      <div class="result-card" onclick="selectContent(${index})" style="animation-delay: ${index * 0.05}s">
        <img src="${posterUrl}" alt="${title}" class="result-poster" loading="lazy">
        <div class="result-info">
          <div class="result-title" title="${title}">${title}</div>
          <div class="result-meta">
            <span class="result-type">${mediaType}</span>
            ${year ? `<span>${year}</span>` : ''}
            ${rating !== 'N/A' ? `<span class="result-rating">⭐ ${rating}</span>` : ''}
          </div>
        </div>
      </div>
    `;
    }).join('');
}

function clearResults() {
    elements.resultsGrid.innerHTML = '';
    elements.searchStatus.textContent = '';
}

// ==========================================
// VIDEO PLAYBACK
// ==========================================

function selectContent(index) {
    const item = state.searchResults[index];
    if (!item) return;

    state.currentVideo = {
        id: item.id,
        type: item.media_type,
        title: item.title || item.name,
        year: (item.release_date || item.first_air_date || '').substring(0, 4),
        rating: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
        overview: item.overview || 'No description available.',
        season: 1,
        episode: 1
    };

    openModal();
    loadVideo();
}

function openModal() {
    elements.videoModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Update video info
    elements.videoTitle.textContent = state.currentVideo.title;
    elements.videoMeta.textContent = `${state.currentVideo.year} • ⭐ ${state.currentVideo.rating}`;

    // Show episode selector for TV shows
    if (state.currentVideo.type === 'tv') {
        elements.episodeSelector.classList.add('active');
        elements.seasonSelect.value = 1;
        elements.episodeSelect.value = 1;
    } else {
        elements.episodeSelector.classList.remove('active');
    }
}

function closeModal() {
    elements.videoModal.classList.remove('active');
    document.body.style.overflow = 'auto';

    // Clear video
    elements.modalVideoContainer.innerHTML = `
    <div class="video-placeholder">
      <div class="loading-spinner"></div>
      <p>Loading video...</p>
    </div>
  `;

    state.currentVideo = null;
}

function loadVideo() {
    if (!state.currentVideo) return;

    // Show loading state
    elements.modalVideoContainer.innerHTML = `
    <div class="video-placeholder">
      <div class="loading-spinner"></div>
      <p>Loading video...</p>
    </div>
  `;

    // Build embed URL
    let embedUrl;
    if (state.currentVideo.type === 'movie') {
        embedUrl = `${CONFIG.VIDSRC_BASE_URL}/movie?tmdb=${state.currentVideo.id}`;
    } else {
        const season = state.currentVideo.season || 1;
        const episode = state.currentVideo.episode || 1;
        embedUrl = `${CONFIG.VIDSRC_BASE_URL}/tv?tmdb=${state.currentVideo.id}&season=${season}&episode=${episode}`;
    }

    // Create iframe after short delay for better UX
    setTimeout(() => {
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'origin';

        elements.modalVideoContainer.innerHTML = '';
        elements.modalVideoContainer.appendChild(iframe);
    }, 500);
}

function handleEpisodeChange() {
    if (!state.currentVideo || state.currentVideo.type !== 'tv') return;

    const season = parseInt(elements.seasonSelect.value) || 1;
    const episode = parseInt(elements.episodeSelect.value) || 1;

    state.currentVideo.season = season;
    state.currentVideo.episode = episode;

    loadVideo();
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Make selectContent available globally for onclick handlers
window.selectContent = selectContent;

// ==========================================
// START APPLICATION
// ==========================================

document.addEventListener('DOMContentLoaded', init);

console.log('%c🎬 VidStream Ready!', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%cSearch for any movie or TV show to get started', 'color: #b4b4c8; font-size: 14px;');
