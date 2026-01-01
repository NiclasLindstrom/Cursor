// Auto-detect API URL based on current host
// If running on same domain, use relative path; otherwise use full URL
const getApiBaseUrl = () => {
    // Check if we have a custom API URL set (for cloud deployments)
    const customApiUrl = localStorage.getItem('API_BASE_URL');
    if (customApiUrl) {
        return customApiUrl;
    }
    
    // Auto-detect: if we're on the same origin, use relative path
    // Otherwise, try to construct from current location
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // If accessing via localhost or 127.0.0.1, use localhost:5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:5000/api`;
    }
    
    // For cloud deployments, use same origin (assuming Flask serves the frontend)
    // Or construct from current location
    if (port) {
        return `${protocol}//${hostname}:${port}/api`;
    }
    return `${protocol}//${hostname}/api`;
};

const API_BASE_URL = getApiBaseUrl();

let currentArticle = null;
let scannerActive = false;
let quantityChange = 0;

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkApiConnection();
    setupEventListeners();
    // Focus on search input
    searchInput.focus();
});

// Check API connection on startup
async function checkApiConnection() {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;
    
    try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
        if (response.ok) {
            statusEl.textContent = `✓ Connected to ${API_BASE_URL.replace('/api', '')}`;
            statusEl.style.color = '#90EE90';
        } else {
            statusEl.textContent = `⚠ API connection issue`;
            statusEl.style.color = '#FFA500';
        }
    } catch (error) {
        statusEl.textContent = `✗ Cannot connect to API (${API_BASE_URL})`;
        statusEl.style.color = '#FF6B6B';
    }
}

function setupEventListeners() {
    // Search form submission
    searchForm.addEventListener('submit', handleSearchSubmit);
    
    // Barcode scanner
    scanBtn.addEventListener('click', toggleBarcodeScanner);
    stopScanBtn.addEventListener('click', stopBarcodeScanner);
    
    // Quantity controls
    incrementBtn.addEventListener('click', () => adjustQuantity(1));
    decrementBtn.addEventListener('click', () => adjustQuantity(-1));
    applyQuantityBtn.addEventListener('click', applyQuantityChange);
    
    // Article actions
    editArticleBtn.addEventListener('click', openEditModal);
    
    // Add article form
    articleForm.addEventListener('submit', handleAddArticleSubmit);
    cancelAddBtn.addEventListener('click', resetView);
    
    // Edit article form
    editArticleForm.addEventListener('submit', handleEditArticleSubmit);
    cancelEditBtn.addEventListener('click', closeEditModal);
    closeModal.addEventListener('click', closeEditModal);
    
    // Close modal on outside click
    articleModal.addEventListener('click', (e) => {
        if (e.target === articleModal) {
            closeEditModal();
        }
    });
}

// Handle search form submission
async function handleSearchSubmit(e) {
    e.preventDefault();
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        showError('Please enter an EAN code');
        return;
    }
    
    // Look up article by EAN code
    await lookupArticle(searchTerm);
}

// Look up article by EAN code
async function lookupArticle(eanCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${eanCode}`);
        
        if (response.ok) {
            // Article exists
            const article = await response.json();
            currentArticle = article;
            displayArticle(article);
        } else if (response.status === 404) {
            // Article doesn't exist - show add form
            showAddForm(eanCode);
        } else {
            throw new Error('Failed to lookup article');
        }
    } catch (error) {
        console.error('Error looking up article:', error);
        if (error.message.includes('Failed to fetch')) {
            showError(`Cannot connect to server. Check if backend is running at ${API_BASE_URL}`);
        } else {
            showError('Failed to lookup article: ' + error.message);
        }
    }
}

// Display existing article
function displayArticle(article) {
    currentArticle = article;
    quantityChange = 0;
    
    // Hide add form, show article display
    addArticleForm.classList.add('hidden');
    articleDisplay.classList.remove('hidden');
    resultArea.classList.add('hidden');
    
    // Populate article data
    articleNameDisplay.textContent = article.name;
    articleEanDisplay.textContent = `EAN: ${article.ean_code}`;
    
    if (article.description) {
        articleDescriptionDisplay.textContent = article.description;
        articleDescriptionDisplay.style.display = 'block';
    } else {
        articleDescriptionDisplay.style.display = 'none';
    }
    
    articleQuantityDisplay.textContent = article.quantity || 0;
    
    if (article.price) {
        articlePriceDisplay.textContent = `$${parseFloat(article.price).toFixed(2)}`;
        priceDisplayContainer.style.display = 'flex';
    } else {
        priceDisplayContainer.style.display = 'none';
    }
    
    // Reset quantity change indicator
    updateQuantityChangeIndicator();
    
    // Focus back on search for next scan
    setTimeout(() => searchInput.focus(), 100);
}

// Show add form for new article
function showAddForm(eanCode) {
    currentArticle = null;
    
    // Hide article display, show add form
    articleDisplay.classList.add('hidden');
    addArticleForm.classList.remove('hidden');
    resultArea.classList.add('hidden');
    
    // Set EAN code (readonly)
    eanCodeInput.value = eanCode;
    newArticleEan.textContent = eanCode;
    
    // Reset form
    articleNameInput.value = '';
    descriptionInput.value = '';
    quantityInput.value = '1'; // Default to 1
    priceInput.value = '';
    
    // Focus on name input
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
    
    const newQuantity = (currentArticle.quantity || 0) + quantityChange;
    
    if (newQuantity < 0) {
        showError('Quantity cannot be negative');
        return;
    }
    
    try {
        await updateArticle(currentArticle.ean_code, { quantity: newQuantity });
        currentArticle.quantity = newQuantity;
        displayArticle(currentArticle); // Refresh display
        showSuccess(`Quantity updated to ${newQuantity}`);
    } catch (error) {
        showError('Failed to update quantity: ' + error.message);
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
        showError('EAN code and name are required');
        return;
    }
    
    try {
        await createArticle(articleData);
        showSuccess('Article created successfully');
        // Look up the newly created article to display it
        await lookupArticle(articleData.ean_code);
    } catch (error) {
        showError(error.message || 'Failed to create article');
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
        showSuccess('Article updated successfully');
        closeEditModal();
        // Refresh article display
        await lookupArticle(currentArticle.ean_code);
    } catch (error) {
        showError(error.message || 'Failed to update article');
    }
}

// API Functions
async function createArticle(articleData) {
    try {
        const response = await fetch(`${API_BASE_URL}/articles`, {
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
                errorMessage = error.error || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error(`Cannot connect to server at ${API_BASE_URL}. Check if the backend is running and CORS is enabled.`);
        }
        throw error;
    }
}

async function updateArticle(eanCode, updateData) {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${eanCode}`, {
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
                errorMessage = error.error || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error(`Cannot connect to server at ${API_BASE_URL}. Check if the backend is running and CORS is enabled.`);
        }
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
    // Check if QuaggaJS is loaded
    if (typeof Quagga === 'undefined') {
        showError('Barcode scanner library not loaded. Please refresh the page.');
        return;
    }
    
    scannerActive = true;
    cameraContainer.classList.remove('hidden');
    scanBtn.textContent = '📷 Scanning...';
    scanBtn.disabled = true;
    
    // Hide any previous error messages
    const cameraError = document.getElementById('cameraError');
    if (cameraError) {
        cameraError.classList.add('hidden');
    }
    
    // Use QuaggaJS for barcode scanning
    // Quagga will handle camera access and permissions
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: video,
            constraints: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                facingMode: "environment", // Use back camera on mobile, front on desktop
                aspectRatio: { ideal: 1.7777777778 } // 16:9
            }
        },
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader",
                "code_128_reader",
                "code_39_reader",
                "upc_reader",
                "upc_e_reader"
            ],
            debug: {
                drawBoundingBox: true,
                showFrequency: false,
                drawScanline: true,
                showPattern: false
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10
    }, (err) => {
        if (err) {
            console.error('Quagga initialization error:', err);
            
            // Provide more specific error messages
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
        Quagga.start();
        
        // Listen for barcode detection
        Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            if (code) {
                console.log('Barcode detected:', code);
                handleBarcodeScanned(code);
            }
        });
    });
}

function stopBarcodeScanner() {
    scannerActive = false;
    
    // Stop Quagga first
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
    
    // Hide camera container
    cameraContainer.classList.add('hidden');
    const cameraError = document.getElementById('cameraError');
    if (cameraError) {
        cameraError.classList.add('hidden');
    }
    
    // Reset button
    scanBtn.textContent = '📷 Scan';
    scanBtn.disabled = false;
}

function handleBarcodeScanned(eanCode) {
    stopBarcodeScanner();
    searchInput.value = eanCode;
    // Trigger lookup
    lookupArticle(eanCode);
}

// Utility Functions
function showError(message) {
    console.error('Error:', message);
    const fullMessage = message + '\n\nIf this persists, check:\n1. Backend server is running\n2. API URL is correct (' + API_BASE_URL + ')\n3. CORS is enabled on server';
    alert('Error: ' + fullMessage);
}

function showSuccess(message) {
    console.log('Success:', message);
    // Simple success notification - you could replace with a toast
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Log API URL for debugging
console.log('API Base URL:', API_BASE_URL);
