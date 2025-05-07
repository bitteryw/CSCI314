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

    async createCleaningServiceController(serviceData){
        // Validate the service data using the original service data structure
        if (!this.validateServiceData(serviceData)) {
            return { success: false, error: "Invalid service data" };
        }
        // Pass the original serviceData to the entity layer
        return this.entity.createCleaningService(serviceData);
    }

    // Business logic: Validate service data
    validateServiceData(data) {
        // Check required fields
        if (!data.title || !data.price || !data.category) {
            return false;
        }

        // Price must be a positive number
        if (isNaN(data.price) || data.price <= 0) {
            return false;
        }

        return true;
    }
}

//Entity
class service{
    // Base URL for API calls
    constructor(){
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    //creates a cleaning service listing on the website
    async createCleaningService(serviceData){
        try {

            // Transform serviceData to apiData format expected by the API
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
    }