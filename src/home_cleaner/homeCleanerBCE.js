
//create service boundary
class createServiceUI {
    constructor() {
        this.initDomElements();
        this.setupEventListeners();
        this.controller = new createServiceController();
    }

    initDomElements() {
        this.addServiceBtn = document.getElementById('add-service-btn');
        this.serviceForm = document.getElementById('service-form');
    }

    setupEventListeners() {
        // Add service button
        if (this.addServiceBtn) {
            this.addServiceBtn.addEventListener('click', () => this.openAddServiceForm());
        }
        if (this.serviceForm) {
            this.serviceForm.addEventListener('submit', (event) => this.handleFormSubmit(event));
        }
    }

    //function to display createServiceForm
    async openAddServiceForm() {
        // Set form title for adding
        document.getElementById('modal-title').textContent = 'Add New Service';
        // Show the form
        document.getElementById('service-modal').style.display = 'block';
    }

    //function to close the form
    closeForm() {
        document.getElementById('service-modal').style.display = 'none';
    }

    handleFormSubmit(event) {
        event.preventDefault();

        const serviceId = document.getElementById('service-id').value;

        // Collect data from service form
        const serviceData = {
            listing_id: serviceId || null,
            title: document.getElementById('service-title').value.trim(),
            category: document.getElementById('service-category').value,
            price: parseFloat(document.getElementById('service-price').value),
            description: document.getElementById('service-description').value.trim(),
            imageUrl: document.getElementById('service-image').value.trim() || 'https://placehold.co/600x400?text=Cleaning+Service',
            providerId: this.currentUserId,
            providerName: this.currentUsername,
            createdAt: new Date().toISOString()
        };
        if (serviceId) {
        console.log('Updating existing service with ID:', serviceId);
        // If service ID exists, we're updating
        this.controller.updateServiceController(serviceData)
            .then(result => {
                if (result && result.success) {
                    console.log('Service updated successfully');
                    // Reload the page after successful update
                    window.location.reload();
                } else {
                    console.error('Failed to update service:', result?.error);
                    this.displayUpdateFailed();
                }
            });
    }

        // Pass data to controller, if succeeds, reload the window
        this.controller.createCleaningServiceController(serviceData)
            .then(result => {
                if (result && result.success) {
                    // Simply reload the page after successful creation
                    window.location.reload();
                }
            });
        // Close the modal
        this.closeForm();
    }

    // Checks if a document is ready, then initialize
    static {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new createServiceUI());
        } else {
            // DOM is already loaded
            new createServiceUI();
        }
    }
}
// controller to create service listing
class createServiceController {
    constructor() {
        this.entity = new service();
    }

    async createCleaningServiceController(serviceData){


        // if (!this.validateServiceData(apiData)) {
        //     return { success: false, error: "Invalid service data" };
        // }
        // Pass prepared data to entity layer
        return this.entity.createCleaningService(serviceData);
    }

    // Business logic: Validate service data
    // validateServiceData(data) {
    //     // Check required fields
    //     if (!data.title || !data.price || !data.category) {
    //         return false;
    //     }
    //
    //     // Price must be a positive number
    //     if (isNaN(data.price) || data.price <= 0) {
    //         return false;
    //     }
    //
    //     return true;
    // }
}






//Boundary for viewing service listings
class readServicePage{
    constructor(){
        this.controller = new readServiceController();
        this.servicesContainer = document.getElementById('services-container');
        this.filterChips = document.querySelectorAll('.filter-chip');
        this.setupFilterListeners();
        this.displayServices();
    }

    //UI to filter based on category
    setupFilterListeners() {
        if (!this.filterChips?.length) return;

        this.filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this.filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                // Call displayServices with the filter value
                const filter = chip.getAttribute('data-filter');
                this.displayServices(filter);
            });
        });
    }

    //displays all the services regardless of user
    async displayServices(filter = 'all') {
        if (!this.servicesContainer) return;

        try {
            // Pass the filter to the controller
            const result = await this.controller.readCleaningServiceController(filter);

            // Handle the case for when there are no services in the database
            if (!result.success || !result.data?.length) {
                this.servicesContainer.innerHTML = '<p>No services found. Be the first to add a service!</p>';
                return;
            }

            // Use the shared rendering method
            this.renderServiceCards(result.data);
        } catch (error) {
            console.error('Error loading services:', error);
            this.servicesContainer.innerHTML = '<p>Failed to load services. Please try again later.</p>';
        }
    }

    //displays only the user's listings
    async displayUserListings() {
        if (!this.servicesContainer) return;

        try {
            // Get current user ID
            const currentUserId = localStorage.getItem('currentUserId');
            if (!currentUserId) {
                this.servicesContainer.innerHTML = '<p>Please log in to view your listings.</p>';
                return;
            }

            // Get all services and filter by user
            const result = await this.controller.getUserListingsController();

            // Handle the case for when there are no user services
            if (!result.success || !result.data?.length) {
                this.servicesContainer.innerHTML = '<p>You have no services listed. Add your first service!</p>';
                return;
            }

            // Render services with management controls
            this.renderServiceCards(result.data, true);
        } catch (error) {
            console.error('Error loading user services:', error);
            this.servicesContainer.innerHTML = '<p>Failed to load your services. Please try again later.</p>';
        }
    }


    renderServiceCards(services, showManagementControls = false) {
        this.servicesContainer.innerHTML = '';
        const template = document.getElementById('service-card-template');

        services.forEach(service => {
            // Process service data
            const processedService = this.controller.prepareServiceForDisplay(service);

            // Create card
            const card = template.content.cloneNode(true).querySelector('.service-card');

            // Set data and content
            card.setAttribute('data-filter', processedService.filterCategory);
            card.querySelector('.service-image').src = processedService.imageUrl;
            card.querySelector('.service-image').alt = processedService.title;
            card.querySelector('.service-title').textContent = processedService.title;
            card.querySelector('.service-price').textContent = processedService.formattedPrice;
            card.querySelector('.service-description').textContent = processedService.description;
            card.querySelector('.tag').textContent = processedService.category;

            // Handle card buttons based on what page we're on
            const cardButtons = card.querySelector('.card-buttons');
            if (showManagementControls) {
                // For cleaner listings page, show edit and delete buttons
                cardButtons.innerHTML = `
                <button class="btn card-btn edit-service-btn" data-id="${processedService.id}">Edit</button>
                <button class="btn card-btn btn-secondary delete-service-btn" data-id="${processedService.id}">Delete</button>
            `;
            } else {
                // For regular listings page, show view details
                cardButtons.querySelector('.view-details-btn').setAttribute('data-id', processedService.id);
            }

            const providerElement = card.querySelector('.provider-name');
            if (providerElement) {
                providerElement.textContent = 'by ' + processedService.providerName;
            }

            this.servicesContainer.appendChild(card);
        });
        setTimeout(() => {
    console.log('Cards rendered, checking if shortlist should be initialized');

    // Skip shortlist initialization if we're in the middle of a search
    if (window.preventShortlistInit) {
        console.log('Skipping shortlist initialization due to active search');
        return;
    }

    // Only initialize if not already initialized
    if (typeof shortListUI !== 'undefined') {
        console.log('Creating new shortListUI instance');
        new shortListUI();
    } else {
        console.log('shortListUI not found');
    }
    }, 100);
    }

    //initialize the reading of services
    static {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new readServicePage());
        } else {
            // DOM is already loaded
            new readServicePage();
        }
    }
}

class readServiceController {
    constructor() {
        this.entity = new service();
    }

    // Pass the filter to the entity layer and apply business logic for filtering
    async readCleaningServiceController(filter = 'all') {
        const result = await this.entity.readCleaningService();

        if (!result.success) {
            return result;
        }

        // Apply filtering business logic in the controller
        if (filter !== 'all') {
            // Filter the data based on category
            const filteredData = result.data.filter(service => {
                const category = (service.category_name || service.category || '').toLowerCase();

                // Map category to filter value
                const categoryMatches = {
                    'home': category.includes('home'),
                    'office': category.includes('office'),
                    'carpet': category.includes('carpet'),
                    'windows': category.includes('window'),
                    'deep': category.includes('deep')
                };

                return categoryMatches[filter] || false;
            });

            return { success: true, data: filteredData };
        }

        // Return unfiltered data
        return result;
    }

    // Get services for a specific user
    async getUserListingsController() {
        const currentUserId = localStorage.getItem('currentUserId');
        if (!currentUserId) {
            return { success: false, error: 'No user is logged in' };
        }

        // Get all services from entity
        const result = await this.entity.readCleaningService();

        if (result.success) {
            // Business logic: Filter to only include user's listings
            const userListings = result.data.filter(listing =>
                listing.user_id === currentUserId
            );

            return { success: true, data: userListings };
        } else {
            return { success: false, error: result.error };
        }
    }

    async getServiceByIdController(serviceId) {
    if (!serviceId) {
        console.error('Missing service ID for lookup');
        return { success: false, error: 'No service ID provided' };
    }

    console.log('Looking for service with ID:', serviceId);

    try {
        // First try to get the service directly from the API endpoint for a single service
        const response = await fetch(`${this.entity.apiBaseUrl}/listings/${serviceId}`);

        // Check if the direct fetch was successful
        if (response.ok) {
            const result = await response.json();

            if (result.success && result.data) {
                console.log('Service found via direct API call:', result.data);
                return { success: true, data: result.data };
            }
        }

        // If direct fetch fails, fall back to getting all services and filtering
        console.log('Direct fetch failed, falling back to filtering all services');
        const result = await this.entity.readCleaningService();

        if (result.success) {
            console.log('Total services loaded:', result.data.length);

            // Find the service with the matching ID (check various ID formats)
            const service = result.data.find(s => {
                return (
                    (s.listing_id && s.listing_id.toString() === serviceId.toString()) ||
                    (s.id && s.id.toString() === serviceId.toString()) ||
                    (s._id && s._id.toString() === serviceId.toString())
                );
            });

            if (service) {
                console.log('Service found in all services:', service);
                return { success: true, data: service };
            } else {
                console.error('No service found with ID:', serviceId);
                return { success: false, error: 'Service not found' };
            }
        } else {
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error fetching service by ID:', error);
        return { success: false, error: error.message };
    }
}

    // Map category to filter value
    getCategoryFilter(category) {
        if (!category) return 'all';

        category = category.toLowerCase();
        const filterMap = {
            'home': 'home',
            'office': 'office',
            'carpet': 'carpet',
            'window': 'windows',
            'deep': 'deep'
        };

        for (const [key, value] of Object.entries(filterMap)) {
            if (category.includes(key)) return value;
        }

        return 'all';
    }

    // Formats prices as Singapore dollars (S$) with exactly two decimal places
    formatPrice(price) {
        const priceNum = typeof price === 'string' ? parseFloat(price) : price;
        return !isNaN(priceNum) ? `S$${priceNum.toFixed(2)}` : 'Price not available';
    }

    // Check if user is the owner of the service listing
    isServiceOwner(serviceUserId) {
        const currentUserId = localStorage.getItem('currentUserId');
        return serviceUserId === currentUserId;
    }

    // Get default image if none provided
    getDefaultImage() {
        return 'https://placehold.co/600x400?text=Cleaning+Service';
    }

    // Get provider name - use first priority field or fallback to alternatives
    getProviderName(service) {
        // First try the joined provider_name field
        if (service.provider_name) {
            return service.provider_name;
        }

        // Next try to create it from first_name and last_name if available
        if (service.first_name && service.last_name) {
            return `${service.first_name} ${service.last_name}`;
        }

        // Fallback to user_id if no name is available
        if (service.user_id) {
            return `Provider ${service.user_id}`;
        }

        // Last resort
        return 'Unknown Provider';
    }

    // Prepare raw service data into a standardized format for display
    prepareServiceForDisplay(service) {
        return {
            id: service.listing_id || '0',
            title: service.title || 'Unnamed Service',
            description: service.description || 'No description available',
            formattedPrice: this.formatPrice(service.price),
            imageUrl: service.image_path || this.getDefaultImage(),
            category: service.category_name || service.category || 'Uncategorized',
            providerName: this.getProviderName(service),
            filterCategory: this.getCategoryFilter(service.category_name || service.category),
            isOwner: this.isServiceOwner(service.user_id)
        };
    }
}





//Boundary for the updating and deletion of user listingso
class serviceManagementUI {
    constructor() {
        this.controller = new serviceManagementController();

        // Check if we're on the user listings page
        const isUserListingsPage = window.location.pathname.includes('cleanerListings.html');

        // Initialize DOM elements and event listeners
        this.initDomElements();
        this.setupManagementEventListeners();

        // Initialize user listings if on the right page
        if (isUserListingsPage) {
            this.servicePage = new readServicePage();
            setTimeout(() => {
                this.displayUserServices();
            }, 0);
        }
    }

    // SECTION: Initialization Methods

    initDomElements() {
        this.addServiceBtn = document.getElementById('add-service-btn');
        this.serviceForm = document.getElementById('service-form');
        this.deleteModal = document.getElementById('delete-confirm-modal');
        this.closeDeleteModalBtn = document.getElementById('close-delete-modal');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-button');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-button');

        // Set up form submission handler if form exists
        if (this.serviceForm) {
            this.serviceForm.addEventListener('submit', (event) => this.handleFormSubmit(event));
        }
    }

    setupManagementEventListeners() {
        document.addEventListener('click', event => {
            // Handle edit button clicks
            if (event.target.classList.contains('edit-service-btn')) {
                const serviceId = event.target.getAttribute('data-id');
                this.openEditForm(serviceId);
            }

            // Handle delete button clicks
            if (event.target.classList.contains('delete-service-btn')) {
                const serviceId = event.target.getAttribute('data-id');
                this.openDeleteConfirmation(serviceId);
            }
        });
    }

    displayUserServices() {
        // Ensures we don't call this on pages other than the user listings page
        const servicePage = this.servicePage || new readServicePage();
        servicePage.displayUserListings();
    }

    // SECTION: Form Handling Methods

    async openEditForm(serviceId) {
        try {
            console.log('Opening edit form for service ID:', serviceId);

            // Get the service data from the controller
            const controller = new readServiceController();
            const result = await controller.getServiceByIdController(serviceId);

            if (!result.success) {
                console.error('Failed to load service data:', result.error);
                return;
            }

            const service = result.data;

            // Set form title for editing
            document.getElementById('modal-title').textContent = 'Edit Service';

            // Find the right ID to use
            const idToUse = service.listing_id || service.id || service._id;

            // Populate form fields
            document.getElementById('service-id').value = idToUse;
            document.getElementById('service-title').value = service.title || '';
            document.getElementById('service-category').value = service.category_name || service.category || '';
            document.getElementById('service-price').value = service.price || '';
            document.getElementById('service-description').value = service.description || '';
            document.getElementById('service-image').value = service.image_path || '';

            // Show the form
            document.getElementById('service-modal').style.display = 'block';
        } catch (error) {
            console.error('Error opening edit form:', error);
        }
    }

    handleFormSubmit(event) {
        event.preventDefault();

        // Get the service ID to determine if we're creating or updating
        const serviceId = document.getElementById('service-id').value;

        // Collect data from service form
        const serviceData = {
            listing_id: serviceId || null,
            title: document.getElementById('service-title').value.trim(),
            category: document.getElementById('service-category').value,
            price: parseFloat(document.getElementById('service-price').value),
            description: document.getElementById('service-description').value.trim(),
            imageUrl: document.getElementById('service-image').value.trim() || 'https://placehold.co/600x400?text=Cleaning+Service',
            providerId: localStorage.getItem('currentUserId'),
            providerName: localStorage.getItem('currentUsername'),
            createdAt: new Date().toISOString()
        };

        if (serviceId) {
            console.log('Updating existing service with ID:', serviceId);
            // If service ID exists, we're updating
            this.controller.updateServiceController(serviceData)
                .then(result => {
                    if (result && result.success) {
                        console.log('Service updated successfully');
                        // Reload the page after successful update
                        window.location.reload();
                    } else {
                        console.error('Failed to update service:', result?.error);
                        this.displayUpdateFailed();
                    }
                });
        }

        // Close the modal
        this.closeForm();
    }

    closeForm() {
        document.getElementById('service-modal').style.display = 'none';
    }

    // SECTION: Delete Handling Methods

    openDeleteConfirmation(serviceId) {
        console.log('Opening delete confirmation for service ID:', serviceId);

        // First check if the delete confirmation modal exists
        const deleteModal = document.getElementById('delete-confirm-modal');
        if (!deleteModal) {
            console.error('Delete confirmation modal not found in DOM');
            alert('Error: Could not open delete confirmation. Please try again.');
            return;
        }

        // Set service ID to delete
        const deleteServiceIdInput = document.getElementById('delete-service-id');
        if (deleteServiceIdInput) {
            deleteServiceIdInput.value = serviceId;
        } else {
            console.error('Hidden input for service ID not found in DOM');
            // Create the hidden input if it doesn't exist
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'delete-service-id';
            hiddenInput.value = serviceId;
            deleteModal.querySelector('.modal-content').appendChild(hiddenInput);
        }

        // Show the delete confirmation modal
        deleteModal.style.display = 'block';

        // Set up the event handlers for the modal buttons
        this.setupDeleteModalButtons();
    }

    setupDeleteModalButtons() {
        const closeBtn = document.getElementById('close-delete-modal');
        const cancelBtn = document.getElementById('cancel-delete-button');
        const confirmBtn = document.getElementById('confirm-delete-button');

        if (closeBtn) {
            closeBtn.onclick = () => this.closeDeleteModal();
        }

        if (cancelBtn) {
            cancelBtn.onclick = () => this.closeDeleteModal();
        }

        if (confirmBtn) {
            confirmBtn.onclick = () => this.handleDeleteConfirm();
        }
    }

    async handleDeleteConfirm() {
        const serviceId = document.getElementById('delete-service-id').value;
        console.log('Confirming deletion of service ID:', serviceId);

        if (!serviceId) {
            console.error('Missing service ID for deletion');
            this.displayDeleteFailed();
            return;
        }

        try {
            // Call the controller to delete the service
            const success = await this.controller.deleteServiceController(serviceId);

            // Close the modal
            this.closeDeleteModal();

            if (success) {
                console.log('Service deleted successfully');
                this.displayDeleteSuccess();
                // Reload the page or refresh the listings
                setTimeout(() => {
                    window.location.reload();
                }, 1500); // Give time for success message to be seen
            } else {
                console.error('Failed to delete service');
                this.displayDeleteFailed();
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            this.closeDeleteModal();
            this.displayDeleteFailed();
        }
    }

    closeDeleteModal() {
        const deleteModal = document.getElementById('delete-confirm-modal');
        if (deleteModal) {
            deleteModal.style.display = 'none';
        }
    }

    // SECTION: Notification Methods

    displayUpdateSuccess() {
        this.showNotification('Service updated successfully!', '#4CAF50');
    }

    displayUpdateFailed() {
        this.showNotification('Failed to update service. Please try again.', '#F44336');
    }

    displayDeleteSuccess() {
        this.showNotification('Service deleted successfully!', '#4CAF50');
    }

    displayDeleteFailed() {
        this.showNotification('Failed to delete service. Please try again.', '#F44336');
    }

    showNotification(message, bgColor) {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.style.backgroundColor = bgColor;
            notification.style.display = 'block';
        }
    }

    // Initialize when DOM is loaded
    static {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new serviceManagementUI());
        } else {
            // DOM is already loaded
            new serviceManagementUI();
        }
    }
}

//controller in charge of the updating and deletion of listings
class serviceManagementController{
    constructor() {
        this.entity = new service();
    }
    // Pass data to entity layer(update)
    async updateServiceController(serviceData) {
        return this.entity.updateCleaningService(serviceData);
    }

    //pass data to entity layer(delete)
    async deleteServiceController(serviceId) {
    console.log('Controller: Deleting service with ID:', serviceId);
    if (!serviceId) {
        return false;
    }

    // Pass the service ID to entity layer and return the boolean result
    return this.entity.deleteCleaningService(serviceId);
}
}


//boundary for search function
class searchUI {
    constructor() {
        this.initDomElements();
        this.setupEventListeners();

        // Cache for all services (will be populated when services are loaded)
        this.allServices = [];

        // Determine which page we're on
        this.isCleanerListingsPage = window.location.pathname.includes('cleanerListings.html');

        // Load and cache all services data (this happens only once)
        this.loadAllServices();
    }

    initDomElements() {
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn'); // Keep reference but don't attach event
        this.servicesContainer = document.getElementById('services-container');
    }

    setupEventListeners() {
        // Add Enter key support for search input
        if (this.searchInput) {
            this.searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }
    }

    // Load all services data once and cache it
    async loadAllServices() {
        try {
            // For user listings page - get only user's listings
            if (this.isCleanerListingsPage) {
                const userId = localStorage.getItem('currentUserId');
                if (!userId) return;

                // Get all services
                const response = await fetch(`http://localhost:3000/api/listings`);
                const result = await response.json();

                if (result.success) {
                    // Filter to only include user's listings
                    this.allServices = result.data.filter(service =>
                        service.user_id === userId
                    );
                    console.log(`Cached ${this.allServices.length} user services for searching`);
                }
            }
            // For home page - get all listings
            else {
                const response = await fetch(`http://localhost:3000/api/listings`);
                const result = await response.json();

                if (result.success) {
                    this.allServices = result.data;
                    console.log(`Cached ${this.allServices.length} services for searching`);
                }
            }
        } catch (error) {
            console.error('Error loading services for search:', error);
        }
    }

    handleSearch() {
    const query = this.searchInput?.value?.trim().toLowerCase() || '';

    // Don't search if query is empty
    if (!query) {
        return;
    }

    console.log('Search initiated for query:', query);

    // Show loading state
    this.showLoadingState();

    // If data hasn't been cached yet, try to load it
    if (!this.allServices || this.allServices.length === 0) {
        this.loadAllServices().then(() => {
            this.performClientSideSearch(query);
        });
    } else {
        // Perform the search immediately on cached data
        this.performClientSideSearch(query);
    }
}

    performClientSideSearch(query) {
    console.log('Performing search for:', query);

    // Convert query to lowercase for case-insensitive search
    const searchText = query.toLowerCase();

    // Log all services being searched through for debugging
    console.log(`Searching through ${this.allServices.length} services for "${searchText}"`);

    // Enhanced search: check title, description, and category
    const results = this.allServices.filter(service => {
        const title = (service.title || '').toLowerCase();
        const description = (service.description || '').toLowerCase();
        const category = (service.category_name || service.category || '').toLowerCase();

        return title.includes(searchText) ||
               description.includes(searchText) ||
               category.includes(searchText);
    });

    console.log(`Search found ${results.length} results`);

    // Reset flag to allow normal initialization
    window.preventShortlistInit = false;

    // Display the filtered results
    this.displayResults({
        success: true,
        data: results
    }, this.isCleanerListingsPage);
}

    showLoadingState() {
        // Simple loading indicator
        if (this.servicesContainer) {
            this.servicesContainer.innerHTML = '<p class="search-loading">Searching...</p>';
        }
    }

    displayResults(result, isUserListings) {
    if (!this.servicesContainer) {
        console.error('Services container not found');
        return;
    }

    // Clear existing content
    this.servicesContainer.innerHTML = '';

    // Clear any existing results counter
    const existingCounter = document.querySelector('.search-results-counter');
    if (existingCounter) {
        existingCounter.remove();
    }

    // Handle errors or no results
    if (!result.success) {
        this.servicesContainer.innerHTML = `<p class="search-message">Error: Something went wrong</p>`;
        return;
    }

    if (!result.data || result.data.length === 0) {
        const message = isUserListings
            ? 'No matching listings found in your services. Try different keywords.'
            : 'No matching listings found. Try different keywords.';

        this.servicesContainer.innerHTML = `<p class="search-message">${message}</p>`;
        return;
    }

    // Get the query for display purposes
    const query = this.searchInput?.value?.trim() || '';

    // NEW CODE: Instead of creating a new results counter element,
    // find and update the section title to include search results info
    if (query) {
        // Find the section title that says "Cleaning Services"
        const sectionTitle = document.querySelector('.section-title');
        if (sectionTitle) {
            // Create a container to hold both the title and the search results counter
            const titleContainer = document.createElement('div');
            titleContainer.style.display = 'flex';
            titleContainer.style.justifyContent = 'space-between';
            titleContainer.style.alignItems = 'center';
            titleContainer.style.width = '100%';

            // Clone the existing title to preserve its styling
            const titleClone = sectionTitle.cloneNode(true);

            // Create the results counter
            const resultsCount = document.createElement('div');
            resultsCount.className = 'search-results-counter';
            resultsCount.style.fontSize = '16px';
            resultsCount.innerHTML = `Found <strong>${result.data.length}</strong> ${result.data.length === 1 ? 'result' : 'results'} for "${this.escapeHtml(query)}" <button id="reset-search" style="margin-left: 10px; padding: 3px 8px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Clear</button>`;

            // Add both elements to the container
            titleContainer.appendChild(titleClone);
            titleContainer.appendChild(resultsCount);

            // Replace the original section title with our new container
            sectionTitle.parentNode.replaceChild(titleContainer, sectionTitle);

            // Add clear button handler
            document.getElementById('reset-search').addEventListener('click', () => {
                this.searchInput.value = '';
                window.location.reload();
            });
        } else {
            // Fallback if section title not found - add counter before services container
            const resultsCount = document.createElement('div');
            resultsCount.className = 'search-results-counter';
            resultsCount.style.marginTop = '10px';
            resultsCount.style.marginBottom = '10px';
            resultsCount.style.fontWeight = 'bold';
            resultsCount.innerHTML = `Found <strong>${result.data.length}</strong> ${result.data.length === 1 ? 'result' : 'results'} for "${this.escapeHtml(query)}" <button id="reset-search" style="margin-left: 10px; padding: 3px 8px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Clear</button>`;

            this.servicesContainer.parentNode.insertBefore(resultsCount, this.servicesContainer);

            // Add clear button handler
            document.getElementById('reset-search').addEventListener('click', () => {
                this.searchInput.value = '';
                window.location.reload();
            });
        }
    }

    // Apply the services-grid class to the existing container
    this.servicesContainer.classList.add('services-grid');

    try {
        // Get template
        const template = document.getElementById('service-card-template');
        if (!template) {
            throw new Error('Service card template not found');
        }

        // Create cards for each result
        result.data.forEach(service => {
            const card = document.importNode(template.content, true);

            // Set values
            card.querySelector('.service-image').src = service.image_path || 'https://placehold.co/600x400?text=Cleaning+Service';
            card.querySelector('.service-title').textContent = service.title || 'Unnamed Service';
            card.querySelector('.service-price').textContent = `S$${parseFloat(service.price || 0).toFixed(2)}`;
            card.querySelector('.service-description').textContent = service.description || 'No description available';
            card.querySelector('.tag').textContent = service.category_name || service.category || 'General';

            // Set provider name if element exists
            const providerElement = card.querySelector('.provider-name');
            if (providerElement) {
                providerElement.textContent = 'by ' + (service.provider_name || `Provider ${service.user_id || 'Unknown'}`);
            }

            // Set up buttons depending on page type
            const cardButtons = card.querySelector('.card-buttons');
            if (cardButtons) {
                if (isUserListings) {
                    // User's own listings - show edit/delete
                    cardButtons.innerHTML = `
                        <button class="btn card-btn edit-service-btn" data-id="${service.listing_id || service.id || '0'}">Edit</button>
                        <button class="btn card-btn btn-secondary delete-service-btn" data-id="${service.listing_id || service.id || '0'}">Delete</button>
                    `;
                } else {
                    // Main page - show view details
                    const viewDetailsBtn = cardButtons.querySelector('.view-details-btn');
                    if (viewDetailsBtn) {
                        viewDetailsBtn.setAttribute('data-id', service.listing_id || service.id || '0');
                    }
                }
            }

            // Add directly to servicesContainer
            this.servicesContainer.appendChild(card);
        });

        // Initialize shortlist after rendering
        setTimeout(() => {
            try {
                if (typeof shortListUI !== 'undefined' && !isUserListings) {
                    console.log('Initializing shortlist UI after search');
                    new shortListUI();
                }
            } catch (error) {
                console.error('Error initializing shortlist:', error);
            }
        }, 300);
    } catch (error) {
        console.error('Error rendering search results:', error);
        this.servicesContainer.innerHTML = '<p class="search-message">Error displaying search results. Please try again.</p>';
    }
}

    reattachManagementEventListeners() {
        // Reattach event listeners to edit/delete buttons after search
        const editButtons = document.querySelectorAll('.edit-service-btn');
        const deleteButtons = document.querySelectorAll('.delete-service-btn');

        // Handle edit button clicks
        editButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const serviceId = event.target.getAttribute('data-id');
                if (serviceId) {
                    // Find or create a serviceManagementUI instance
                    const managementUI = window.serviceManagementInstance || new serviceManagementUI();
                    managementUI.openEditForm(serviceId);
                }
            });
        });

        // Handle delete button clicks
        deleteButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const serviceId = event.target.getAttribute('data-id');
                if (serviceId) {
                    // Find or create a serviceManagementUI instance
                    const managementUI = window.serviceManagementInstance || new serviceManagementUI();
                    managementUI.openDeleteConfirmation(serviceId);
                }
            });
        });
    }

    // Helper method to escape HTML and prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    // New static initializer for the searchUI class
static {
    searchUI.initializeSearchOnPage();
}

// Add this static method to the searchUI class
static initializeSearchOnPage() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const searchInstance = new searchUI();
            window.searchInstance = searchInstance;

            // Cache an instance of readServicePage for reuse
            window.existingReadPage = new readServicePage();

            // Add event listener for search input enter key and clear
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                // Update placeholder to indicate press Enter to search
                searchInput.placeholder = "Search for cleaning services... (press Enter to search)";

                // Add clear functionality
                searchInput.addEventListener('input', function() {
                    if (this.value.trim() === '') {
                        // If search is cleared, restore original listings
                        if (window.existingReadPage) {
                            const isUserListingsPage = window.location.pathname.includes('cleanerListings.html');
                            if (isUserListingsPage) {
                                window.existingReadPage.displayUserListings();
                            } else {
                                window.existingReadPage.displayServices();
                            }
                        }
                    }
                });
            }
        });
    } else {
        // DOM already loaded
        const searchInstance = new searchUI();
        window.searchInstance = searchInstance;

        // Cache an instance of readServicePage for reuse
        window.existingReadPage = new readServicePage();
    }
}

    // // Checks if a document is ready, then initialize
    // static {
    //     if (document.readyState === 'loading') {
    //         document.addEventListener('DOMContentLoaded', () => new searchUI());
    //     } else {
    //         // DOM is already loaded
    //         new searchUI();
    //     }
    // }

}

// Integration with HTML page:
document.addEventListener('DOMContentLoaded', function() {
    // Get the search input element
    const searchInput = document.getElementById('search-input');

    if (searchInput) {
        searchInput.placeholder = "Search for cleaning services... (press Enter to search)";

        // Optional: Add clear button functionality
        searchInput.addEventListener('input', function() {
            if (this.value.trim() === '') {
                // If cleared, restore original listings
                if (window.originalLoadServices) {
                    window.originalLoadServices();
                } else if (typeof loadServices === 'function') {
                    loadServices();
                }
            }
        });
    }

    // Initialize search UI and save globally if needed
    window.searchInstance = new searchUI();
});

//controller for search function
class serviceSearchController {
    constructor() {
        this.entity = new serviceSearchEntity();
    }

    async searchListings(query, userId = null) {
        return this.entity.searchServices(query, userId);
    }
}



//Entity
class service{
    // Base URL for API calls
    constructor(){
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    //prepares api data for the database
    prepareApiData(serviceData) {
    return {
        listing_id: serviceData.listing_id || null,
        title: serviceData.title || null,
        description: serviceData.description || null,
        price: serviceData.price || null,
        image_path: serviceData.imageUrl || null,
        user_id: serviceData.providerId || localStorage.getItem('currentUserId') || 'user01',
        category: serviceData.category || null
    };
}
    //creates a cleaning service listing on the website
    async createCleaningService(serviceData){
        try {
            const apiData = this.prepareApiData(serviceData);

            console.log('Sending data to API:', apiData);

            // Make the API call to create the service
            const response = await fetch('http://localhost:3000/api/listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiData)
            });

            const result = await response.json();
            console.log('API response:', result);

            if (result.success) {
                console.log('Successfully created new listing');
                await this.readCleaningService();
                return { success: true, data: result.data };
            } else {
                console.error('Failed to create service:', result.message);
                return { success: false, error: result.message };
            }
        } catch (error) {
            console.error('Error creating service:', error);
            return { success: false, error: error.message };
        }
    }

    //fetches all cleaning service listings on the website from the database
    async readCleaningService(filter = 'all') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/listings`);
            const result = await response.json();

            if (result.success) {
                console.log('Successfully loaded services:', result.data);
                return { success: true, data: result.data };
            } else {
                console.error('Failed to load services:', result.message);
                return { success: false, error: result.message };
            }
        } catch (error) {
            console.error('Error loading services:', error);
            return { success: false, error: error.message };
        }
    }

    async updateCleaningService(serviceData) {
    try {
        // Make sure we're using listing_id consistently
        const listingId = serviceData.listing_id;
        // Add debug logging
        console.log('Update service data received:', serviceData);
        console.log('Listing ID extracted:', listingId);

        if (!listingId) {
            console.error('Missing listing_id for update operation');
            return { success: false, error: 'Missing listing ID' };
        }

        // Make sure all required fields are present
        const apiData = this.prepareApiData(serviceData);

        // Enhanced debug logging
        console.log('Updating listing with ID:', listingId);
        console.log('API endpoint:', `${this.apiBaseUrl}/listings/${listingId}`);
        console.log('Full request data:', apiData);

        // IMPORTANT: Check if the API expects the ID in the URL or in the request body
        // Some APIs expect the ID in both places, let's add it to the body as well
        apiData.listing_id = listingId; // Ensure ID is in the body even if prepareApiData didn't include it

        // Make the API call to update the service
        const response = await fetch(`${this.apiBaseUrl}/listings/${listingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        });

        const result = await response.json();
        console.log('API update response:', result);

        if (result.success) {
            console.log('Successfully updated listing');
            return { success: true, data: result.data };
        } else {
            // Enhanced error logging
            console.error('Failed to update service. Server response:', result);
            console.error('Attempted to update listing with ID:', listingId);
            return { success: false, error: result.message };
        }
    } catch (error) {
        console.error('Error updating service:', error);
        return { success: false, error: error.message };
    }
}

    async deleteCleaningService(serviceId) {  // Added the missing parameter
     try {
        console.log('Entity: Deleting service with ID:', serviceId);

        // Make the API call to delete the service
        const response = await fetch(`${this.apiBaseUrl}/listings/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('API delete response:', result);

        // Return true if successful, false otherwise
        return result.success === true;
        } catch (error) {
        console.error('Error deleting service:', error);
        return false;
        }
    }

    //search for cleaning service listings
    async searchServices(query, userId = null) {
        try {
            // Build the endpoint based on whether we're searching all listings or user listings
            let endpoint = `${this.apiBaseUrl}/listings/search?query=${encodeURIComponent(query || '')}`;

            // Add user ID parameter if provided (for searching user's listings only)
            if (userId) {
                endpoint += `&userId=${encodeURIComponent(userId)}`;
            }

            console.log('Searching with endpoint:', endpoint);

            // Make the API call to the search endpoint
            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Search results:', result);

            return result;
        } catch (error) {
            console.error('Error searching services:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    //gets only the user listings from the database
    async getUserListings(userId) {
        try {
            // First get all listings
            const result = await this.readCleaningService();

            if (result.success) {
                // Filter to only include listings from the specified user
                const userListings = result.data.filter(listing =>
                    listing.user_id === userId
                );

                return {success: true, data: userListings};
            } else {
                return {success: false, error: result.error};
            }
        } catch (error) {
            console.error('Error loading user listings:', error);
            return {success: false, error: error.message};
        }
    }
}
