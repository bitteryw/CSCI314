// Boundary - Handles UI and user interaction
class AddListing {
    constructor(addListingController) {
        this.controller = addListingController;
        this.currentFilter = 'all';
        this.serviceToDelete = null;
        this.currentUsername = localStorage.getItem('currentUsername') || 'Guest User';
        this.currentUserId = localStorage.getItem('currentUserId') || null;

        // Initialize DOM elements
        this.initDomElements();

        // Set up event listeners
        this.setupEventListeners();

        // Display current username in all places
        this.displayUsername();

        // Set user avatar initial
        this.setUserAvatar();

        // Initial render
        this.renderServices();
    }

    // Set user avatar with first letter of username
    setUserAvatar() {
        if (this.userAvatar) {
            const initial = this.currentUsername.charAt(0).toUpperCase();
            this.userAvatar.textContent = initial;
        }
    }

    initDomElements() {
        // DOM elements
        this.servicesContainer = document.getElementById('services-container');
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.addServiceBtn = document.getElementById('add-service-btn');
        this.addServiceBtnBanner = document.getElementById('add-service-btn-banner');
        this.serviceModal = document.getElementById('service-modal');
        this.deleteModal = document.getElementById('delete-modal');
        this.closeModal = document.getElementById('close-modal');
        this.closeDeleteModal = document.getElementById('close-delete-modal');
        this.serviceForm = document.getElementById('service-form');
        this.modalTitle = document.getElementById('modal-title');
        this.serviceIdInput = document.getElementById('service-id');
        this.serviceTitleInput = document.getElementById('service-title');
        this.serviceCategoryInput = document.getElementById('service-category');
        this.servicePriceInput = document.getElementById('service-price');
        this.serviceDescriptionInput = document.getElementById('service-description');
        this.serviceImageInput = document.getElementById('service-image');
        this.cancelButton = document.getElementById('cancel-button');
        this.saveButton = document.getElementById('save-button');
        this.cancelDeleteButton = document.getElementById('cancel-delete-button');
        this.confirmDeleteButton = document.getElementById('confirm-delete-button');
        this.filterChips = document.querySelectorAll('.filter-chip');
        this.usernameDisplay = document.getElementById('username-display');
        this.welcomeUsername = document.getElementById('welcome-username');
        this.userAvatar = document.getElementById('user-avatar');
    }

    displayUsername() {
        if (this.usernameDisplay) {
            this.usernameDisplay.textContent = this.currentUsername;
        }

        if (this.welcomeUsername) {
            this.welcomeUsername.textContent = this.currentUsername;
        }
    }

    setupEventListeners() {
        // Add service buttons
        this.addServiceBtn.addEventListener('click', () => this.openAddServiceModal());
        if (this.addServiceBtnBanner) {
            this.addServiceBtnBanner.addEventListener('click', () => this.openAddServiceModal());
        }

        // Modal close buttons
        this.closeModal.addEventListener('click', () => this.closeServiceModal());
        this.closeDeleteModal.addEventListener('click', () => this.closeDeleteConfirmation());

        // Cancel buttons
        this.cancelButton.addEventListener('click', () => this.closeServiceModal());
        this.cancelDeleteButton.addEventListener('click', () => this.closeDeleteConfirmation());

        // Form submission
        this.serviceForm.addEventListener('submit', (event) => this.saveService(event));

        // Delete confirmation
        this.confirmDeleteButton.addEventListener('click', () => this.confirmDelete());

        // Search functionality
        this.searchBtn.addEventListener('click', () => this.searchServices());
        this.searchInput.addEventListener('keyup', event => {
            if (event.key === 'Enter') {
                this.searchServices();
            }
        });

        // Filter chips
        this.filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this.filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentFilter = chip.dataset.filter;
                this.renderServices();
            });
        });
    }

    // Render services to the page
    async renderServices() {
        this.servicesContainer.innerHTML = '';

        try {
            const searchTerm = this.searchInput.value.toLowerCase();
            const filteredServices = await this.controller.getFilteredServices(searchTerm, this.currentFilter);

            if (filteredServices.length === 0) {
                this.servicesContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--dark-gray);">No services found. Try a different search or filter.</p>';
                return;
            }

            filteredServices.forEach(service => {
                const serviceCard = document.createElement('div');
                serviceCard.className = 'service-card';
                serviceCard.innerHTML = `
                    <img src="${service.image || '/api/placeholder/400/320'}" alt="${service.title}" class="service-image">
                    <div class="service-info">
                        <h3 class="service-title">${service.title}</h3>
                        <div class="service-price">$${service.price.toFixed(2)} SGD</div>
                        <span class="tag">${this.controller.getCategoryName(service.category)}</span>
                        <p class="service-description">${service.description}</p>
                        <div class="service-provider">
                            <img src="${service.providerAvatar || '/api/placeholder/100/100'}" alt="${service.provider}" class="provider-avatar">
                            <span class="provider-name">${service.provider}</span>
                        </div>
                        <div class="card-actions">
                            ${service.user_id === this.currentUserId ?
                    `<button class="btn card-btn btn-secondary edit-btn" data-id="${service.id}">Edit</button>
                             <button class="btn card-btn" style="background-color: #f44336;" data-id="${service.id}">Delete</button>`
                    : ''}
                        </div>
                    </div>
                `;

                this.servicesContainer.appendChild(serviceCard);

                // Add event listeners to buttons if this service belongs to the current user
                if (service.user_id === this.currentUserId) {
                    const editBtn = serviceCard.querySelector('.edit-btn');
                    const deleteBtn = serviceCard.querySelector('[style="background-color: #f44336;"]');

                    if (editBtn) editBtn.addEventListener('click', () => this.openEditServiceModal(service.id));
                    if (deleteBtn) deleteBtn.addEventListener('click', () => this.openDeleteConfirmation(service.id));
                }
            });
        } catch (error) {
            console.error('Error rendering services:', error);
            this.servicesContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 30px; color: red;">Error loading services. Please try again later.</p>';
        }
    }

    // Open modal to add a new service
    openAddServiceModal() {
        // Check if user is logged in with a user_id
        if (!this.currentUserId) {
            alert("Please log in to add a listing");
            return;
        }

        this.modalTitle.textContent = 'Add New Service';
        this.serviceForm.reset();
        this.serviceIdInput.value = '';
        this.serviceModal.style.display = 'block';
        this.resetFormErrors();
    }

    // Open modal to edit an existing service
    async openEditServiceModal(id) {
        try {
            const service = await this.controller.getServiceById(id);
            if (!service) {
                alert("Service not found");
                return;
            }

            // Only allow editing if the service belongs to the current user
            if (service.user_id !== this.currentUserId) {
                alert("You can only edit your own listings");
                return;
            }

            this.modalTitle.textContent = 'Edit Service';
            this.serviceIdInput.value = service.id;
            this.serviceTitleInput.value = service.title;
            this.serviceCategoryInput.value = service.category;
            this.servicePriceInput.value = service.price;
            this.serviceDescriptionInput.value = service.description;
            this.serviceImageInput.value = service.image;

            this.serviceModal.style.display = 'block';
            this.resetFormErrors();
        } catch (error) {
            console.error('Error opening edit modal:', error);
            alert("An error occurred. Please try again.");
        }
    }

    // Close the service modal
    closeServiceModal() {
        this.serviceModal.style.display = 'none';
    }

    // Reset form error messages
    resetFormErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(msg => {
            msg.style.display = 'none';
        });
    }

    // Display validation errors
    displayValidationErrors(errors) {
        this.resetFormErrors();

        for (const field in errors) {
            const errorElement = document.getElementById(`${field}-error`);
            if (errorElement) {
                errorElement.textContent = errors[field];
                errorElement.style.display = 'block';
            }
        }
    }

    // Save a service (add new or update existing)
    async saveService(event) {
        event.preventDefault();

        // Disable the save button to prevent multiple submissions
        if (this.saveButton) {
            this.saveButton.disabled = true;
            this.saveButton.textContent = 'Saving...';
        }

        // Check if user is logged in
        if (!this.currentUserId) {
            alert("Please log in to save a listing");

            // Re-enable the save button
            if (this.saveButton) {
                this.saveButton.disabled = false;
                this.saveButton.textContent = 'Save Service';
            }

            return;
        }

        const serviceData = {
            title: this.serviceTitleInput.value,
            category: this.serviceCategoryInput.value,
            price: this.servicePriceInput.value,
            description: this.serviceDescriptionInput.value,
            image: this.serviceImageInput.value || "/api/placeholder/400/320",
            user_id: this.currentUserId // Use the logged in user ID
        };

        const serviceId = this.serviceIdInput.value;
        let result;

        try {
            if (serviceId) {
                // Update existing service
                result = await this.controller.updateService(serviceId, serviceData);
            } else {
                // Add new service
                result = await this.controller.createService(serviceData);
            }

            if (result.success) {
                this.closeServiceModal();
                this.renderServices();
            } else {
                this.displayValidationErrors(result.errors || {"title": "Failed to save. Please try again."});
            }
        } catch (error) {
            console.error('Error saving service:', error);
            alert("An error occurred while saving the service. Using local storage fallback.");

            // Attempt local storage fallback directly
            try {
                const fallbackService = {
                    id: serviceId ? parseInt(serviceId) : Date.now(),
                    ...serviceData,
                    price: parseFloat(serviceData.price),
                    provider: this.currentUsername,
                    providerAvatar: "/api/placeholder/100/100"
                };

                let storedServices = JSON.parse(localStorage.getItem('services') || '[]');

                if (serviceId) {
                    // Update existing
                    const index = storedServices.findIndex(s => s.id === parseInt(serviceId));
                    if (index !== -1) {
                        storedServices[index] = { ...storedServices[index], ...fallbackService };
                    } else {
                        storedServices.push(fallbackService);
                    }
                } else {
                    // Add new
                    storedServices.push(fallbackService);
                }

                localStorage.setItem('services', JSON.stringify(storedServices));
                this.closeServiceModal();
                this.renderServices();
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                alert("Failed to save service. Please try again later.");
            }
        } finally {
            // Always re-enable the save button
            if (this.saveButton) {
                this.saveButton.disabled = false;
                this.saveButton.textContent = 'Save Service';
            }
        }
    }

    // Open delete confirmation modal
    async openDeleteConfirmation(id) {
        try {
            const service = await this.controller.getServiceById(id);

            // Only allow deletion if the service belongs to the current user
            if (service && service.user_id !== this.currentUserId) {
                alert("You can only delete your own listings");
                return;
            }

            this.serviceToDelete = id;
            this.deleteModal.style.display = 'block';
        } catch (error) {
            console.error('Error opening delete confirmation:', error);
            alert("An error occurred. Please try again.");
        }
    }

    // Close delete confirmation modal
    closeDeleteConfirmation() {
        this.deleteModal.style.display = 'none';
        this.serviceToDelete = null;
    }

    // Confirm and process deletion
    async confirmDelete() {
        if (this.serviceToDelete === null) return;

        // Disable the button to prevent multiple clicks
        if (this.confirmDeleteButton) {
            this.confirmDeleteButton.disabled = true;
            this.confirmDeleteButton.textContent = 'Deleting...';
        }

        try {
            const result = await this.controller.deleteService(this.serviceToDelete);

            if (result.success) {
                this.closeDeleteConfirmation();
                this.renderServices();
            } else {
                alert("Failed to delete the service. Please try again.");
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            alert("An error occurred while deleting the service. Using local storage fallback.");

            // Direct fallback to localStorage
            try {
                let storedServices = JSON.parse(localStorage.getItem('services') || '[]');
                const newServices = storedServices.filter(s => s.id !== this.serviceToDelete);
                localStorage.setItem('services', JSON.stringify(newServices));
                this.closeDeleteConfirmation();
                this.renderServices();
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                alert("Failed to delete service. Please try again later.");
            }
        } finally {
            // Always re-enable the button
            if (this.confirmDeleteButton) {
                this.confirmDeleteButton.disabled = false;
                this.confirmDeleteButton.textContent = 'Delete';
            }
        }
    }

    // Search for services
    searchServices() {
        this.renderServices();
    }
}
// Controller - Contains business logic
class AddListingController {
    constructor(homeCleaners) {
        this.homeCleaners = homeCleaners;
    }

    // Get category display name
    getCategoryName(category) {
        const categories = {
            'home': 'Home Cleaning',
            'office': 'Office Cleaning',
            'carpet': 'Carpet Cleaning',
            'windows': 'Window Cleaning',
            'deep': 'Deep Cleaning'
        };

        return categories[category] || category;
    }

    // Get all services
    async getAllServices() {
        return await this.homeCleaners.getAllServices();
    }

    // Get filtered services
    async getFilteredServices(searchTerm, category) {
        return await this.homeCleaners.filterServices(searchTerm, category);
    }

    // Get a service by ID
    async getServiceById(id) {
        return await this.homeCleaners.getServiceById(parseInt(id));
    }

    // Validate service data
    validateServiceData(serviceData) {
        const errors = {};

        if (!serviceData.title || !serviceData.title.trim()) {
            errors.title = "Please enter a valid title";
        }

        if (!serviceData.category) {
            errors.category = "Please select a category";
        }

        if (!serviceData.price || isNaN(serviceData.price) || parseFloat(serviceData.price) <= 0) {
            errors.price = "Please enter a valid price";
        }

        if (!serviceData.description || !serviceData.description.trim()) {
            errors.description = "Please enter a description";
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    // Create a new service
    async createService(serviceData) {
        const validation = this.validateServiceData(serviceData);
        if (!validation.isValid) {
            return { success: false, errors: validation.errors };
        }

        // Get current user from localStorage
        const currentUsername = localStorage.getItem('currentUsername') || 'Guest User';

        // Prepare data with defaults
        const preparedData = {
            ...serviceData,
            price: parseFloat(serviceData.price),
            image: serviceData.image || "/api/placeholder/400/320",
            provider: serviceData.provider || currentUsername,
            providerAvatar: serviceData.providerAvatar || "/api/placeholder/100/100"
        };

        try {
            const newService = await this.homeCleaners.addService(preparedData);
            return { success: !!newService, service: newService };
        } catch (error) {
            console.error("Error in controller.createService:", error);
            throw error; // Propagate error to UI for fallback handling
        }
    }

    // Update an existing service
    async updateService(id, serviceData) {
        const validation = this.validateServiceData(serviceData);
        if (!validation.isValid) {
            return { success: false, errors: validation.errors };
        }

        // Prepare data with parsed values
        const preparedData = {
            ...serviceData,
            price: parseFloat(serviceData.price)
        };

        try {
            const updatedService = await this.homeCleaners.updateService(parseInt(id), preparedData);
            return { success: !!updatedService, service: updatedService };
        } catch (error) {
            console.error("Error in controller.updateService:", error);
            throw error; // Propagate error to UI for fallback handling
        }
    }

    // Delete a service
    async deleteService(id) {
        try {
            const deletedService = await this.homeCleaners.deleteService(parseInt(id));
            return { success: !!deletedService };
        } catch (error) {
            console.error("Error in controller.deleteService:", error);
            throw error; // Propagate error to UI for fallback handling
        }
    }
}

// Entity
class HomeCleaners {
    constructor() {
        // Initial empty array
        this.services = [];
        // Load services immediately when constructed
        this.loadServices();
    }

    // Load services from the API
    async loadServices() {
        try {
            // Set a timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API request timed out')), 5000);
            });

            // Try to fetch from API
            const fetchPromise = fetch('http://localhost:3000/api/listings');

            // Race the fetch against the timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            const data = await response.json();

            if (data.success) {
                // Map the database fields to the format expected by our UI
                this.services = data.data.map(listing => ({
                    id: listing.listing_id,
                    title: listing.title,
                    category: listing.description.split(' ')[0].toLowerCase() || 'home', // Extract category from description or default to 'home'
                    price: parseFloat(listing.price),
                    description: listing.description,
                    image: listing.image_path || "/api/placeholder/400/320",
                    provider: listing.provider_name,
                    providerAvatar: "/api/placeholder/100/100",
                    user_id: listing.user_id // Store the user_id for API calls
                }));

                // Also cache in localStorage as backup
                localStorage.setItem('services', JSON.stringify(this.services));

                return this.services;
            } else {
                throw new Error(data.message || 'Failed to load services from API');
            }
        } catch (error) {
            console.error('Failed to load services from API:', error);
            // Fallback to localStorage if API fails
            const storedServices = localStorage.getItem('services');
            if (storedServices) {
                try {
                    this.services = JSON.parse(storedServices);
                    return this.services;
                } catch (parseError) {
                    console.error('Error parsing stored services:', parseError);
                    this.services = [];
                    return [];
                }
            }
            this.services = [];
            return [];
        }
    }

    // Get all services
    async getAllServices() {
        try {
            await this.loadServices();
            return [...this.services];
        } catch (error) {
            console.error('Error getting all services:', error);
            return [];
        }
    }

    // Get a service by ID
    async getServiceById(id) {
        try {
            await this.loadServices();
            return this.services.find(service => service.id === id);
        } catch (error) {
            console.error('Error getting service by ID:', error);
            // Try from localStorage directly if API fails
            const storedServices = localStorage.getItem('services');
            if (storedServices) {
                try {
                    const services = JSON.parse(storedServices);
                    return services.find(service => service.id === id);
                } catch (parseError) {
                    console.error('Error parsing stored services:', parseError);
                    return null;
                }
            }
            return null;
        }
    }

    // Add a new service
    async addService(serviceData) {
        try {
            // Get current user_id from localStorage
            const currentUserId = localStorage.getItem('currentUserId') || null;

            if (!currentUserId) {
                throw new Error('User ID not found in local storage');
            }

            // Set a timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API request timed out')), 5000);
            });

            // Prepare the data for the API
            const apiData = {
                title: serviceData.title,
                description: `${serviceData.category.charAt(0).toUpperCase() + serviceData.category.slice(1)}: ${serviceData.description}`,
                price: serviceData.price,
                image_path: serviceData.image,
                user_id: currentUserId
            };

            // Try API call
            const fetchPromise = fetch('http://localhost:3000/api/listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiData)
            });

            // Race the fetch against the timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            const data = await response.json();

            if (data.success) {
                // Refresh the services list
                await this.loadServices();
                return data.data;
            } else {
                throw new Error(data.message || 'Failed to add service via API');
            }
        } catch (error) {
            console.error('Failed to add service via API:', error);

            // Fallback to localStorage
            const newId = this.services.length > 0
                ? Math.max(...this.services.map(s => s.id)) + 1
                : Date.now(); // Use timestamp if no services exist

            const newService = {
                id: newId,
                ...serviceData,
                user_id: localStorage.getItem('currentUserId') || null
            };

            this.services.push(newService);
            localStorage.setItem('services', JSON.stringify(this.services));
            return newService;
        }
    }

    // Update an existing service
    async updateService(id, serviceData) {
        try {
            // Get current user_id from localStorage
            const currentUserId = localStorage.getItem('currentUserId') || null;

            if (!currentUserId) {
                throw new Error('User ID not found in local storage');
            }

            // Get the current service to ensure we're only updating our own
            const currentService = await this.getServiceById(id);

            if (!currentService) {
                throw new Error('Service not found');
            }

            if (currentService.user_id !== currentUserId) {
                throw new Error('You can only update your own listings');
            }

            // Set a timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API request timed out')), 5000);
            });

            // Prepare the data for the API
            const apiData = {
                title: serviceData.title,
                description: `${serviceData.category.charAt(0).toUpperCase() + serviceData.category.slice(1)}: ${serviceData.description}`,
                price: serviceData.price,
                image_path: serviceData.image,
                user_id: currentUserId
            };

            // Try API call
            const fetchPromise = fetch(`http://localhost:3000/api/listings/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiData)
            });

            // Race the fetch against the timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            const data = await response.json();

            if (data.success) {
                // Refresh the services list
                await this.loadServices();
                return data.data;
            } else {
                throw new Error(data.message || 'Failed to update service via API');
            }
        } catch (error) {
            console.error('Failed to update service via API:', error);

            // Fallback to localStorage
            const index = this.services.findIndex(s => s.id === id);
            if (index !== -1) {
                this.services[index] = {
                    ...this.services[index],
                    ...serviceData
                };
                localStorage.setItem('services', JSON.stringify(this.services));
                return this.services[index];
            }
            return null;
        }
    }

    // Delete a service
    async deleteService(id) {
        try {
            // Get current user_id from localStorage
            const currentUserId = localStorage.getItem('currentUserId') || null;

            if (!currentUserId) {
                throw new Error('User ID not found in local storage');
            }

            // Set a timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API request timed out')), 5000);
            });

            // Try API call
            const fetchPromise = fetch(`http://localhost:3000/api/listings/${id}?user_id=${encodeURIComponent(currentUserId)}`, {
                method: 'DELETE'
            });

            // Race the fetch against the timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            const data = await response.json();

            if (data.success) {
                // Refresh the services list
                await this.loadServices();
                return { id };
            } else {
                throw new Error(data.message || 'Failed to delete service via API');
            }
        } catch (error) {
            console.error('Failed to delete service via API:', error);

            // Fallback to localStorage
            const index = this.services.findIndex(s => s.id === id);
            if (index !== -1) {
                const deletedService = this.services[index];
                this.services.splice(index, 1);
                localStorage.setItem('services', JSON.stringify(this.services));
                return deletedService;
            }
            return null;
        }
    }

    // Filter services by search term and category
    async filterServices(searchTerm, category) {
        try {
            await this.loadServices();

            return this.services.filter(service => {
                const matchesSearch = !searchTerm ||
                    service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    service.provider.toLowerCase().includes(searchTerm.toLowerCase());

                const matchesCategory = category === 'all' || service.category === category;

                return matchesSearch && matchesCategory;
            });
        } catch (error) {
            console.error('Error filtering services:', error);
            return [];
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // For testing purposes, set a dummy user ID if not available
    if (!localStorage.getItem('currentUserId')) {
        localStorage.setItem('currentUserId', '1');
        localStorage.setItem('currentUsername', 'Test User');
    }

    console.log('Initializing application...');
    console.log('Current user ID:', localStorage.getItem('currentUserId'));
    console.log('Current username:', localStorage.getItem('currentUsername'));

    // Create the classes and link them together
    const homeCleaners = new HomeCleaners();
    const addListingController = new AddListingController(homeCleaners);
    const addListing = new AddListing(addListingController);

    console.log('Application initialized!');
});