/**
 * FastAPI Inventory Management - Frontend
 * ========================================
 * JWT-based authentication with modern async patterns
 * 
 * Key Changes from Flask version:
 * - JWT tokens instead of sessions
 * - Token stored in localStorage
 * - Authorization header on all API calls
 * - Login modal for authentication
 * - Automatic redirect on 401 errors
 */

// API Configuration
// For development: point to FastAPI backend
// For production: NGINX will proxy /api/* to FastAPI
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api'  // FastAPI dev server
    : '/api';  // Production (served via NGINX)

// JWT Token Management
// =====================

/**
 * Get JWT token from cookie (or localStorage as fallback)
 * Returns null if not found
 */
function getToken() {
    // Try cookie first
    const name = 'jwt_token=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            const token = c.substring(name.length, c.length);
            if (token) {
                console.log('Token found in cookie');
                return token;
            }
        }
    }
    
    // Fallback to localStorage (for migration)
    const localToken = localStorage.getItem('jwt_token');
    if (localToken) {
        console.log('Token found in localStorage, migrating to cookie...');
        setToken(localToken); // Migrate to cookie
        return localToken;
    }
    
    console.log('No token found');
    return null;
}

/**
 * Save JWT token to cookie
 * Cookie expires when JWT expires (24 hours by default)
 */
function setToken(token) {
    if (!token) {
        console.error('Attempted to set empty token');
        return;
    }
    
    // JWT tokens are typically valid for 24 hours
    // Set cookie to expire in 25 hours to match token expiration
    const expires = new Date();
    expires.setTime(expires.getTime() + (25 * 60 * 60 * 1000)); // 25 hours
    
    // Secure: true in production (HTTPS), SameSite for CSRF protection
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    
    // Set cookie - use path=/ to make it available site-wide
    const cookieString = `jwt_token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`;
    document.cookie = cookieString;
    
    console.log('Token saved to cookie:', cookieString.substring(0, 50) + '...');
    
    // Also keep in localStorage as backup for compatibility
    localStorage.setItem('jwt_token', token);
}

/**
 * Remove JWT token (logout)
 */
function clearToken() {
    // Remove from cookie
    document.cookie = 'jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Remove from localStorage
    localStorage.removeItem('jwt_token');
}

/**
 * Check if token exists
 */
function hasToken() {
    return getToken() !== null;
}

/**
 * Decode JWT token (without verification - just to check expiration)
 * Returns decoded payload or null if invalid
 */
function decodeToken(token) {
    if (!token || typeof token !== 'string') {
        console.error('Invalid token format:', typeof token);
        return null;
    }
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('Invalid JWT format: expected 3 parts, got', parts.length);
            return null;
        }
        
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const decoded = JSON.parse(jsonPayload);
        console.log('Token decoded successfully, expires:', new Date(decoded.exp * 1000).toISOString());
        return decoded;
    } catch (e) {
        console.error('Error decoding token:', e);
        return null;
    }
}

/**
 * Check if token is expired (client-side check)
 */
function isTokenExpired(token) {
    if (!token) {
        return true;
    }
    
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
        console.log('Token invalid or missing expiration');
        return true; // Invalid token or no expiration
    }
    
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;
    
    console.log('Token expires in:', Math.floor(timeUntilExpiry / 1000 / 60), 'minutes');
    
    // Check if token expires in the next 60 seconds (refresh margin)
    const expired = currentTime >= (expirationTime - 60000);
    if (expired) {
        console.log('Token is expired or expiring soon');
    }
    return expired;
}

/**
 * Validate token by checking expiration and optionally testing with server
 * Returns true if token is valid, false otherwise
 */
async function validateToken() {
    console.log('Validating token...');
    const token = getToken();
    if (!token) {
        console.log('No token found for validation');
        return false;
    }
    
    console.log('Token found, checking expiration...');
    
    // First, check expiration client-side (faster)
    if (isTokenExpired(token)) {
        console.log('Token expired (client-side check), clearing...');
        clearToken();
        return false;
    }
    
    console.log('Token not expired, validating with server...');
    
    // Token appears valid client-side, verify with server (lightweight check)
    try {
        // Use a lightweight protected endpoint to verify token is still valid
        // Using /api/articles with empty search - fast and protected
        const url = `${API_BASE_URL}/articles?search=`;
        console.log('Validating token with:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Validation response status:', response.status);
        
        if (response.status === 401) {
            // Token is invalid or expired on server side
            console.log('Token invalid on server (401), clearing...');
            clearToken();
            return false;
        }
        
        // Any other response (200, 404, etc.) means token is valid
        console.log('Token validated successfully!');
        return true;
    } catch (error) {
        console.error('Token validation error:', error);
        console.log('Network error during validation, trusting client-side check...');
        // On network error, trust client-side expiration check
        // Don't log out user on network issues if token isn't expired
        const stillValid = !isTokenExpired(token);
        console.log('Token considered valid based on expiration check:', stillValid);
        return stillValid;
    }
}

/**
 * Make authenticated API request
 * Automatically adds Authorization header with JWT token
 */
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    // Add Authorization header if authenticated
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    // Make request
    const response = await fetch(url, options);
    
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
        clearToken();
        // Always call showLoginModal() on 401 to reset form state
        // (clears password, hides errors, focuses input)
        // The function is idempotent - safe to call even if modal is already visible
        if (loginModal) {
            showLoginModal();
        } else {
            // Modal doesn't exist yet, wait for DOM
            setTimeout(() => showLoginModal(), 100);
        }
        throw new Error('Authentication required');
    }
    
    return response;
}

// Language configuration (loaded from server)
let lang = {
    appTitle: '📦 Lagerhantering',
    exportCSV: 'Exportera CSV',
    logout: 'Logga ut',
    searchPlaceholder: 'Ange eller skanna EAN-kod...',
    scanBarcode: 'Skanna streckkod',
    scan: 'Skanna',
    scanning: 'Skannar...',
    stopScanning: 'Stoppa skanning',
    welcomeMessage: 'Ange en EAN-kod eller skanna en streckkod för att komma igång',
    currentQuantity: 'Nuvarande kvantitet',
    price: 'Pris',
    apply: 'Tillämpa',
    editArticle: 'Redigera artikel',
    articleNotFound: 'Artikel hittades inte - Lägg till ny artikel',
    eanCode: 'EAN-kod',
    name: 'Namn',
    description: 'Beskrivning',
    initialQuantity: 'Initial kvantitet',
    cancel: 'Avbryt',
    addArticle: 'Lägg till artikel',
    editArticleTitle: 'Redigera artikel',
    saveChanges: 'Spara ändringar',
    currency: 'SEK',
    currencyPosition: 'after',
    connected: '✓ Ansluten till',
    connectionIssue: '⚠ API-anslutningsproblem',
    cannotConnect: '✗ Kan inte ansluta till API',
    ean: 'EAN',
    required: '*',
    pleaseEnterEan: 'Vänligen ange en EAN-kod',
    quantityCannotBeNegative: 'Kvantiteten kan inte vara negativ',
    quantityUpdatedTo: 'Kvantitet uppdaterad till',
    failedToUpdateQuantity: 'Misslyckades att uppdatera kvantitet',
    eanCodeAndNameRequired: 'EAN-kod och namn krävs',
    articleCreatedSuccessfully: 'Artikel skapad framgångsrikt',
    articleUpdatedSuccessfully: 'Artikel uppdaterad framgångsrikt',
    failedToCreateArticle: 'Misslyckades att skapa artikel',
    failedToUpdateArticle: 'Misslyckades att uppdatera artikel',
    failedToLookupArticle: 'Misslyckades att söka artikel',
    cannotConnectToServer: 'Kan inte ansluta till servern',
    barcodeScannerNotLoaded: 'Streckkodsskannerbiblioteket är inte laddat. Vänligen uppdatera sidan',
    errorLoadingVideoStream: 'Fel vid laddning av videoström. Försök igen',
    csvExportedSuccessfully: 'CSV exporterad framgångsrikt',
    failedToExportCsv: 'Misslyckades att exportera CSV'
};

let currentArticle = null;
let scannerActive = false;
let quantityChange = 0;
let lastDetectedCode = null;
let detectionTimeout = null;
let onDetectedHandler = null;
let eventListenersSetup = false; // Track if event listeners have been set up

// DOM Elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const scanBtn = document.getElementById('scanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const cameraContainer = document.getElementById('cameraContainer');
const video = document.getElementById('video');
const resultArea = document.getElementById('resultArea');
const articleDisplay = document.getElementById('articleDisplay');
const addArticleForm = document.getElementById('addArticleForm');
const articleModal = document.getElementById('articleModal');
const articleForm = document.getElementById('articleForm');
const editArticleForm = document.getElementById('editArticleForm');
const exportBtn = document.getElementById('exportBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Login elements
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');

// Article display elements
const articleNameDisplay = document.getElementById('articleNameDisplay');
const articleEanDisplay = document.getElementById('articleEanDisplay');
const articleDescriptionDisplay = document.getElementById('articleDescriptionDisplay');
const articleQuantityDisplay = document.getElementById('articleQuantityDisplay');
const articlePriceDisplay = document.getElementById('articlePriceDisplay');
const priceDisplayContainer = document.getElementById('priceDisplayContainer');
const quantityChangeIndicator = document.getElementById('quantityChange');
const incrementBtn = document.getElementById('incrementBtn');
const decrementBtn = document.getElementById('decrementBtn');
const applyQuantityBtn = document.getElementById('applyQuantityBtn');
const editArticleBtn = document.getElementById('editArticleBtn');

// Add form elements
const newArticleEan = document.getElementById('newArticleEan');
const eanCodeInput = document.getElementById('eanCode');
const articleNameInput = document.getElementById('articleName');
const descriptionInput = document.getElementById('description');
const quantityInput = document.getElementById('quantity');
const priceInput = document.getElementById('price');
const cancelAddBtn = document.getElementById('cancelAddBtn');

// Edit form elements
const editEanCodeInput = document.getElementById('editEanCode');
const editArticleNameInput = document.getElementById('editArticleName');
const editDescriptionInput = document.getElementById('editDescription');
const editQuantityInput = document.getElementById('editQuantity');
const editPriceInput = document.getElementById('editPrice');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const closeModal = document.getElementById('closeModal');

// iOS Viewport Fix
// ================
// Fixes viewport scaling issues on iOS devices
function fixIOSViewport() {
    // Prevent iOS from zooming on input focus
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        const content = viewport.getAttribute('content');
        // Ensure viewport settings are correct
        if (!content.includes('user-scalable=no')) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
    }
    
    // Fix viewport height on iOS Safari
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
    });
    
    // Prevent double-tap zoom on iOS
    // Only prevent if double-tap is on the same element within 300ms
    let lastTouchEnd = { time: 0, target: null };
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        const sameTarget = e.target === lastTouchEnd.target;
        const withinTimeWindow = now - lastTouchEnd.time <= 300;
        
        // Only prevent if it's a double-tap on the SAME element
        // This allows normal interactions like tapping different elements quickly
        if (sameTarget && withinTimeWindow) {
            e.preventDefault();
        }
        
        lastTouchEnd = { time: now, target: e.target };
    }, false);
    
    // Prevent horizontal scroll
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded, initializing...');
    
    // Fix iOS viewport issues first
    fixIOSViewport();
    
    // Check authentication and validate token
    try {
        const hasValidToken = await validateToken();
        console.log('Token validation result:', hasValidToken);
        
        if (!hasValidToken) {
            // No valid token, show login
            console.log('No valid token, showing login modal');
            showLoginModal();
            return;
        }
        
        // Token is valid, hide login modal and initialize app
        console.log('Token valid, hiding login modal and initializing app...');
        hideLoginModal();
        await initializeApp();
    } catch (error) {
        console.error('Error during initialization:', error);
        // On error, show login to be safe
        showLoginModal();
    }
});

/**
 * Initialize the application
 */
async function initializeApp() {
    await loadLanguage();
    applyLanguage();
    await checkApiConnection();
    setupEventListeners();
    searchInput.focus();
}

/**
 * Show login modal
 */
function showLoginModal() {
    loginModal.classList.remove('hidden');
    loginPassword.value = '';
    loginError.classList.add('hidden');
    loginPassword.focus();
}

/**
 * Hide login modal
 */
function hideLoginModal() {
    loginModal.classList.add('hidden');
}

/**
 * Handle login form submission
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = loginPassword.value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password })
        });
        
        if (response.ok) {
            const data = await response.json();
            // Save JWT token
            setToken(data.access_token);
            hideLoginModal();
            // Initialize app
            await initializeApp();
        } else {
            const error = await response.json();
            loginError.textContent = error.detail || 'Invalid password';
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Cannot connect to server';
        loginError.classList.remove('hidden');
    }
});

// Load language configuration from server
async function loadLanguage() {
    try {
        const response = await fetch(`${API_BASE_URL}/language`);
        if (response.ok) {
            lang = await response.json();
        }
    } catch (error) {
        console.log('Using default language configuration');
    }
}

// Apply language to UI elements
function applyLanguage() {
    if (document.querySelector('.toolbar-left h1')) {
        document.querySelector('.toolbar-left h1').textContent = lang.appTitle;
    }
    if (exportBtn) exportBtn.title = lang.exportCSV;
    if (logoutBtn) logoutBtn.title = lang.logout;
    if (searchInput) searchInput.placeholder = lang.searchPlaceholder;
    if (scanBtn) {
        scanBtn.title = lang.scanBarcode;
        scanBtn.innerHTML = `<i class="fa-solid fa-barcode"></i> ${lang.scan}`;
    }
    if (stopScanBtn) stopScanBtn.textContent = lang.stopScanning;
    
    const welcomeMsg = document.querySelector('.welcome-message p');
    if (welcomeMsg) welcomeMsg.textContent = lang.welcomeMessage;
    
    const currentQtyLabel = document.querySelector('.detail-item-large .detail-label');
    if (currentQtyLabel) {
        currentQtyLabel.textContent = lang.currentQuantity;
    }
    const priceLabel = document.querySelector('#priceDisplayContainer .detail-label');
    if (priceLabel) {
        priceLabel.textContent = lang.price;
    }
    if (applyQuantityBtn) applyQuantityBtn.textContent = lang.apply;
    if (editArticleBtn) editArticleBtn.textContent = lang.editArticle;
    
    const addFormTitle = document.querySelector('#addArticleForm h2');
    if (addFormTitle) addFormTitle.textContent = lang.articleNotFound;
    
    const eanLabel = document.querySelector('label[for="eanCode"]');
    if (eanLabel) eanLabel.textContent = `${lang.eanCode} ${lang.required}`;
    
    const nameLabel = document.querySelector('label[for="articleName"]');
    if (nameLabel) nameLabel.textContent = `${lang.name} ${lang.required}`;
    
    const descLabel = document.querySelector('label[for="description"]');
    if (descLabel) descLabel.textContent = lang.description;
    
    const qtyLabel = document.querySelector('label[for="quantity"]');
    if (qtyLabel) qtyLabel.textContent = `${lang.initialQuantity} ${lang.required}`;
    
    const priceLabelInput = document.querySelector('label[for="price"]');
    if (priceLabelInput) priceLabelInput.textContent = lang.price;
    
    const cancelAdd = document.getElementById('cancelAddBtn');
    if (cancelAdd) cancelAdd.textContent = lang.cancel;
    
    const addArticleBtn = document.querySelector('#articleForm button[type="submit"]');
    if (addArticleBtn) addArticleBtn.textContent = lang.addArticle;
    
    const editFormTitle = document.querySelector('#articleModal h2');
    if (editFormTitle) editFormTitle.textContent = lang.editArticleTitle;
    
    const editEanLabel = document.querySelector('label[for="editEanCode"]');
    if (editEanLabel) editEanLabel.textContent = lang.eanCode;
    
    const editNameLabel = document.querySelector('label[for="editArticleName"]');
    if (editNameLabel) editNameLabel.textContent = `${lang.name} ${lang.required}`;
    
    const editDescLabel = document.querySelector('label[for="editDescription"]');
    if (editDescLabel) editDescLabel.textContent = lang.description;
    
    const editQtyLabel = document.querySelector('label[for="editQuantity"]');
    if (editQtyLabel) editQtyLabel.textContent = lang.currentQuantity;
    
    const editPriceLabel = document.querySelector('label[for="editPrice"]');
    if (editPriceLabel) editPriceLabel.textContent = lang.price;
    
    const cancelEdit = document.getElementById('cancelEditBtn');
    if (cancelEdit) cancelEdit.textContent = lang.cancel;
    
    const saveBtn = document.querySelector('#editArticleForm button[type="submit"]');
    if (saveBtn) saveBtn.textContent = lang.saveChanges;
}

// Check API connection on startup
async function checkApiConnection() {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;
    
    try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
        if (response.ok) {
            statusEl.textContent = `${lang.connected} ${API_BASE_URL}`;
            statusEl.style.color = '#90EE90';
        } else {
            statusEl.textContent = lang.connectionIssue;
            statusEl.style.color = '#FFA500';
        }
    } catch (error) {
        statusEl.textContent = `${lang.cannotConnect} (${API_BASE_URL})`;
        statusEl.style.color = '#FF6B6B';
    }
}

function setupEventListeners() {
    // Prevent duplicate event listeners
    // If already setup, skip (event listeners persist across logout/login)
    if (eventListenersSetup) {
        console.log('Event listeners already set up, skipping...');
        return;
    }
    
    // Store references to handlers so we can remove them if needed
    const handlers = {
        searchSubmit: handleSearchSubmit,
        scanClick: toggleBarcodeScanner,
        stopScanClick: stopBarcodeScanner,
        incrementClick: () => adjustQuantity(1),
        decrementClick: () => adjustQuantity(-1),
        applyQuantityClick: applyQuantityChange,
        editArticleClick: openEditModal,
        addArticleSubmit: handleAddArticleSubmit,
        cancelAddClick: resetView,
        editArticleSubmit: handleEditArticleSubmit,
        cancelEditClick: closeEditModal,
        closeModalClick: closeEditModal,
        exportClick: exportToCSV,
        logoutClick: handleLogout,
        modalClick: (e) => {
            if (e.target === articleModal) {
                closeEditModal();
            }
        }
    };
    
    // Add event listeners
    searchForm.addEventListener('submit', handlers.searchSubmit);
    scanBtn.addEventListener('click', handlers.scanClick);
    stopScanBtn.addEventListener('click', handlers.stopScanClick);
    incrementBtn.addEventListener('click', handlers.incrementClick);
    decrementBtn.addEventListener('click', handlers.decrementClick);
    applyQuantityBtn.addEventListener('click', handlers.applyQuantityClick);
    editArticleBtn.addEventListener('click', handlers.editArticleClick);
    articleForm.addEventListener('submit', handlers.addArticleSubmit);
    cancelAddBtn.addEventListener('click', handlers.cancelAddClick);
    editArticleForm.addEventListener('submit', handlers.editArticleSubmit);
    cancelEditBtn.addEventListener('click', handlers.cancelEditClick);
    closeModal.addEventListener('click', handlers.closeModalClick);
    
    if (exportBtn) {
        exportBtn.addEventListener('click', handlers.exportClick);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handlers.logoutClick);
    }
    
    articleModal.addEventListener('click', handlers.modalClick);
    
    // Store handlers for potential cleanup (if needed in future)
    window._eventHandlers = handlers;
    
    eventListenersSetup = true;
    console.log('Event listeners set up');
}

// Handle search form submission
async function handleSearchSubmit(e) {
    e.preventDefault();
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        showError(lang.pleaseEnterEan);
        return;
    }
    
    await lookupArticle(searchTerm);
}

// Look up article by EAN code
async function lookupArticle(eanCode) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/articles/${eanCode}`);
        
        if (response.ok) {
            const article = await response.json();
            currentArticle = article;
            displayArticle(article);
        } else if (response.status === 404) {
            showAddForm(eanCode);
        } else {
            throw new Error('Failed to lookup article');
        }
    } catch (error) {
        if (error.message !== 'Authentication required') {
            console.error('Error looking up article:', error);
            showError(lang.failedToLookupArticle + ': ' + error.message);
        }
    }
}

// Display existing article
function displayArticle(article) {
    currentArticle = {
        ...article,
        quantity: Number(article.quantity ?? 0)
    };
    quantityChange = 0;
    
    addArticleForm.classList.add('hidden');
    articleDisplay.classList.remove('hidden');
    resultArea.classList.add('hidden');
    
    articleNameDisplay.textContent = article.name;
    articleEanDisplay.textContent = `${lang.ean}: ${article.ean_code}`;
    
    if (article.description) {
        articleDescriptionDisplay.textContent = article.description;
        articleDescriptionDisplay.style.display = 'block';
    } else {
        articleDescriptionDisplay.style.display = 'none';
    }
    
    articleQuantityDisplay.textContent = currentArticle.quantity;
    
    if (article.price) {
        const priceValue = parseFloat(article.price).toFixed(2);
        if (lang.currencyPosition === 'after') {
            articlePriceDisplay.textContent = `${priceValue} ${lang.currency}`;
        } else {
            articlePriceDisplay.textContent = `${lang.currency} ${priceValue}`;
        }
        priceDisplayContainer.style.display = 'flex';
    } else {
        priceDisplayContainer.style.display = 'none';
    }
    
    updateQuantityChangeIndicator();
    setTimeout(() => searchInput.focus(), 100);
}

// Show add form for new article
function showAddForm(eanCode) {
    currentArticle = null;
    
    articleDisplay.classList.add('hidden');
    addArticleForm.classList.remove('hidden');
    resultArea.classList.add('hidden');
    
    eanCodeInput.value = eanCode;
    const eanLabel = document.querySelector('#addArticleForm .form-subtitle');
    if (eanLabel) {
        eanLabel.innerHTML = `${lang.eanCode}: <strong>${eanCode}</strong>`;
    }
    
    articleNameInput.value = '';
    descriptionInput.value = '';
    quantityInput.value = '1';
    priceInput.value = '';
    
    articleNameInput.focus();
}

// Reset view to initial state
function resetView() {
    articleDisplay.classList.add('hidden');
    addArticleForm.classList.add('hidden');
    resultArea.classList.remove('hidden');
    currentArticle = null;
    searchInput.value = '';
    searchInput.focus();
}

// Quantity adjustment
function adjustQuantity(change) {
    quantityChange += change;
    updateQuantityChangeIndicator();
}

function updateQuantityChangeIndicator() {
    if (quantityChange === 0) {
        quantityChangeIndicator.textContent = '0';
        quantityChangeIndicator.style.color = '#666';
        applyQuantityBtn.disabled = true;
    } else {
        quantityChangeIndicator.textContent = quantityChange > 0 
            ? `+${quantityChange}` 
            : `${quantityChange}`;
        quantityChangeIndicator.style.color = quantityChange > 0 ? '#28a745' : '#dc3545';
        applyQuantityBtn.disabled = false;
    }
}

// Apply quantity change
async function applyQuantityChange() {
    if (!currentArticle || quantityChange === 0) return;
    const currentQty = Number(currentArticle.quantity ?? 0);
    const newQuantity = currentQty + quantityChange;

    if (!Number.isFinite(newQuantity)) {
        showError('Invalid quantity value');
        return;
    }
    
    if (newQuantity < 0) {
        showError(lang.quantityCannotBeNegative);
        return;
    }
    
    try {
        await updateArticle(currentArticle.ean_code, { quantity: newQuantity });
        currentArticle.quantity = newQuantity;
        displayArticle(currentArticle);
        showSuccess(`${lang.quantityUpdatedTo} ${newQuantity}`);
    } catch (error) {
        if (error.message !== 'Authentication required') {
            showError(lang.failedToUpdateQuantity + ': ' + error.message);
        }
    }
}

// Open edit modal
function openEditModal() {
    if (!currentArticle) return;
    
    editEanCodeInput.value = currentArticle.ean_code;
    editArticleNameInput.value = currentArticle.name;
    editDescriptionInput.value = currentArticle.description || '';
    editQuantityInput.value = currentArticle.quantity || 0;
    editPriceInput.value = currentArticle.price || '';
    
    articleModal.classList.remove('hidden');
}

// Close edit modal
function closeEditModal() {
    articleModal.classList.add('hidden');
}

// Handle add article form submission
async function handleAddArticleSubmit(e) {
    e.preventDefault();
    
    const articleData = {
        ean_code: eanCodeInput.value.trim(),
        name: articleNameInput.value.trim(),
        description: descriptionInput.value.trim(),
        quantity: parseInt(quantityInput.value) || 1,
        price: priceInput.value ? parseFloat(priceInput.value) : null,
    };
    
    if (!articleData.ean_code || !articleData.name) {
        showError(lang.eanCodeAndNameRequired);
        return;
    }
    
    try {
        await createArticle(articleData);
        showSuccess(lang.articleCreatedSuccessfully);
        await lookupArticle(articleData.ean_code);
    } catch (error) {
        if (error.message !== 'Authentication required') {
            showError(error.message || lang.failedToCreateArticle);
        }
    }
}

// Handle edit article form submission
async function handleEditArticleSubmit(e) {
    e.preventDefault();
    
    if (!currentArticle) return;
    
    const updateData = {
        name: editArticleNameInput.value.trim(),
        description: editDescriptionInput.value.trim(),
        quantity: parseInt(editQuantityInput.value) || 0,
        price: editPriceInput.value ? parseFloat(editPriceInput.value) : null,
    };
    
    try {
        await updateArticle(currentArticle.ean_code, updateData);
        showSuccess(lang.articleUpdatedSuccessfully);
        closeEditModal();
        await lookupArticle(currentArticle.ean_code);
    } catch (error) {
        if (error.message !== 'Authentication required') {
            showError(error.message || lang.failedToUpdateArticle);
        }
    }
}

// API Functions
async function createArticle(articleData) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/articles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(articleData),
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to create article';
            try {
                const error = await response.json();
                errorMessage = error.detail || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function updateArticle(eanCode, updateData) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/articles/${eanCode}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to update article';
            try {
                const error = await response.json();
                errorMessage = error.detail || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Barcode Scanner Functions
function toggleBarcodeScanner() {
    if (scannerActive) {
        stopBarcodeScanner();
    } else {
        startBarcodeScanner();
    }
}

function startBarcodeScanner() {
    if (typeof Quagga === 'undefined') {
        showError(lang.barcodeScannerNotLoaded);
        return;
    }

    // Ensure getUserMedia is available for Quagga (some browsers only expose mediaDevices)
    if (!navigator.getUserMedia && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.getUserMedia = (constraints, success, error) => {
            navigator.mediaDevices.getUserMedia(constraints).then(success).catch(error);
        };
    }

    // Guard: camera access requires a secure context (HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Camera error: getUserMedia is not available (HTTPS or localhost required)');
        return;
    }
    
    scannerActive = true;
    cameraContainer.classList.remove('hidden');
    scanBtn.innerHTML = `<i class="fa-solid fa-barcode"></i> ${lang.scanning}`;
    scanBtn.disabled = true;
    
    const cameraError = document.getElementById('cameraError');
    if (cameraError) {
        cameraError.classList.add('hidden');
    }
    
    video.srcObject = null;
    video.src = '';
    
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: video,
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
            }
        },
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader"
                //"code_128_reader",
                //"code_39_reader",
                //"upc_reader",
                //"upc_e_reader"
            ],
            debug: {
                drawBoundingBox: false,
                showFrequency: false,
                drawScanline: false,
                showPattern: false
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 0, // 0 = no workers (more compatible, works better on some browsers)
        frequency: 10,
        locate: true
    }, (err) => {
        if (err) {
            console.error('Quagga initialization error:', err);
            
            let errorMessage = 'Failed to initialize barcode scanner';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'Camera permission denied. Please allow camera access and try again.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = 'No camera found. Please connect a camera and try again.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage = 'Camera is already in use by another application.';
            } else if (err.message) {
                errorMessage = `Camera error: ${err.message}`;
            }
            
            showError(errorMessage);
            stopBarcodeScanner();
            return;
        }
        
        console.log('Quagga initialized successfully');
        video.style.display = 'block';
        
        if (cameraError) {
            cameraError.classList.add('hidden');
        }
        
        let videoLoaded = false;
        let errorTimeout = null;
        
        const errorHandler = (e) => {
            console.error('Video error:', e);
            errorTimeout = setTimeout(() => {
                if (!videoLoaded && cameraError) {
                    cameraError.textContent = lang.errorLoadingVideoStream;
                    cameraError.classList.remove('hidden');
                }
            }, 2000);
        };
        
        video.removeEventListener('error', errorHandler);
        video.addEventListener('error', errorHandler, { once: true });
        
        const successHandler = () => {
            videoLoaded = true;
            if (errorTimeout) {
                clearTimeout(errorTimeout);
            }
            if (cameraError) {
                cameraError.classList.add('hidden');
            }
        };
        
        video.addEventListener('playing', successHandler, { once: true });
        video.addEventListener('loadedmetadata', () => {
            console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
        }, { once: true });
        
        // Note: Quagga manages its own video stream, so we don't need to manually attach
        // This manual attachment was causing conflicts. Quagga handles the stream internally.
        // Only attach if Quagga's stream isn't working (this is a fallback)
        setTimeout(() => {
            // Check if video is already playing (Quagga's stream)
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
                console.log('Video stream already active from Quagga');
                videoLoaded = true;
                if (errorTimeout) {
                    clearTimeout(errorTimeout);
                }
                if (cameraError) {
                    cameraError.classList.add('hidden');
                }
            } else {
                // Fallback: only manually attach if Quagga didn't set up the stream
                console.log('Quagga stream not active, using fallback...');
                navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 640,
                        height: 480,
                        facingMode: "environment"
                    }
                }).then(stream => {
                    // Only use fallback if Quagga hasn't attached a stream
                    if (!video.srcObject) {
                        video.srcObject = stream;
                        return video.play();
                    } else {
                        // Quagga already has the stream, stop the fallback
                        stream.getTracks().forEach(track => track.stop());
                        return Promise.resolve();
                    }
                }).then(() => {
                    console.log('Video stream ready');
                    videoLoaded = true;
                    if (errorTimeout) {
                        clearTimeout(errorTimeout);
                    }
                    if (cameraError) {
                        cameraError.classList.add('hidden');
                    }
                }).catch(e => {
                    console.error('Error with video stream fallback:', e);
                    // Don't fail completely, Quagga might still work
                });
            }
        }, 500); // Increased delay to let Quagga initialize first
        
        Quagga.start();
        
        // Remove any existing handler first to prevent duplicates
        if (onDetectedHandler) {
            Quagga.offDetected(onDetectedHandler);
        }
        
        // Create handler with debouncing to prevent multiple rapid detections
        onDetectedHandler = (result) => {
            if (!result || !result.codeResult || !result.codeResult.code) {
                console.warn('Invalid barcode detection result:', result);
                return;
            }
            
            const code = result.codeResult.code.trim();
            
            // Validate code format (EAN codes are typically 10-13 digits)
            if (!code || code.length < 10 || code.length > 13) {
                console.log('Invalid barcode length:', code);
                return;
            }
            
            // Validate that code contains only digits (EAN codes are numeric)
            if (!/^\d+$/.test(code)) {
                console.log('Invalid barcode format (non-numeric):', code);
                return;
            }
            
            // Debounce: ignore if same code detected within 1 second
            if (lastDetectedCode === code && detectionTimeout) {
                console.log('Duplicate detection ignored:', code);
                return; // Ignore duplicate detection
            }
            
            // Clear any pending timeout
            if (detectionTimeout) {
                clearTimeout(detectionTimeout);
            }
            
            // Store the detected code
            lastDetectedCode = code;
            
            console.log('Valid barcode detected, confirming...', code);
            
            // Add a small delay to ensure we got a stable read
            // This prevents processing rapid multiple detections of the same code
            detectionTimeout = setTimeout(() => {
                // Verify code hasn't changed
                if (lastDetectedCode === code) {
                    console.log('Barcode confirmed and processing:', code);
                    handleBarcodeScanned(code);
                }
                // Reset after handling
                lastDetectedCode = null;
                detectionTimeout = null;
            }, 400); // 400ms debounce delay for stability
        };
        
        // Register the handler
        Quagga.onDetected(onDetectedHandler);
    });
}

function stopBarcodeScanner() {
    scannerActive = false;
    
    // Clear debounce timeout
    if (detectionTimeout) {
        clearTimeout(detectionTimeout);
        detectionTimeout = null;
    }
    
    // Reset detection tracking
    lastDetectedCode = null;
    
    // Remove detection handler
    if (typeof Quagga !== 'undefined' && Quagga && onDetectedHandler) {
        try {
            Quagga.offDetected(onDetectedHandler);
            onDetectedHandler = null;
        } catch (e) {
            console.log('Error removing Quagga handler:', e);
        }
    }
    
    // Stop Quagga
    if (typeof Quagga !== 'undefined' && Quagga) {
        try {
            Quagga.stop();
        } catch (e) {
            console.log('Quagga already stopped');
        }
    }
    
    // Stop video stream
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => {
            track.stop();
        });
        video.srcObject = null;
    }
    
    cameraContainer.classList.add('hidden');
    const cameraError = document.getElementById('cameraError');
    if (cameraError) {
        cameraError.classList.add('hidden');
    }
    
    scanBtn.innerHTML = `<i class="fa-solid fa-barcode"></i> ${lang.scan}`;
    scanBtn.disabled = false;
}

function handleBarcodeScanned(eanCode) {
    stopBarcodeScanner();
    searchInput.value = eanCode;
    lookupArticle(eanCode);
}

// Utility Functions
function showError(message) {
    console.error('Error:', message);
    alert('Error: ' + message);
}

function showSuccess(message) {
    console.log('Success:', message);
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Export to CSV
async function exportToCSV() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/export/csv`, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error('Failed to export CSV');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showSuccess(lang.csvExportedSuccessfully);
    } catch (error) {
        if (error.message !== 'Authentication required') {
            console.error('Error exporting CSV:', error);
            showError(lang.failedToExportCsv + ': ' + error.message);
        }
    }
}

// Logout
async function handleLogout() {
    try {
        // Call logout endpoint (optional with JWT)
        await fetchWithAuth(`${API_BASE_URL}/auth/logout`, {
            method: 'POST'
        });
    } catch (error) {
        console.log('Logout endpoint error (non-critical):', error);
    } finally {
        // Clear token and show login
        clearToken();
        showLoginModal();
    }
}

// Log API URL for debugging
console.log('API Base URL:', API_BASE_URL);
console.log('JWT Token present:', hasToken());

