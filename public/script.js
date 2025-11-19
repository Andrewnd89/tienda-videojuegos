let currentGames = [];
let currentPage = 0;
const gamesPerPage = 12;
let isLoading = false;

const gamesGrid = document.getElementById('gamesGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const storeFilter = document.getElementById('storeFilter');
const sortFilter = document.getElementById('sortFilter');
const resetBtn = document.getElementById('resetBtn');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const gameModal = document.getElementById('gameModal');
const closeModal = document.getElementById('closeModal');
const modalContent = document.getElementById('modalContent');
const retryBtn = document.getElementById('retryBtn');

function showLoading() {
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    isLoading = true;
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
    isLoading = false;
}

function showError() {
    errorMessage.classList.remove('hidden');
    loadingIndicator.classList.add('hidden');
    gamesGrid.innerHTML = '';
    loadMoreBtn.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

async function fetchGames(searchTerm = '', storeID = '') {
    try {
        showLoading();
        hideError();

        let url;
        
        if (searchTerm.trim() !== '') {

            url = `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(searchTerm)}&limit=20`;
        } else {

            const storeParam = storeID ? `&storeID=${storeID}` : '&storeID=1';
            url = `https://www.cheapshark.com/api/1.0/deals?pageSize=20${storeParam}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Error en la respuesta de la API');
        }

        const data = await response.json();
        

        if (searchTerm.trim() !== '') {

            currentGames = await processSearchResults(data);
        } else {

            currentGames = data;
        }

        currentPage = 0;
        renderGames();
        hideLoading();
        
    } catch (error) {
        console.error('Error al obtener juegos:', error);
        hideLoading();
        showError();
    }
}

async function processSearchResults(searchResults) {
    const processedGames = [];
    
    for (let i = 0; i < Math.min(searchResults.length, 12); i++) {
        const game = searchResults[i];

        try {
            const gameDetails = await fetch(`https://www.cheapshark.com/api/1.0/games?id=${game.gameID}`);
            const details = await gameDetails.json();
            
            if (details.deals && details.deals.length > 0) {
                const bestDeal = details.deals[0];
                processedGames.push({
                    gameID: game.gameID,
                    title: game.external,
                    thumb: game.thumb,
                    salePrice: bestDeal.price,
                    normalPrice: bestDeal.retailPrice,
                    savings: bestDeal.savings,
                    storeID: bestDeal.storeID,
                    dealID: bestDeal.dealID
                });
            }
        } catch (err) {
            console.error('Error al obtener detalles del juego:', err);
        }
    }
    
    return processedGames;
}

async function fetchGameDetails(gameID) {
    try {
        const response = await fetch(`https://www.cheapshark.com/api/1.0/games?id=${gameID}`);
        
        if (!response.ok) {
            throw new Error('Error al obtener detalles del juego');
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function renderGames() {

    gamesGrid.innerHTML = '';

    const startIndex = 0;
    const endIndex = (currentPage + 1) * gamesPerPage;
    const gamesToShow = currentGames.slice(startIndex, endIndex);

    if (gamesToShow.length === 0) {
        gamesGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <p class="text-2xl text-gray-400">😔 No se encontraron videojuegos</p>
                <p class="text-gray-500 mt-2">Intenta con otros criterios de búsqueda</p>
            </div>
        `;
        loadMoreBtn.classList.add('hidden');
        return;
    }

    gamesToShow.forEach(game => {
        const card = createGameCard(game);
        gamesGrid.appendChild(card);
    });

    if (endIndex < currentGames.length) {
        loadMoreBtn.classList.remove('hidden');
    } else {
        loadMoreBtn.classList.add('hidden');
    }
}

function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-purple-500/20 hover:border-purple-500/50 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 cursor-pointer group';

    const title = game.title || 'Título no disponible';
    const thumb = game.thumb || 'https://via.placeholder.com/300x200?text=Sin+Imagen';
    const salePrice = parseFloat(game.salePrice || 0);
    const normalPrice = parseFloat(game.normalPrice || game.salePrice || 0);
    const savings = parseFloat(game.savings || 0);

    card.innerHTML = `
        <div class="relative overflow-hidden">
            <img 
                src="${thumb}" 
                alt="${title}"
                class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                onerror="this.src='https://via.placeholder.com/300x200?text=Sin+Imagen'"
            >
            ${savings > 0 ? `
                <div class="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg">
                    -${Math.round(savings)}%
                </div>
            ` : ''}
        </div>
        <div class="p-4">
            <h3 class="font-bold text-lg mb-3 line-clamp-2 min-h-[3.5rem]">${title}</h3>
            <div class="flex items-center justify-between mb-4">
                <div>
                    ${normalPrice > salePrice ? `
                        <p class="text-gray-400 line-through text-sm">$${normalPrice.toFixed(2)}</p>
                    ` : ''}
                    <p class="text-2xl font-bold text-green-400">$${salePrice.toFixed(2)}</p>
                </div>
            </div>
            <button 
                class="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
                onclick="openGameModal('${game.gameID || game.dealID}')"
            >
                Ver detalle
            </button>
        </div>
    `;

    return card;
}

async function openGameModal(gameID) {
    gameModal.classList.remove('hidden');
    modalContent.innerHTML = `
        <div class="flex justify-center items-center py-20">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
        </div>
    `;

    const gameDetails = await fetchGameDetails(gameID);

    if (!gameDetails) {
        modalContent.innerHTML = `
            <div class="text-center py-10">
                <p class="text-xl text-red-400">Error al cargar los detalles del juego</p>
            </div>
        `;
        return;
    }

    const info = gameDetails.info;
    const bestDeal = gameDetails.deals && gameDetails.deals.length > 0 ? gameDetails.deals[0] : null;

    modalContent.innerHTML = `
        <div class="space-y-6">
            <img 
                src="${info.thumb}" 
                alt="${info.title}"
                class="w-full h-64 object-cover rounded-lg"
                onerror="this.src='https://via.placeholder.com/600x400?text=Sin+Imagen'"
            >
            
            <h2 class="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                ${info.title}
            </h2>

            ${bestDeal ? `
                <div class="bg-white/5 rounded-lg p-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-gray-400 text-sm mb-1">Precio Normal</p>
                            <p class="text-2xl font-bold line-through text-gray-500">$${parseFloat(bestDeal.retailPrice).toFixed(2)}</p>
                        </div>
                        <div>
                            <p class="text-gray-400 text-sm mb-1">Precio en Oferta</p>
                            <p class="text-3xl font-bold text-green-400">$${parseFloat(bestDeal.price).toFixed(2)}</p>
                        </div>
                    </div>

                    ${parseFloat(bestDeal.savings) > 0 ? `
                        <div class="bg-red-600/20 border border-red-500 rounded-lg p-4 text-center">
                            <p class="text-2xl font-bold">¡Ahorra ${Math.round(parseFloat(bestDeal.savings))}%!</p>
                        </div>
                    ` : ''}

                    <a 
                        href="https://www.cheapshark.com/redirect?dealID=${bestDeal.dealID}" 
                        target="_blank"
                        class="block w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-bold text-center hover:from-green-700 hover:to-emerald-700 transition-all text-lg"
                    >
                        🛒 Comprar ahora
                    </a>
                </div>
            ` : `
                <div class="bg-yellow-600/20 border border-yellow-500 rounded-lg p-4 text-center">
                    <p class="text-lg">No hay ofertas disponibles en este momento</p>
                </div>
            `}

            ${gameDetails.deals && gameDetails.deals.length > 1 ? `
                <div class="bg-white/5 rounded-lg p-4">
                    <h3 class="text-xl font-bold mb-3">Otras ofertas disponibles:</h3>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${gameDetails.deals.slice(1, 6).map(deal => `
                            <div class="flex justify-between items-center bg-white/5 rounded p-2">
                                <span class="text-sm">Tienda ${deal.storeID}</span>
                                <span class="font-bold text-green-400">$${parseFloat(deal.price).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function applyFiltersAndSort() {
    let filteredGames = [...currentGames];

    const sortValue = sortFilter.value;

    switch (sortValue) {
        case 'price-asc':
            filteredGames.sort((a, b) => parseFloat(a.salePrice) - parseFloat(b.salePrice));
            break;
        case 'price-desc':
            filteredGames.sort((a, b) => parseFloat(b.salePrice) - parseFloat(a.salePrice));
            break;
        case 'savings':
            filteredGames.sort((a, b) => parseFloat(b.savings || 0) - parseFloat(a.savings || 0));
            break;
        case 'deal':
        default:
  
            break;
    }

    currentGames = filteredGames;
    currentPage = 0;
    renderGames();
}

searchBtn.addEventListener('click', () => {
    const searchTerm = searchInput.value.trim();
    if (searchTerm !== '') {
        fetchGames(searchTerm);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const searchTerm = searchInput.value.trim();
        if (searchTerm !== '') {
            fetchGames(searchTerm);
        }
    }
});

storeFilter.addEventListener('change', () => {
    const storeID = storeFilter.value;
    searchInput.value = ''; 
    fetchGames('', storeID);
});

sortFilter.addEventListener('change', () => {
    applyFiltersAndSort();
});

resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    storeFilter.value = '';
    sortFilter.value = 'deal';
    fetchGames();
});

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    renderGames();
});

closeModal.addEventListener('click', () => {
    gameModal.classList.add('hidden');
});

gameModal.addEventListener('click', (e) => {
    if (e.target === gameModal) {
        gameModal.classList.add('hidden');
    }
});

retryBtn.addEventListener('click', () => {
    fetchGames();
});

document.addEventListener('DOMContentLoaded', () => {
    fetchGames();
});

window.openGameModal = openGameModal;