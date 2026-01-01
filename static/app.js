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
document.addEventListener('DOMContentLoaded', async () => {
    await loadLanguage();
    applyLanguage();
    checkApiConnection();
    setupEventListeners();
    // Focus on search input
    searchInput.focus();
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
    // Update HTML elements
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
    
    // Update welcome message
    const welcomeMsg = document.querySelector('.welcome-message p');
    if (welcomeMsg) welcomeMsg.textContent = lang.welcomeMessage;
    
    // Update article display labels
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
    
    // Update add form
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
    
    // Update edit form
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
    
    // Export and logout
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
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
        showError(lang.pleaseEnterEan);
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
            showError(lang.failedToLookupArticle + ': ' + error.message);
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
    articleEanDisplay.textContent = `${lang.ean}: ${article.ean_code}`;
    
    if (article.description) {
        articleDescriptionDisplay.textContent = article.description;
        articleDescriptionDisplay.style.display = 'block';
    } else {
        articleDescriptionDisplay.style.display = 'none';
    }
    
    articleQuantityDisplay.textContent = article.quantity || 0;
    
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
    const eanLabel = document.querySelector('#addArticleForm .form-subtitle');
    if (eanLabel) {
        eanLabel.innerHTML = `${lang.eanCode}: <strong>${eanCode}</strong>`;
    }
    
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
        showError(lang.quantityCannotBeNegative);
        return;
    }
    
    try {
        await updateArticle(currentArticle.ean_code, { quantity: newQuantity });
        currentArticle.quantity = newQuantity;
        displayArticle(currentArticle); // Refresh display
        showSuccess(`${lang.quantityUpdatedTo} ${newQuantity}`);
    } catch (error) {
        showError(lang.failedToUpdateQuantity + ': ' + error.message);
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
        // Look up the newly created article to display it
        await lookupArticle(articleData.ean_code);
    } catch (error) {
        showError(error.message || lang.failedToCreateArticle);
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
        // Refresh article display
        await lookupArticle(currentArticle.ean_code);
    } catch (error) {
        showError(error.message || lang.failedToUpdateArticle);
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
        showError(lang.barcodeScannerNotLoaded);
        return;
    }
    
    scannerActive = true;
    cameraContainer.classList.remove('hidden');
    scanBtn.innerHTML = `<i class="fa-solid fa-barcode"></i> ${lang.scanning}`;
    scanBtn.disabled = true;
    
    // Hide any previous error messages
    const cameraError = document.getElementById('cameraError');
    if (cameraError) {
        cameraError.classList.add('hidden');
    }
    
    // Clear video element
    video.srcObject = null;
    video.src = '';
    
    // Use QuaggaJS for barcode scanning
    // Simplified constraints for better compatibility, especially with iOS
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: video,
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment" // Use back camera on mobile
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
            ]
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 0, // Disable workers for better compatibility
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
        
        // Ensure video is visible
        video.style.display = 'block';
        
        // Clear any previous error messages
        const cameraError = document.getElementById('cameraError');
        if (cameraError) {
            cameraError.classList.add('hidden');
        }
        
        // Track if video successfully loaded
        let videoLoaded = false;
        let errorTimeout = null;
        
        // Set up error handler with delay to avoid false positives
        const errorHandler = (e) => {
            console.error('Video error:', e);
            // Only show error if video hasn't loaded after a delay
            errorTimeout = setTimeout(() => {
                if (!videoLoaded && cameraError) {
                    cameraError.textContent = lang.errorLoadingVideoStream;
                    cameraError.classList.remove('hidden');
                }
            }, 2000); // Wait 2 seconds before showing error
        };
        
        // Remove any existing error listeners and add new one
        video.removeEventListener('error', errorHandler);
        video.addEventListener('error', errorHandler, { once: true });
        
        // Track successful video load
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
        
        // Workaround for iOS and some browsers: Manually get and attach video stream
        // QuaggaJS sometimes doesn't properly attach the stream to the video element
        setTimeout(() => {
            // Always try to manually attach stream for better iOS compatibility
            console.log('Manually attaching video stream for better compatibility...');
            navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: "environment"
                }
            }).then(stream => {
                video.srcObject = stream;
                return video.play();
            }).then(() => {
                console.log('Video stream attached and playing successfully');
                videoLoaded = true;
                if (errorTimeout) {
                    clearTimeout(errorTimeout);
                }
                if (cameraError) {
                    cameraError.classList.add('hidden');
                }
            }).catch(e => {
                console.error('Error manually attaching video stream:', e);
                // Only show error if Quagga also fails (check after delay)
            });
        }, 300);
        
        Quagga.start();
        
        // Listen for barcode detection
        Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            if (code && code.length > 0) {
                console.log('Barcode detected:', code);
                // Only process if we have a valid code (not empty or random)
                // EAN codes are typically 8-13 digits
                if (code.length >= 8 && code.length <= 13) {
                    handleBarcodeScanned(code);
                }
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
    scanBtn.innerHTML = `<i class="fa-solid fa-barcode"></i> ${lang.scan}`;
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

// Export to CSV
async function exportToCSV() {
    try {
        const response = await fetch(`${API_BASE_URL}/export/csv`, {
            method: 'GET',
            credentials: 'include' // Include cookies for session
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Not authenticated, redirect to login
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to export CSV');
        }
        
        // Get the blob and create download link
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
        console.error('Error exporting CSV:', error);
        showError(lang.failedToExportCsv + ': ' + error.message);
    }
}

// Logout
async function handleLogout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            // Even if request fails, redirect to login
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error logging out:', error);
        // Redirect to login anyway
        window.location.href = '/login';
    }
}

// Log API URL for debugging
console.log('API Base URL:', API_BASE_URL);
