class shortListUI{
    constructor(){
        console.log('Initializing shortListUI');
        this.controller = new shortListController();
        this.userId = localStorage.getItem('currentUserId');
        this.userRole = localStorage.getItem('userRole') || 'home_owner';
        this.shortlistCache = new Map(); // Cache moved here from controller

        // Only proceed if we have a user ID and they're a home owner
        if (this.userId && this.userRole === 'home_owner') {
            // Pre-load user's shortlist to populate cache for faster button rendering
            this.preloadUserShortlist().then(() => {
                this.initDomElements();
                this.setupEventListeners();
                this.addShortlistButtonsToCards();
            });
        } else {
            console.log('User is not a home_owner or not logged in, skipping shortlist initialization');
        }
    }

    // Preload all user's shortlisted items to improve performance
    async preloadUserShortlist() {
        if (!this.userId) return;

        console.log('Preloading shortlist data for user:', this.userId);
        try {
            const result = await this.controller.getUserShortlist(this.userId);
            if (result.success) {
                // Populate cache with shortlisted items
                result.data.forEach(item => {
                    const listingId = item.listing_id;
                    this.shortlistCache.set(`${this.userId}-${listingId}`, true);
                });
                console.log(`Preloaded ${result.data.length} shortlisted items`);
            } else {
                console.error('Failed to preload shortlist:', result.error);
            }
        } catch (error) {
            console.error('Error preloading shortlist:', error);
        }
    }

    initDomElements() {
        // Find all service cards on the page
        this.serviceCards = document.querySelectorAll('.service-card');
        console.log(`Found ${this.serviceCards.length} service cards`);
    }

    setupEventListeners() {
        // Set up event delegation for shortlist button clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('shortlist-btn')) {
                const listingId = event.target.dataset.id;
                console.log('Shortlist button clicked for ID:', listingId);
                this.handleShortlistButtonClick(listingId, event.target);
            }
        });
        console.log('Event listeners set up');
    }

    // Improved method to add shortlist buttons to cards with better status checking
    async addShortlistButtonsToCards() {
        // Skip if user is not a home_owner or not logged in
        if (this.userRole !== 'home_owner' || !this.userId) {
            return;
        }

        console.log(`Adding shortlist buttons to ${this.serviceCards.length} cards`);

        // Process each card
        for (let index = 0; index < this.serviceCards.length; index++) {
            const card = this.serviceCards[index];

            // Find the card-buttons div
            const cardButtons = card.querySelector('.card-buttons');
            if (!cardButtons) continue;

            // Find the listing ID from the view details button
            const viewDetailsBtn = cardButtons.querySelector('.view-details-btn');
            if (!viewDetailsBtn) continue;

            const listingId = viewDetailsBtn.dataset.id;
            if (!listingId) continue;

            // Check if shortlist button already exists
            if (cardButtons.querySelector('.shortlist-btn')) {
                // Update existing button instead of creating a new one
                await this.updateExistingShortlistButton(cardButtons.querySelector('.shortlist-btn'), listingId);
                continue;
            }

            // Create shortlist button
            const shortlistBtn = document.createElement('button');
            shortlistBtn.className = 'btn card-btn shortlist-btn';
            shortlistBtn.dataset.id = listingId;
            shortlistBtn.style.marginLeft = '5px';

            // Initially set to loading state
            shortlistBtn.innerHTML = '⏳';
            shortlistBtn.disabled = true;

            // Ensure consistent styling for the buttons container
            cardButtons.style.display = 'flex';
            cardButtons.style.flexDirection = 'row';
            cardButtons.style.justifyContent = 'flex-end';
            cardButtons.style.gap = '5px';

            // Add button to card before checking status
            cardButtons.insertBefore(shortlistBtn, viewDetailsBtn);

            // Check shortlist status and update button
            await this.updateExistingShortlistButton(shortlistBtn, listingId);
        }
    }

    // Update an existing shortlist button based on current status
    async updateExistingShortlistButton(button, listingId) {
        try {
            if (!this.userId) return;

            // Check cache first
            const cacheKey = `${this.userId}-${listingId}`;
            if (this.shortlistCache.has(cacheKey)) {
                console.log('Using cached shortlist status for:', cacheKey);
                button.disabled = false;
                if (this.shortlistCache.get(cacheKey)) {
                    button.innerHTML = '❤️ Shortlisted';
                    button.classList.add('shortlisted');
                } else {
                    button.innerHTML = '🤍 Shortlist';
                    button.classList.remove('shortlisted');
                }
                return;
            }

            // If not in cache, check server
            const checkResult = await this.controller.checkShortlistStatus(this.userId, listingId);
            console.log(`Shortlist check for listing ${listingId}:`, checkResult);

            // Enable the button
            button.disabled = false;

            if (checkResult.success && checkResult.isShortlisted) {
                // Item is already shortlisted
                button.innerHTML = '❤️ Shortlisted';
                button.classList.add('shortlisted');
                this.shortlistCache.set(cacheKey, true);
            } else {
                // Item is not shortlisted
                button.innerHTML = '🤍 Shortlist';
                button.classList.remove('shortlisted');
                this.shortlistCache.set(cacheKey, false);
            }
        } catch (error) {
            console.error(`Error checking shortlist status for listing ${listingId}:`, error);
            // Default state on error
            button.innerHTML = '🤍 Shortlist';
            button.disabled = false;
        }
    }

    // Handle shortlist button click with improved error handling
    async handleShortlistButtonClick(listingId, buttonElement) {
        try {
            console.log('Handling shortlist button click for ID:', listingId);

            // Validate user is logged in
            if (!this.userId) {
                this.showToast('Please log in to shortlist items', 'error');
                return;
            }

            // Validate inputs
            if (!listingId) {
                this.showToast('Missing listing ID', 'error');
                return;
            }

            // Check if already shortlisted (from button state)
            const isAlreadyShortlisted = buttonElement.classList.contains('shortlisted');
            if (isAlreadyShortlisted) {
                this.showToast('Already in your shortlist!', 'info');
                return;
            }

            // Show loading state
            buttonElement.innerHTML = '⏳ Adding...';
            buttonElement.disabled = true;

            // Call controller
            const result = await this.controller.addToShortlist(this.userId, listingId);
            console.log('Controller returned result:', result);

            // Update button based on result
            if (result.success) {
                buttonElement.innerHTML = '❤️ Shortlisted';
                buttonElement.classList.add('shortlisted');
                this.shortlistCache.set(`${this.userId}-${listingId}`, true); // Update cache
                this.showToast('Added to your shortlist!', 'success');
            } else {
                // Check if it failed because it's already shortlisted
                if (result.error && result.error.includes('already in your shortlist')) {
                    buttonElement.innerHTML = '❤️ Shortlisted';
                    buttonElement.classList.add('shortlisted');
                    this.shortlistCache.set(`${this.userId}-${listingId}`, true); // Update cache
                    this.showToast('Already in your shortlist!', 'info');
                } else {
                    buttonElement.innerHTML = '🤍 Shortlist';
                    buttonElement.classList.remove('shortlisted');
                    this.shortlistCache.set(`${this.userId}-${listingId}`, false); // Update cache
                    const errorMsg = result.error || 'Unknown error';
                    this.showToast(errorMsg, 'error');
                }
            }

            // Re-enable button
            buttonElement.disabled = false;

        } catch (error) {
            console.error('Error adding to shortlist:', error);
            buttonElement.innerHTML = '🤍 Shortlist';
            buttonElement.disabled = false;
            this.showToast('Failed to add to shortlist. Please try again later.', 'error');
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        // Check if toast container exists, create if not
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.bottom = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.zIndex = '1000';
            document.body.appendChild(toastContainer);
        }

        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Style toast based on type
        toast.style.padding = '10px 15px';
        toast.style.marginBottom = '10px';
        toast.style.borderRadius = '4px';
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        toast.style.backgroundColor = type === 'success' ? '#4CAF50' :
                                      type === 'error' ? '#F44336' :
                                      type === 'info' ? '#2196F3' :
                                      '#FFC107'; // warning
        toast.style.color = 'white';
        toast.style.transition = 'opacity 0.5s ease-in-out';
        toast.style.opacity = '0';

        // Add to container
        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // Remove after delay
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 500);
        }, 3000);
    }

    // Clear cache method in UI
    clearCache() {
        this.shortlistCache.clear();
        console.log('Shortlist cache cleared');
    }

    // Improved initializer with explicit page load checks
    static {
        console.log('shortListUI static initializer running');
        let isInitialized = false;

        const initializeUI = () => {
            if (isInitialized) return;
            isInitialized = true;

            // Wrapped in setTimeout to ensure DOM is completely ready
            setTimeout(() => {
                console.log('Creating new shortListUI instance');
                new shortListUI();
            }, 0);
        };

        // Handle various page load scenarios
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeUI);
        } else {
            initializeUI();
        }

        // Also initialize when cards are rendered
        window.addEventListener('load', () => {
            console.log('Window load event, ensuring shortListUI is initialized');
            initializeUI();
        });
    }
}

class shortListController{
    constructor(){
        console.log('Initializing shortListController');
        this.entity = new shortList();
    }

    async addToShortlist(userId, listingId) {
        console.log('Controller.addToShortlist called with:', userId, listingId);
        return await this.entity.addServiceToShortlist(userId, listingId);
    }

    async checkShortlistStatus(userId, listingId) {
        console.log('Controller.checkShortlistStatus called with:', userId, listingId);
        return await this.entity.checkShortlistStatus(userId, listingId);
    }

    async getUserShortlist(userId) {
        console.log('Controller.getUserShortlist called for user:', userId);
        return await this.entity.getUserShortlist(userId);
    }
}

class shortList{
    constructor() {
        console.log('Initializing shortList entity');
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    async addServiceToShortlist(userId, listingId){
        try {
            console.log('Entity.addServiceToShortlist called with:', userId, listingId);

            // Input validation
            if (!userId || !listingId) {
                console.error('Missing required data:', { userId, listingId });
                return { success: false, error: 'Missing required user ID or listing ID' };
            }

            // Prepare request body - send the ID exactly as received without parsing
            // This maintains the original format from the data source
            const requestBody = {
                user_id: userId,
                listing_id: listingId
            };

            console.log('Sending request with body:', JSON.stringify(requestBody));

            // Make API request
            const response = await fetch(`${this.apiBaseUrl}/shortlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            // Handle different response status codes
            if (!response.ok) {
                if (response.status === 409) {
                    return { success: false, error: 'This service is already in your shortlist' };
                } else if (response.status === 404) {
                    return { success: false, error: 'Service or user not found' };
                } else if (response.status >= 500) {
                    return { success: false, error: 'Server error. Please try again later.' };
                }
            }

            // Parse the response
            const responseText = await response.text();
            let result;

            try {
                // Only try to parse as JSON if the response has content
                if (responseText.trim()) {
                    result = JSON.parse(responseText);
                    console.log('Parsed response:', result);
                } else {
                    // Empty response with success status is considered successful
                    return response.ok
                        ? { success: true }
                        : { success: false, error: 'Unknown error occurred' };
                }
            } catch (parseError) {
                console.error('Error parsing response as JSON:', parseError);
                // If response.ok is true, consider it a success despite parsing issues
                return response.ok
                    ? { success: true }
                    : { success: false, error: 'Invalid response from server' };
            }

            // Return result based on response
            if (result && result.success) {
                console.log('Successfully added item to shortlist');
                return { success: true, isShortlisted: true }; // Added isShortlisted flag
            } else {
                const errorMessage = result?.message || result?.error || 'Failed to add to shortlist';
                console.error('Failed to add item to shortlist:', errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            console.error('Error adding item to shortlist:', error);
            return { success: false, error: 'Network or server error. Please try again.' };
        }
    }

    // Check if a listing is already shortlisted with improved error handling
    async checkShortlistStatus(userId, listingId) {
        try {
            console.log('Entity.checkShortlistStatus called with:', userId, listingId);

            // Input validation
            if (!userId || !listingId) {
                console.error('Missing required data for shortlist check:', { userId, listingId });
                return { success: false, isShortlisted: false };
            }

            // Make API request to check shortlist status
            const response = await fetch(`${this.apiBaseUrl}/shortlist/check?user_id=${encodeURIComponent(userId)}&listing_id=${encodeURIComponent(listingId)}`);

            console.log('Check shortlist status response:', response.status);

            if (!response.ok) {
                console.error('Error checking shortlist status, status:', response.status);
                return { success: false, isShortlisted: false };
            }

            const result = await response.json();
            console.log('Shortlist check result:', result);

            return {
                success: true,
                isShortlisted: result.isShortlisted || false
            };
        } catch (error) {
            console.error('Error checking shortlist status:', error);
            return { success: false, isShortlisted: false };
        }
    }

    // Get all shortlisted listings for a user
    async getUserShortlist(userId) {
        try {
            console.log('Entity.getUserShortlist called for user:', userId);

            if (!userId) {
                return { success: false, error: 'Missing user ID' };
            }

            const response = await fetch(`${this.apiBaseUrl}/shortlist/${encodeURIComponent(userId)}`);

            if (!response.ok) {
                return { success: false, error: `Error fetching shortlist: ${response.status}` };
            }

            const result = await response.json();

            return {
                success: true,
                data: result.data || []
            };
        } catch (error) {
            console.error('Error fetching user shortlist:', error);
            return { success: false, error: 'Network or server error' };
        }
    }
}