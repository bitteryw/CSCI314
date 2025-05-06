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

    closeForm() {
        document.getElementById('service-modal').style.display = 'none';
    }

    handleFormSubmit(event) {
        event.preventDefault();

        // Collect data from service form
        const serviceData = {
            id: document.getElementById('service-id').value || null,
            title: document.getElementById('service-title').value.trim(),
            category: document.getElementById('service-category').value,
            price: parseFloat(document.getElementById('service-price').value),
            description: document.getElementById('service-description').value.trim(),
            imageUrl: document.getElementById('service-image').value.trim() || 'https://placehold.co/600x400?text=Cleaning+Service',
            providerId: this.currentUserId,
            providerName: this.currentUsername,
            createdAt: new Date().toISOString()
        };

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
    createCleaningServiceController(serviceData){
        // Pass to entity layer
        return this.entity.createCleaningService(serviceData);
    }
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

            // Render services
            this.servicesContainer.innerHTML = '';
            const template = document.getElementById('service-card-template');

            result.data.forEach(service => {
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
                card.querySelector('.provider-name').textContent = 'by ' + processedService.providerName;
                card.querySelector('.tag').textContent = processedService.category;
                card.querySelector('.view-details-btn').setAttribute('data-id', processedService.id);

                const providerElement = card.querySelector('.provider-name');
                if (providerElement) {
                    providerElement.textContent = 'by ' + processedService.providerName;
                }

                // Add edit/delete buttons for owner's listings
                if (processedService.isOwner) {
                    card.querySelector('.card-buttons').innerHTML = `
                        <button class="btn card-btn edit-btn" data-id="${processedService.id}">Edit</button>
                        <button class="btn card-btn delete-btn" data-id="${processedService.id}" style="background-color: #f44336;">Delete</button>
                    `;
                }

                this.servicesContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading services:', error);
            this.servicesContainer.innerHTML = '<p>Failed to load services. Please try again later.</p>';
        }
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

//controller for viewing service listings
class readServiceController{
    constructor() {
        this.entity = new service();
    }

    // Pass the filter to the entity layer
    async readCleaningServiceController(filter = 'all'){
        return await this.entity.readCleaningService(filter);
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
            id: service.id || service.listing_id || '0',
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




//Entity
class service{
    constructor(){

    }

    //creates a cleaning service listing on the website
    async createCleaningService(serviceData){
        try {
            // Make sure all required fields are present and convert empty values to null
            const apiData = {
                title: serviceData.title || null,
                description: serviceData.description || null,
                price: serviceData.price || null,
                image_path: serviceData.imageUrl || null,
                user_id: serviceData.providerId || localStorage.getItem('currentUserId') || 'user01',
                category: serviceData.category || null
            };

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
            const response = await fetch('http://localhost:3000/api/listings');
            const result = await response.json();

            if (result.success) {
                console.log('Successfully loaded services:', result.data);

                // If a specific filter is requested, apply it at the entity level
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

    //edit cleaning service listings
    updateCleaningService(){

    }

    //delete cleaning service listings
    deleteCleaningService(){

    }

    //search for cleaning service listings
    searchCleaningService(){

    }
}
