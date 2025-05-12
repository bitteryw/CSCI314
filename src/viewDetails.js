// This script should be added to homeCleanerBCE.js or included as a separate file

// Add event listeners for service detail buttons
class serviceDetailsUI {
    constructor() {
        this.setupEventListeners();
        console.log('serviceDetailsUI initialized');
    }

    setupEventListeners() {
        // Use event delegation to handle clicks on view details buttons
        document.addEventListener('click', event => {
            // Check if clicked element is a view details button
            if (event.target.classList.contains('view-details-btn')) {
                const serviceId = event.target.getAttribute('data-id');
                this.navigateToServiceDetails(serviceId);
            }
        });
        console.log('Event listeners for view details buttons set up');
    }

    navigateToServiceDetails(serviceId) {
        if (!serviceId) {
            console.error('No service ID provided for navigation');
            return;
        }

        console.log('Navigating to service details for ID:', serviceId);

        // Navigate to the service details page with the service ID as a URL parameter
        window.location.href = `viewDetails.html?id=${serviceId}`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded in viewDetails.js, initializing serviceDetailsUI');
    new serviceDetailsUI();
});

// For debugging
console.log('viewDetails.js loaded');