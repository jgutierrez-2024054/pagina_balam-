let catalogPage = 1;
let catalogDebounce;
const FAVORITES_KEY = 'balam-favorite-artworks';

function getFavoriteIds(){
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); }
  catch { return new Set(); }
}

async function loadPublicCatalog(page = 1){
  const grid = document.getElementById('public-artworks-grid');
  const pager = document.getElementById('catalog-pagination');
  if(!grid || !pager) return;
  catalogPage = page;
  grid.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Cargando obras...</div></div>';
  try {
    await window.BALAM_APP.loadApiData();
    const category = document.getElementById('catalog-category');
    if(category && category.options.length === 1) category.innerHTML += window.BALAM_APP.getCategories().map(item => `<option value="${window.BALAM_APP.sanitizeText(item.id)}">${window.BALAM_APP.sanitizeText(item.name)}</option>`).join('');
    const query = new URLSearchParams({ page: String(page), pageSize: '24' });
    const q = document.getElementById('catalog-search')?.value.trim();
    const categoryId = category?.value;
    const status = document.getElementById('catalog-status')?.value;
    const sort = document.getElementById('catalog-sort')?.value;
    const minPrice = document.getElementById('catalog-min-price')?.value;
    const maxPrice = document.getElementById('catalog-max-price')?.value;
    const favoritesOnly = document.getElementById('catalog-favorites-only')?.checked;
    if(q) query.set('q', q);
    if(categoryId) query.set('categoryId', categoryId);
    if(status) query.set('status', status);
    if(sort) query.set('sort', sort);
    if(minPrice) query.set('minPrice', minPrice);
    if(maxPrice) query.set('maxPrice', maxPrice);
    if(favoritesOnly) query.set('ids', [...getFavoriteIds()].join(','));
    const response = await fetch(`/api/artworks?${query}`);
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || 'No se pudo cargar el catálogo.');
    const results = document.getElementById('catalog-results-count');
    if(results) results.textContent = `${data.total} obra${data.total === 1 ? '' : 's'} · Página ${data.page} de ${Math.max(1, data.pages)}`;
    grid.replaceChildren();
    if(!data.items.length){ grid.innerHTML = '<div class="empty-message"><h2>No encontramos obras</h2><p>Prueba otro término o cambia los filtros.</p></div>'; }
    const favoriteIds = getFavoriteIds();
    data.items.forEach(art => {
      const card = document.createElement('article');
      card.className = 'public-artwork-card';
      const image = document.createElement('img');
      image.className = 'public-artwork-image';
      image.loading = 'lazy'; image.decoding = 'async';
      image.alt = `Obra ${art.title}, de ${art.artist}`;
      image.src = window.BALAM_APP.sanitizeImageUrl(art.imageUrl || art.room?.imageUrl) || '/images/balam-icon.svg';
      const favorite = document.createElement('button');
      favorite.type = 'button'; favorite.className = 'artwork-favorite';
      favorite.setAttribute('aria-label', favoriteIds.has(art.id) ? `Quitar ${art.title} de favoritos` : `Agregar ${art.title} a favoritos`);
      favorite.setAttribute('aria-pressed', String(favoriteIds.has(art.id)));
      favorite.textContent = favoriteIds.has(art.id) ? '♥' : '♡';
      favorite.addEventListener('click', event => {
        event.stopPropagation();
        const ids = getFavoriteIds();
        if(ids.has(art.id)) ids.delete(art.id); else ids.add(art.id);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
        const active = ids.has(art.id);
        favorite.textContent = active ? '♥' : '♡';
        favorite.setAttribute('aria-pressed', String(active));
        favorite.setAttribute('aria-label', `${active ? 'Quitar' : 'Agregar'} ${art.title} ${active ? 'de' : 'a'} favoritos`);
      });
      const body = document.createElement('div'); body.className = 'public-artwork-copy';
      body.innerHTML = `<p class="eyebrow">${window.BALAM_APP.sanitizeText(art.category?.name || art.room?.name || 'Colección BALAM')}</p><h2>${window.BALAM_APP.sanitizeText(art.title)}</h2><p class="public-artwork-artist">${window.BALAM_APP.sanitizeText(art.artist)} · ${window.BALAM_APP.sanitizeText(art.year)}</p><p class="public-artwork-medium">${window.BALAM_APP.sanitizeText(art.medium || '')}${art.dims ? ` · ${window.BALAM_APP.sanitizeText(art.dims)}` : ''}</p><strong>${window.BALAM_APP.sanitizeText(art.price)}</strong><span class="public-artwork-status status-${window.BALAM_APP.sanitizeText(String(art.status).toLowerCase())}">${art.status === 'AVAILABLE' ? 'Disponible' : art.status === 'RESERVED' ? 'Reservada' : 'Vendida'}</span><button type="button" class="public-artwork-detail">Ver obra</button>`;
      const openDetails = () => window.BALAM_APP.openArtwork(art);
      body.querySelector('.public-artwork-detail').addEventListener('click', openDetails);
      image.addEventListener('click', openDetails);
      card.append(image, favorite, body); grid.appendChild(card);
    });
    pager.replaceChildren();
    if(data.pages > 1){
      const button = (label, target, disabled, current = false) => { const item = document.createElement('button'); item.type = 'button'; item.textContent = label; item.disabled = disabled; if(current) item.setAttribute('aria-current', 'page'); item.addEventListener('click', () => loadPublicCatalog(target)); return item; };
      pager.append(button('← Anterior', data.page - 1, data.page <= 1));
      pager.append(button(`${data.page} / ${data.pages}`, data.page, true, true));
      pager.append(button('Siguiente →', data.page + 1, data.page >= data.pages));
    }
  } catch(error){
    grid.innerHTML = `<div class="empty-message"><h2>No se pudo cargar el catálogo</h2><p>${window.BALAM_APP.sanitizeText(error.message)}</p><button type="button" class="admin-btn" onclick="loadPublicCatalog(${page})">Reintentar</button></div>`;
  }
}

['catalog-category', 'catalog-status', 'catalog-sort', 'catalog-min-price', 'catalog-max-price', 'catalog-favorites-only'].forEach(id => document.getElementById(id)?.addEventListener('change', () => loadPublicCatalog(1)));
document.getElementById('catalog-search')?.addEventListener('input', event => {
  clearTimeout(catalogDebounce);
  catalogDebounce = setTimeout(() => {
    if (event.target.value.trim().length >= 2) window.BALAM_APP.trackEvent('SEARCH');
    loadPublicCatalog(1);
  }, 320);
});
