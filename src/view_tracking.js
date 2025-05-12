// view-tracking.js
// Functions for tracking listing views

// Function to record a view when the "View Details" button is clicked
function recordListingView(listingId, viewSource = 'homepage') {
    // Get current user ID from localStorage if available
    const viewerId = localStorage.getItem('currentUserId') || null;

    // Get user agent
    const userAgent = navigator.userAgent;

    // Create the request payload
    const viewData = {
        listing_id: listingId,
        viewer_id: viewerId,
        view_source: viewSource,
        user_agent: userAgent
    };

    // Log for debugging
    console.log(`Recording view for listing ${listingId} by user ${viewerId || 'anonymous'}`);

    // Send the view data to the server
    fetch('http://localhost:3000/api/views', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(viewData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`View recorded successfully: ${data.message}`);
        } else {
            console.error(`Failed to record view: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Error recording view:', error);
    });
}

// Function to attach view tracking to all "View Details" buttons on the page
function setupViewTracking() {
    // Find all "View Details" buttons
    const viewDetailsButtons = document.querySelectorAll('.view-details-btn');

    // Add click event listeners to each button
    viewDetailsButtons.forEach(button => {
        const listingId = button.getAttribute('data-id');

        // Remove any existing listeners first to prevent duplicates
        button.removeEventListener('click', () => recordListingView(listingId));

        // Add the click event listener
        button.addEventListener('click', () => {
            recordListingView(listingId);
        });
    });

    console.log(`View tracking set up for ${viewDetailsButtons.length} listings`);
}

// Function to initialize view tracking after the page has loaded
function initViewTracking() {
    // Set up initial tracking
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Initializing view tracking');
        setupViewTracking();

        // Also set up an observer to handle dynamically added service cards
        const servicesContainer = document.getElementById('services-container');
        if (servicesContainer) {
            // Use MutationObserver to detect when new service cards are added
            const observer = new MutationObserver(() => {
                setupViewTracking();
            });

            // Start observing the container for changes
            observer.observe(servicesContainer, { childList: true, subtree: true });
        }
    });
}

// Export the functions for use in other files
// (If using ES modules - otherwise these are global functions)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        recordListingView,
        setupViewTracking,
        initViewTracking
    };
}

// Initialize tracking (comment this out if you're importing this as a module)
initViewTracking();