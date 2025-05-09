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
    console.log('Looking for service with ID:', serviceId);

    // Get all services
    const result = await this.entity.readCleaningService();

    if (result.success) {
        console.log('Total services loaded:', result.data.length);

        // Log the first few services to see their structure
        console.log('Sample services (first 2):', result.data.slice(0, 2));

        // Try to find the service with various ID formats
        const service = result.data.find(s => {
            // Try different ID properties and different comparison methods
            return (
                (s.listing_id && s.listing_id.toString() === serviceId.toString()) ||
                (s.id && s.id.toString() === serviceId.toString()) ||
                (s._id && s._id.toString() === serviceId.toString())
            );
        });

        if (service) {
            console.log('Service found:', service);
            return { success: true, data: service };
        } else {
            console.error('No service found with ID:', serviceId);
            // Let's log all IDs to help debug
            console.log('Available IDs in data:', result.data.map(s => ({
                listing_id: s.listing_id,
                id: s.id,
                _id: s._id
            })));
            return { success: false, error: 'Service not found' };
        }
    } else {
        return { success: false, error: result.error };
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





//Boundary for the updating of user listings
class serviceManagementUI{
    constructor() {
        this.controller = new serviceManagementController();
        // Check if we're on the user listings page
        const isUserListingsPage = window.location.pathname.includes('cleanerListings.html');
        this.initDomElements();
        this.setupManagementEventListeners();

        if (isUserListingsPage) {
            // For the cleaner listings page, display only listings that the user made
            this.servicePage = new readServicePage();

            // Override the default display method to show only user listings
            // This needs to happen after the readServicePage constructor runs
            setTimeout(() => {
                this.displayUserServices();
            }, 0);
        }
        // For other pages, the normal readServicePage initialization will run
        // and display all services by default
    }

    displayUserServices() {
        // Ensures we don't call this on pages other than the user listings page
        const servicePage = this.servicePage || new readServicePage();
        servicePage.displayUserListings();
    }

    initDomElements() {
        this.addServiceBtn = document.getElementById('add-service-btn');
        this.serviceForm = document.getElementById('service-form');
        if (this.serviceForm) {
            this.serviceForm.addEventListener('submit', (event) => this.handleFormSubmit(event));
        }
    }

    //Event Listener for Edit button
    setupManagementEventListeners() {
        document.addEventListener('click', event => {
        if (event.target.classList.contains('edit-service-btn')) {
        console.log('Edit button clicked!');
        const serviceId = event.target.getAttribute('data-id');
        console.log('Service ID:', serviceId);
        this.openEditForm(serviceId);
    }

});}

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
        console.log('Service data loaded for editing:', service);

        // Check the structure of the service object to understand what ID field to use
        console.log('Available ID fields in service object:');
        if (service.listing_id) console.log('- listing_id:', service.listing_id);
        if (service.id) console.log('- id:', service.id);
        if (service._id) console.log('- _id:', service._id);

        // Set form title for editing
        document.getElementById('modal-title').textContent = 'Edit Service';

        // IMPORTANT: Make sure we're using the right ID field
        // Try different ID fields in order of preference
        const idToUse = service.listing_id || service.id || service._id;
        console.log('Using ID for update:', idToUse);

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

    displayUpdateSuccess(){

    }

    displayUpdateFailed(){

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

class serviceManagementController{
    constructor() {
        this.entity = new service();
    }
    // Pass data to entity layer
    async updateServiceController(serviceData) {
        return this.entity.updateCleaningService(serviceData);
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

    //delete cleaning service listings
    deleteCleaningService(){

    }

    //search for cleaning service listings
    searchCleaningService(){

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
