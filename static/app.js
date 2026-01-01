const API_BASE_URL = 'http://localhost:5000/api';

let currentEditingEan = null;
let scannerActive = false;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const scanBtn = document.getElementById('scanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const cameraContainer = document.getElementById('cameraContainer');
const video = document.getElementById('video');
const articlesList = document.getElementById('articlesList');
const addArticleBtn = document.getElementById('addArticleBtn');
const articleModal = document.getElementById('articleModal');
const articleForm = document.getElementById('articleForm');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const modalTitle = document.getElementById('modalTitle');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    setupEventListeners();
});

function setupEventListeners() {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    scanBtn.addEventListener('click', toggleBarcodeScanner);
    stopScanBtn.addEventListener('click', stopBarcodeScanner);
    addArticleBtn.addEventListener('click', () => openModal());
    closeModal.addEventListener('click', closeModalHandler);
    cancelBtn.addEventListener('click', closeModalHandler);
    articleForm.addEventListener('submit', handleFormSubmit);
    
    // Close modal on outside click
    articleModal.addEventListener('click', (e) => {
        if (e.target === articleModal) {
            closeModalHandler();
        }
    });
}

// API Functions
async function fetchArticles(search = '') {
    try {
        const url = search 
            ? `${API_BASE_URL}/articles?search=${encodeURIComponent(search)}`
            : `${API_BASE_URL}/articles`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch articles');
        return await response.json();
    } catch (error) {
        console.error('Error fetching articles:', error);
        showError('Failed to load articles');
        return [];
    }
}

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
            const error = await response.json();
            throw new Error(error.error || 'Failed to create article');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error creating article:', error);
        throw error;
    }
}

async function updateArticle(eanCode, articleData) {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${eanCode}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(articleData),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update article');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating article:', error);
        throw error;
    }
}

async function deleteArticle(eanCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${eanCode}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete article');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error deleting article:', error);
        throw error;
    }
}

// UI Functions
async function loadArticles(search = '') {
    const articles = await fetchArticles(search);
    displayArticles(articles);
}

function displayArticles(articles) {
    if (articles.length === 0) {
        articlesList.innerHTML = `
            <div class="empty-state">
                <h3>No articles found</h3>
                <p>Add your first article to get started!</p>
            </div>
        `;
        return;
    }

    articlesList.innerHTML = articles.map(article => `
        <div class="article-card">
            <div class="article-header">
                <div>
                    <div class="article-title">${escapeHtml(article.name)}</div>
                    <div class="article-ean">EAN: ${escapeHtml(article.ean_code)}</div>
                </div>
            </div>
            ${article.description ? `<div class="article-description">${escapeHtml(article.description)}</div>` : ''}
            <div class="article-details">
                <div class="detail-item">
                    <span class="detail-label">Quantity</span>
                    <span class="detail-value">${article.quantity || 0}</span>
                </div>
                ${article.price ? `
                <div class="detail-item">
                    <span class="detail-label">Price</span>
                    <span class="detail-value">$${parseFloat(article.price).toFixed(2)}</span>
                </div>
                ` : ''}
            </div>
            <div class="article-actions">
                <button class="btn btn-edit" onclick="editArticle('${article.ean_code}')">Edit</button>
                <button class="btn btn-danger" onclick="confirmDelete('${article.ean_code}', '${escapeHtml(article.name)}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function openModal(eanCode = null) {
    currentEditingEan = eanCode;
    modalTitle.textContent = eanCode ? 'Edit Article' : 'Add New Article';
    articleForm.reset();
    
    if (eanCode) {
        // Load article data for editing
        fetch(`${API_BASE_URL}/articles/${eanCode}`)
            .then(res => res.json())
            .then(article => {
                document.getElementById('eanCode').value = article.ean_code;
                document.getElementById('articleName').value = article.name;
                document.getElementById('description').value = article.description || '';
                document.getElementById('quantity').value = article.quantity || 0;
                document.getElementById('price').value = article.price || '';
                document.getElementById('eanCode').disabled = true; // EAN cannot be changed
            })
            .catch(error => {
                console.error('Error loading article:', error);
                showError('Failed to load article data');
            });
    } else {
        document.getElementById('eanCode').disabled = false;
    }
    
    articleModal.classList.remove('hidden');
}

function closeModalHandler() {
    articleModal.classList.add('hidden');
    currentEditingEan = null;
    articleForm.reset();
    document.getElementById('eanCode').disabled = false;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        ean_code: document.getElementById('eanCode').value.trim(),
        name: document.getElementById('articleName').value.trim(),
        description: document.getElementById('description').value.trim(),
        quantity: parseInt(document.getElementById('quantity').value) || 0,
        price: document.getElementById('price').value ? parseFloat(document.getElementById('price').value) : null,
    };
    
    if (!formData.ean_code || !formData.name) {
        showError('EAN code and name are required');
        return;
    }
    
    try {
        if (currentEditingEan) {
            // Remove ean_code from update data
            const { ean_code, ...updateData } = formData;
            await updateArticle(currentEditingEan, updateData);
            showSuccess('Article updated successfully');
        } else {
            await createArticle(formData);
            showSuccess('Article created successfully');
        }
        
        closeModalHandler();
        loadArticles(searchInput.value);
    } catch (error) {
        showError(error.message || 'Failed to save article');
    }
}

function editArticle(eanCode) {
    openModal(eanCode);
}

function confirmDelete(eanCode, name) {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
        deleteArticle(eanCode)
            .then(() => {
                showSuccess('Article deleted successfully');
                loadArticles(searchInput.value);
            })
            .catch(error => {
                showError(error.message || 'Failed to delete article');
            });
    }
}

function handleSearch() {
    const searchTerm = searchInput.value.trim();
    loadArticles(searchTerm);
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
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Camera access not available on this device');
        return;
    }
    
    scannerActive = true;
    cameraContainer.classList.remove('hidden');
    scanBtn.textContent = '📷 Scanning...';
    scanBtn.disabled = true;
    
    // Use QuaggaJS for barcode scanning
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
        }
    }, (err) => {
        if (err) {
            console.error('Quagga initialization error:', err);
            showError('Failed to initialize barcode scanner');
            stopBarcodeScanner();
            return;
        }
        
        Quagga.start();
        
        // Listen for barcode detection
        Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            if (code) {
                handleBarcodeScanned(code);
            }
        });
    });
}

function stopBarcodeScanner() {
    scannerActive = false;
    cameraContainer.classList.add('hidden');
    scanBtn.textContent = '📷 Scan';
    scanBtn.disabled = false;
    
    if (Quagga) {
        Quagga.stop();
    }
    
    // Stop video stream
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
}

function handleBarcodeScanned(eanCode) {
    stopBarcodeScanner();
    searchInput.value = eanCode;
    
    // Search for the article
    loadArticles(eanCode);
    
    // If article exists, show it; otherwise, offer to create it
    fetch(`${API_BASE_URL}/articles/${eanCode}`)
        .then(res => {
            if (res.ok) {
                return res.json();
            } else {
                // Article doesn't exist, offer to create
                if (confirm(`Article with EAN ${eanCode} not found. Would you like to create it?`)) {
                    document.getElementById('eanCode').value = eanCode;
                    openModal();
                }
                return null;
            }
        })
        .catch(error => {
            console.error('Error checking article:', error);
        });
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    // You could replace this with a toast notification
    console.log('Success:', message);
}

// Make functions available globally for onclick handlers
window.editArticle = editArticle;
window.confirmDelete = confirmDelete;

