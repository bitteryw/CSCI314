document.addEventListener('DOMContentLoaded', async function() {
    // Get user ID from local storage
    const userId = localStorage.getItem('currentUserId');
    if (!userId) {
        showNotification('Please log in to view service statistics', 'error');
        return;
    }

    console.log('User ID:', userId);

    // Initialize the stats container
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer) {
        console.error('Stats container not found');
        return;
    }

    // Set up filter buttons
    setupFilterButtons();

    // Fetch and display the stats for the user's listings
    await fetchAndDisplayStats();

    // Set up filter button functionality
    function setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');

                // Update the displayed stats based on the selected time period
                updateDisplayedStats(this.dataset.period);
            });
        });
    }

    // Function to fetch and display stats
    async function fetchAndDisplayStats() {
        try {
            // Show loading state
            statsContainer.innerHTML = '<div class="loading">Loading statistics...</div>';

            // Get all listings with real view data in a single efficient request
            console.log('Fetching listing stats...');
            const response = await fetch(`http://localhost:3000/api/views/user/${userId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch listing stats: ${response.status}`);
            }

            const statsData = await response.json();
            console.log('Listing stats data:', statsData);

            if (!statsData.success || !statsData.data || statsData.data.length === 0) {
                statsContainer.innerHTML = `
                    <div class="no-stats">
                        <h3>No listings found</h3>
                        <p>You don't have any active listings to show statistics for.</p>
                        <button class="btn" onclick="window.location.href='cleanerListings.html'">Create a Listing</button>
                    </div>
                `;
                return;
            }

            console.log(`Found ${statsData.data.length} listings with stats for user ${userId}`);

            // Display the table with real data
            displayStatsTable(statsData.data);

        } catch (error) {
            console.error('Error fetching stats:', error);
            statsContainer.innerHTML = `
                <div class="no-stats">
                    <h3>Error loading statistics</h3>
                    <p>There was a problem loading your service statistics. Please try again later.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        }
    }

    // Function to display the stats in a table
    function displayStatsTable(listings) {
        console.log('Displaying stats table with data:', listings);

        // Create the table structure
        const tableHTML = `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Service Listing Name</th>
                        <th>Shortlists</th>
                        <th>Views/Day</th>
                        <th>Views/Week</th>
                        <th>Views/Month</th>
                    </tr>
                </thead>
                <tbody id="stats-table-body">
                    ${listings.map(listing => {
                        const listingId = listing.listing_id.toString();
                        const shortlistCount = listing.shortlist_count || 0;
                        const viewData = listing.views || { day: 0, week: 0, month: 0 };
                        
                        return `
                            <tr data-id="${listingId}">
                                <td>${listingId}</td>
                                <td>${listing.title}</td>
                                <td>${shortlistCount}</td>
                                <td>${viewData.day}</td>
                                <td>${viewData.week}</td>
                                <td>${viewData.month}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        statsContainer.innerHTML = tableHTML;
    }

    // Function to update displayed stats based on the selected time period
    function updateDisplayedStats(period) {
        // In a real implementation, this would fetch new data based on the period
        console.log(`Displaying stats for period: ${period}`);

        // Here we're just showing a notification since the real-time update would require
        // more complex server-side filtering
        showNotification(`Showing statistics for ${period === 'all' ? 'all time' : `this ${period}`}`, 'info');

        // In a full implementation, you would make another API call with the period parameter
        // For example:
        // fetch(`http://localhost:3000/api/views/user/${userId}?period=${period}`)
    }
});

// Function to show a notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    console.log(`Showing notification: ${message} (${type})`);

    // Set the message
    notification.textContent = message;

    // Set the notification type (color)
    notification.className = ''; // Clear existing classes
    notification.classList.add('notification', `notification-${type}`);

    // Set the background color based on type
    if (type === 'error') {
        notification.style.backgroundColor = '#F44336';
    } else if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#FF9800';
    } else {
        notification.style.backgroundColor = '#2196F3'; // info
    }

    // Make the notification visible
    notification.style.display = 'block';
    notification.style.opacity = '1';

    // Hide after 3 seconds
    setTimeout(function() {
        notification.style.opacity = '0';
        setTimeout(function() {
            notification.style.display = 'none';
        }, 500);
    }, 3000);
}