const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const mysql2Promise = require('mysql2/promise');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});


//test


//kh added
const path = require('path');

// Add this before your other routes
app.use(express.static(path.join(__dirname, '..', 'src','users'), {
    index: 'loginpage.html'
})); // Assuming your HTML files are in a 'public' folder

// Root route to serve login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,'..', 'src','users', 'loginpage.html'));
});
//until here---kh


``






// Database configuration
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '123456aB*', //please change if needed
    database: 'users'
};

// MySQL connection pool for authentication
const pool = mysql.createPool({
    connectionLimit: 10,
    ...dbConfig
});

// Authentication endpoint
app.post('/api/authenticate', (req, res) => {
    const { username, password } = req.body;

    // IMPORTANT: In production, use parameterized queries to prevent SQL injection
    // Also, passwords should be hashed, not stored in plain text
    const query = 'SELECT * FROM user_accounts WHERE user_id = ? AND password = ?';

    pool.query(query, [username, password], (error, results) => {
        if (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
            return;
        }

        if (results.length > 0) {
            const userRole = results[0].roles || 'home_owner';
            res.json({
                success: true,
                authenticated: true,
                userRole: userRole
            });
        } else {
            res.json({
                success: true,
                authenticated: false
            });
        }
    });
});

// Get all homeowners endpoint
app.get('/get-homeowners', async (req, res) => {
    try {
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM user_accounts');
        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch data',
            error: error.message
        });
    }
});


// Add this code to your existing server.js file

// Add new user endpoint
app.post('/api/users', async (req, res) => {
    const { email, first_name, last_name, roles } = req.body;

    // Basic validation
    if (!email || !first_name || !last_name) {
        return res.status(400).json({
            success: false,
            message: 'Email, first name, and last name are required'
        });
    }

    try {
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Generate a user_id (you might want a better ID system in production)
        const [result] = await connection.execute(
            'SELECT MAX(CAST(SUBSTRING(user_id, 5) AS UNSIGNED)) AS max_id FROM user_accounts'
        );
        const nextId = result[0].max_id ? result[0].max_id + 1 : 51;
        const user_id = `user${nextId.toString().padStart(2, '0')}`;

        // Insert the new user
        await connection.execute(
            'INSERT INTO user_accounts (user_id, email, password, first_name, last_name, roles) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, email, `password${nextId}`, first_name, last_name, roles || 'home_owner']
        );

        await connection.end();

        res.json({
            success: true,
            message: 'User added successfully',
            user_id
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add user',
            error: error.message
        });
    }
});




























// Make sure this endpoint is properly defined and not nested inside any conditional blocks
// Place this with your other endpoint definitions

// Update user account endpoint - keep the original URL without the /api/ prefix
app.post('/update-user-account', async (req, res) => {
    try {
        console.log('Update user request received:', req.body);
        const { user_id, email, first_name, last_name, roles } = req.body;
        
        // Basic validation
        if (!email || !first_name || !last_name || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID, email, first name, and last name are required'
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        // Validate roles (must be either 'home_owner' or 'user_admin')
        if (roles && !['home_owner', 'user_admin'].includes(roles)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be either "home_owner" or "user_admin"'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );
        
        if (existingUser.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if email is already in use by another user
        const [emailCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE email = ? AND user_id != ?',
            [email, user_id]
        );
        
        if (emailCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'Email already in use by another user'
            });
        }
        
        // Check if first_name and last_name combination is already in use by another user
        const [nameCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE first_name = ? AND last_name = ? AND user_id != ?',
            [first_name, last_name, user_id]
        );
        
        if (nameCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'First name and last name combination already in use by another user'
            });
        }
        
        // Update user
        await connection.execute(
            'UPDATE user_accounts SET email = ?, first_name = ?, last_name = ?, roles = ? WHERE user_id = ?',
            [email, first_name, last_name, roles, user_id]
        );
        
        await connection.end();
        
        console.log('User updated successfully:', user_id);
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        // Comprehensive error logging
        console.error('Error in update-user-account endpoint:', error);
        // Send proper JSON error response
        res.status(500).json({
            success: false,
            message: 'Failed to update user: ' + error.message
        });
    }
});

// Also add a duplicate endpoint with the /api/ prefix for consistency
app.post('/api/update-user-account', async (req, res) => {
    // Simply call the same logic from the other route
    try {
        const { user_id, email, first_name, last_name, roles } = req.body;
        
        // Basic validation
        if (!email || !first_name || !last_name || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID, email, first name, and last name are required'
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        // Validate roles (must be either 'home_owner' or 'user_admin')
        if (roles && !['home_owner', 'user_admin'].includes(roles)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be either "home_owner" or "user_admin"'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );
        
        if (existingUser.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if email is already in use by another user
        const [emailCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE email = ? AND user_id != ?',
            [email, user_id]
        );
        
        if (emailCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'Email already in use by another user'
            });
        }
        
        // Check if first_name and last_name combination is already in use by another user
        const [nameCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE first_name = ? AND last_name = ? AND user_id != ?',
            [first_name, last_name, user_id]
        );
        
        if (nameCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'First name and last name combination already in use by another user'
            });
        }
        
        // Update user
        await connection.execute(
            'UPDATE user_accounts SET email = ?, first_name = ?, last_name = ?, roles = ? WHERE user_id = ?',
            [email, first_name, last_name, roles, user_id]
        );
        
        await connection.end();
        
        console.log('User updated successfully:', user_id);
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        // Comprehensive error logging
        console.error('Error in api/update-user-account endpoint:', error);
        // Send proper JSON error response
        res.status(500).json({
            success: false,
            message: 'Failed to update user: ' + error.message
        });
    }
});












// User registration endpoint---kh
app.post('/api/register', async (req, res) => {
    try {
        const { first_name, last_name, user_id, email, password, role } = req.body;
        
        // Basic validation
        if (!first_name || !last_name || !user_id || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Validate password format (6 digits followed by 2 alphabets)
        const passwordRegex = /^[0-9]{6}[a-z]{2}/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must start with 6 digits followed by 2 alphabets'
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if user_id already exists
        const [userIdCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );
        
        if (userIdCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'User ID already exists'
            });
        }
        
        // Check if email already exists
        const [emailCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE email = ?',
            [email]
        );
        
        if (emailCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'Email already in use'
            });
        }
        
        // Map roles to the format used in your database
        let dbRole = 'home_owner'; // Default
        if (role === 'homeowner') dbRole = 'home_owner';
        if (role === 'admin') dbRole = 'user_admin'; 
        if (role === 'cleaner') dbRole = 'cleaner';
        if (role === 'platformmanagement') dbRole = 'platform_management';
        
        // Insert the new user
        await connection.execute(
            'INSERT INTO user_accounts (user_id, email, password, first_name, last_name, roles) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, email, password, first_name, last_name, dbRole]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'User registered successfully',
            user_id
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register user: ' + error.message
        });
    }
});



//kh added for home owner-start
// Get all services
app.get('/api/services', async (req, res) => {
    try {
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM services');
        await connection.end();

        // Format the services to match the expected structure in the client
        const services = rows.map(service => ({
            id: service.id,
            title: service.title,
            category: service.category,
            price: parseFloat(service.price),
            description: service.description,
            image: service.image_url,
            provider: {
                name: service.provider_name,
                avatar: service.provider_avatar
            }
        }));

        res.json({
            success: true,
            services: services
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services',
            error: error.message
        });
    }
});

// Get a specific service by ID
app.get('/api/services/:id', async (req, res) => {
    try {
        const serviceId = req.params.id;
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT * FROM services WHERE id = ?',
            [serviceId]
        );
        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Format the service to match the expected structure in the client
        const service = {
            id: rows[0].id,
            title: rows[0].title,
            category: rows[0].category,
            price: parseFloat(rows[0].price),
            description: rows[0].description,
            image: rows[0].image_url,
            provider: {
                name: rows[0].provider_name,
                avatar: rows[0].provider_avatar
            }
        };

        res.json({
            success: true,
            service: service
        });
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch service',
            error: error.message
        });
    }
});

// Search services by keyword
app.get('/api/services/search', async (req, res) => {
    try {
        const keyword = req.query.keyword || '';
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT * FROM services WHERE title LIKE ? OR description LIKE ? OR category LIKE ? OR provider_name LIKE ?',
            [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        );
        await connection.end();

        // Format the services to match the expected structure in the client
        const services = rows.map(service => ({
            id: service.id,
            title: service.title,
            category: service.category,
            price: parseFloat(service.price),
            description: service.description,
            image: service.image_url,
            provider: {
                name: service.provider_name,
                avatar: service.provider_avatar
            }
        }));

        res.json({
            success: true,
            services: services
        });
    } catch (error) {
        console.error('Error searching services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search services',
            error: error.message
        });
    }
});

// Filter services by category
app.get('/api/services/filter/:category', async (req, res) => {
    try {
        const category = req.params.category;
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        let query = 'SELECT * FROM services';
        const params = [];
        
        if (category !== 'all') {
            query += ' WHERE category = ?';
            params.push(category);
        }
        
        const [rows] = await connection.execute(query, params);
        await connection.end();

        // Format the services to match the expected structure in the client
        const services = rows.map(service => ({
            id: service.id,
            title: service.title,
            category: service.category,
            price: parseFloat(service.price),
            description: service.description,
            image: service.image_url,
            provider: {
                name: service.provider_name,
                avatar: service.provider_avatar
            }
        }));

        res.json({
            success: true,
            services: services
        });
    } catch (error) {
        console.error('Error filtering services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to filter services',
            error: error.message
        });
    }
});

// Get user's shortlist
app.get('/api/shortlist/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(
            `SELECT s.* 
             FROM services s
             JOIN shortlists sl ON s.id = sl.service_id
             WHERE sl.user_id = ?`,
            [userId]
        );
        await connection.end();

        // Format the services to match the expected structure in the client
        const services = rows.map(service => ({
            id: service.id,
            title: service.title,
            category: service.category,
            price: parseFloat(service.price),
            description: service.description,
            image: service.image_url,
            provider: {
                name: service.provider_name,
                avatar: service.provider_avatar
            }
        }));

        res.json({
            success: true,
            services: services
        });
    } catch (error) {
        console.error('Error fetching shortlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch shortlist',
            error: error.message
        });
    }
});

// Add service to shortlist
app.post('/api/shortlist/add', async (req, res) => {
    try {
        const { userId, serviceId } = req.body;
        
        if (!userId || !serviceId) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Service ID are required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if service exists
        const [serviceCheck] = await connection.execute(
            'SELECT * FROM services WHERE id = ?',
            [serviceId]
        );
        
        if (serviceCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }
        
        // Check if already in shortlist
        const [shortlistCheck] = await connection.execute(
            'SELECT * FROM shortlists WHERE user_id = ? AND service_id = ?',
            [userId, serviceId]
        );
        
        if (shortlistCheck.length > 0) {
            await connection.end();
            return res.json({
                success: true,
                message: 'Service already in shortlist'
            });
        }
        
        // Add to shortlist
        await connection.execute(
            'INSERT INTO shortlists (user_id, service_id) VALUES (?, ?)',
            [userId, serviceId]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Service added to shortlist'
        });
    } catch (error) {
        console.error('Error adding to shortlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add to shortlist',
            error: error.message
        });
    }
});

// Remove service from shortlist
app.post('/api/shortlist/remove', async (req, res) => {
    try {
        const { userId, serviceId } = req.body;
        
        if (!userId || !serviceId) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Service ID are required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Remove from shortlist
        await connection.execute(
            'DELETE FROM shortlists WHERE user_id = ? AND service_id = ?',
            [userId, serviceId]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Service removed from shortlist'
        });
    } catch (error) {
        console.error('Error removing from shortlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove from shortlist',
            error: error.message
        });
    }
});

// Clear entire shortlist
app.post('/api/shortlist/clear', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Clear shortlist
        await connection.execute(
            'DELETE FROM shortlists WHERE user_id = ?',
            [userId]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Shortlist cleared'
        });
    } catch (error) {
        console.error('Error clearing shortlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear shortlist',
            error: error.message
        });
    }
});

// Create a booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { userId, serviceId, date, time, address, notes } = req.body;
        
        // Basic validation
        if (!userId || !serviceId || !date || !time || !address) {
            return res.status(400).json({
                success: false,
                message: 'User ID, Service ID, date, time, and address are required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if service exists
        const [serviceCheck] = await connection.execute(
            'SELECT * FROM services WHERE id = ?',
            [serviceId]
        );
        
        if (serviceCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }
        
        // Create booking
        await connection.execute(
            'INSERT INTO bookings (user_id, service_id, booking_date, booking_time, address, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, serviceId, date, time, address, notes || null]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Booking created successfully'
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message
        });
    }
});




//kh added for home owner-end

//kh added for cleaner- start
// API endpoints for service views and shortlists tracking

// Increment service view count
app.post('/api/services/:id/view', async (req, res) => {
    try {
        const serviceId = req.params.id;
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // First check if the service exists
        const [serviceCheck] = await connection.execute(
            'SELECT * FROM services WHERE id = ?',
            [serviceId]
        );
        
        if (serviceCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }
        
        // Update view count (if view_count column exists) or add it
        await connection.execute(
            'UPDATE services SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?',
            [serviceId]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'View count incremented'
        });
    } catch (error) {
        console.error('Error incrementing view count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to increment view count',
            error: error.message
        });
    }
});

// Get booking history for a cleaner
app.get('/api/cleaner/bookings/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`Fetching bookings for provider: ${userId}`); // Added debug log
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Add these debug checks
        const [userCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [userId]
        );
        console.log(`User found: ${userCheck.length > 0 ? 'Yes' : 'No'}`);
        
        const [serviceCheck] = await connection.execute(
            'SELECT COUNT(*) as count FROM services WHERE provider_id = ?',
            [userId]
        );
        console.log(`Services count: ${serviceCheck[0].count}`);
        
        // Keep your existing query
        const [bookings] = await connection.execute(`
            SELECT b.*, 
                   s.title as service_title, 
                   s.price as service_price,
                   ua.first_name as customer_first_name,
                   ua.last_name as customer_last_name
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN user_accounts ua ON b.user_id = ua.user_id
            WHERE s.provider_id = ?
            ORDER BY b.booking_date DESC, b.booking_time DESC
        `, [userId]);
        
        console.log(`Bookings found: ${bookings.length}`); // Added debug log
        
        // Add this additional debug if no bookings found
        if (bookings.length === 0) {
            const [allBookings] = await connection.execute('SELECT COUNT(*) as count FROM bookings');
            console.log(`Total bookings in system: ${allBookings[0].count}`);
        }
        
        await connection.end();
        
        res.json({
            success: true,
            bookings: bookings
        });
    } catch (error) {
        console.error('Error fetching cleaner bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
});

app.get('/api/user/bookings/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`Trying alternative booking fetch for user: ${userId}`);
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // This query looks for bookings where this user is the customer
        const [bookings] = await connection.execute(`
            SELECT b.*, 
                   s.title as service_title, 
                   s.price as service_price,
                   ua.first_name as provider_first_name,
                   ua.last_name as provider_last_name
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN user_accounts ua ON s.provider_id = ua.user_id
            WHERE b.user_id = ?
            ORDER BY b.booking_date DESC, b.booking_time DESC
        `, [userId]);
        
        console.log(`Alternative query found ${bookings.length} bookings`);
        
        await connection.end();
        
        res.json({
            success: true,
            bookings: bookings
        });
    } catch (error) {
        console.error('Error in alternative booking fetch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
});

// Search booking history for a cleaner
app.get('/api/cleaner/bookings/search/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const searchTerm = req.query.term || '';
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Search bookings by various criteria
        const [bookings] = await connection.execute(`
            SELECT b.*, 
                   s.title as service_title, 
                   s.price as service_price,
                   ua.first_name as customer_first_name,
                   ua.last_name as customer_last_name
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN user_accounts ua ON b.user_id = ua.user_id
            WHERE s.provider_id = ?
            AND (
                s.title LIKE ? OR
                ua.first_name LIKE ? OR
                ua.last_name LIKE ? OR
                b.address LIKE ? OR
                b.notes LIKE ? OR
                b.booking_date LIKE ? OR
                b.booking_time LIKE ?
            )
            ORDER BY b.booking_date DESC, b.booking_time DESC
        `, [
            userId,
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `%${searchTerm}%`
        ]);
        
        await connection.end();
        
        res.json({
            success: true,
            bookings: bookings
        });
    } catch (error) {
        console.error('Error searching cleaner bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search bookings',
            error: error.message
        });
    }
});

// Get cleaner's services with view and shortlist counts
app.get('/api/cleaner/services/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Get all services provided by this cleaner
        const [services] = await connection.execute(`
            SELECT s.*,
                   COALESCE(s.view_count, 0) as views,
                   (SELECT COUNT(*) FROM shortlists sl WHERE sl.service_id = s.id) as shortlists
            FROM services s
            WHERE s.provider_id = ?
            ORDER BY s.id DESC
        `, [userId]);
        
        await connection.end();
        
        // Format the services to match the expected structure in the client
        const formattedServices = services.map(service => ({
            id: service.id,
            title: service.title,
            category: service.category,
            price: parseFloat(service.price),
            description: service.description,
            image: service.image_url,
            views: parseInt(service.views || 0),
            shortlists: parseInt(service.shortlists || 0),
            provider: {
                name: service.provider_name,
                avatar: service.provider_avatar
            }
        }));
        
        res.json({
            success: true,
            services: formattedServices
        });
    } catch (error) {
        console.error('Error fetching cleaner services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services',
            error: error.message
        });
    }
});


// Create a new service
app.post('/api/services', async (req, res) => {
    try {
        console.log("Received service data:", req.body); // Add this line to debug
        
        const { title, category, price, description, image_url, provider_id, provider_name } = req.body;
        
        // Basic validation
        if (!title || !category || !price) {
            return res.status(400).json({
                success: false,
                message: 'Title, category, and price are required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Insert the new service
        const [result] = await connection.execute(
            'INSERT INTO services (title, category, price, description, image_url, provider_id, provider_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                title, 
                category, 
                parseFloat(price), 
                description || null, 
                image_url || null, // Use the correct variable name here
                provider_id, 
                provider_name
            ]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Service added successfully',
            serviceId: result.insertId
        });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create service',
            error: error.message
        });
    }
});

// Delete a service
app.delete('/api/services/:id', async (req, res) => {
    try {
        const serviceId = req.params.id;
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if service exists
        const [existingService] = await connection.execute(
            'SELECT * FROM services WHERE id = ?',
            [serviceId]
        );
        
        if (existingService.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }
        
        // Check if the service belongs to the user (optional)
        // const userId = req.query.user_id;
        // if (userId && existingService[0].provider_id !== userId) {
        //     await connection.end();
        //     return res.status(403).json({
        //         success: false,
        //         message: 'You can only delete your own services'
        //     });
        // }
        
        // Delete the service
        await connection.execute(
            'DELETE FROM services WHERE id = ?',
            [serviceId]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete service',
            error: error.message
        });
    }
});

// Update an existing service
app.put('/api/services/:id', async (req, res) => {
    try {
        const serviceId = req.params.id;
        const { title, category, price, description, image_url, provider_id, provider_name } = req.body;
        
        // Basic validation
        if (!title || !category || !price) {
            return res.status(400).json({
                success: false,
                message: 'Title, category, and price are required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if service exists
        const [existingService] = await connection.execute(
            'SELECT * FROM services WHERE id = ?',
            [serviceId]
        );
        
        if (existingService.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }
        
        // Update the service
        await connection.execute(
            'UPDATE services SET title = ?, category = ?, price = ?, description = ?, image_url = ?, provider_id = ?, provider_name = ? WHERE id = ?',
            [
                title,
                category,
                parseFloat(price),
                description || null,
                image_url || null, // Use image_url here to match your form field name
                provider_id,
                provider_name,
                serviceId
            ]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Service updated successfully'
        });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update service',
            error: error.message
        });
    }
});
//kh added for cleaner-end


// kh added for platform management-start

// Categories API endpoints
// Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM categories ORDER BY id DESC');
        await connection.end();

        res.json({
            success: true,
            categories: rows
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
});


// Search categories endpoint
app.get('/api/categories/search', async (req, res) => {
    try {
        const searchTerm = req.query.term;
        
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Use LIKE for case-insensitive search
        const [rows] = await connection.execute(
            'SELECT * FROM categories WHERE name LIKE ? OR description LIKE ? ORDER BY id DESC',
            [`%${searchTerm}%`, `%${searchTerm}%`]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            categories: rows
        });
    } catch (error) {
        console.error('Error searching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search categories',
            error: error.message
        });
    }
});


// Get a single category by ID
app.get('/api/categories/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );
        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            category: rows[0]
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category',
            error: error.message
        });
    }
});

// Create a new category - improved with icon URL handling
app.post('/api/categories', async (req, res) => {
    try {
        const { name, description, status, icon } = req.body;
        
        console.log('Received category data:', req.body); // Log the received data for debugging
        
        // Basic validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if category name already exists
        const [nameCheck] = await connection.execute(
            'SELECT * FROM categories WHERE name = ?',
            [name]
        );
        
        if (nameCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'Category name already exists'
            });
        }
        
        // Insert the new category - ensure icon is properly handled
        const [result] = await connection.execute(
            'INSERT INTO categories (name, description, status, icon) VALUES (?, ?, ?, ?)',
            [name, description || null, status || 'active', icon || null]
        );
        
        // Get the newly created category
        const [newCategory] = await connection.execute(
            'SELECT * FROM categories WHERE id = ?',
            [result.insertId]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Category added successfully',
            category: newCategory[0]
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
});


// Update a category - improved with icon URL handling
app.put('/api/categories/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, description, status, icon } = req.body;
        
        console.log('Updating category:', categoryId, 'with data:', req.body); // Log for debugging
        
        // Basic validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if category exists
        const [existingCategory] = await connection.execute(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );
        
        if (existingCategory.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        // Check if the new name conflicts with another category
        const [nameCheck] = await connection.execute(
            'SELECT * FROM categories WHERE name = ? AND id != ?',
            [name, categoryId]
        );
        
        if (nameCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'Category name already exists'
            }); 
        }
        
        // Update the category - ensure icon is properly handled
        await connection.execute(
            'UPDATE categories SET name = ?, description = ?, status = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, description || null, status || 'active', icon || null, categoryId]
        );
        
        // Get the updated category
        const [updatedCategory] = await connection.execute(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Category updated successfully',
            category: updatedCategory[0]
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category',
            error: error.message
        });
    }
});

// Delete a category
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if category exists
        const [existingCategory] = await connection.execute(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );
        
        if (existingCategory.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        // Optional: Check if category is in use by any services
        // This depends on your database structure
        // For example:
        // const [servicesUsingCategory] = await connection.execute(
        //     'SELECT COUNT(*) as count FROM services WHERE category_id = ?',
        //     [categoryId]
        // );
        // 
        // if (servicesUsingCategory[0].count > 0) {
        //     await connection.end();
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Cannot delete category that is being used by services'
        //     });
        // }
        
        // Delete the category
        await connection.execute(
            'DELETE FROM categories WHERE id = ?',
            [categoryId]
        );
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message
        });
    }
});


// API endpoint for daily reports
app.get('/api/reports/daily', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const result = await getDailyReportData(date);
        res.json(result);
    } catch (error) {
        console.error('Error in daily report endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate daily report',
            error: error.message
        });
    }
});

// API endpoint for weekly reports
app.get('/api/reports/weekly', async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate || startDate;
        
        if (!startDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date is required'
            });
        }
        
        const result = await getWeeklyReportData(startDate, endDate);
        res.json(result);
    } catch (error) {
        console.error('Error in weekly report endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate weekly report',
            error: error.message
        });
    }
});

// API endpoint for monthly reports
app.get('/api/reports/monthly', async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate || startDate;
        
        if (!startDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date is required'
            });
        }
        
        const result = await getMonthlyReportData(startDate, endDate);
        res.json(result);
    } catch (error) {
        console.error('Error in monthly report endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate monthly report',
            error: error.message
        });
    }
});


// Query function for daily reports - simplified version without rating
async function getDailyReportData(date) {
    console.log("getDailyReportData called with date:", date);
    
    try {
        // Connect to your database
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Get total bookings and revenue for the date
        const [totals] = await connection.execute(`
            SELECT COUNT(*) as totalBookings, 
                   SUM(s.price) as totalRevenue
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE DATE(b.booking_date) = ?
        `, [date]);
        
        // Get category-specific stats
        const [categoryStats] = await connection.execute(`
            SELECT c.id, c.name, c.icon, 
                   COUNT(b.id) as bookings, 
                   SUM(s.price) as revenue
            FROM categories c
            LEFT JOIN services s ON c.name = s.category
            LEFT JOIN bookings b ON s.id = b.service_id AND DATE(b.booking_date) = ?
            GROUP BY c.id, c.name, c.icon
        `, [date]);
        
        // Make sure we have at least one category for the frontend
        const processedCategories = categoryStats && categoryStats.length > 0 
            ? categoryStats.map(cat => ({
                id: cat.id || 0,
                name: cat.name || "Uncategorized",
                icon: cat.icon || "📋",
                bookings: parseInt(cat.bookings || 0),
                revenue: parseFloat(cat.revenue || 0)
              }))
            : [{ // Default placeholder category if none found
                id: 0,
                name: "No Categories", 
                icon: "📋",
                bookings: 0,
                revenue: 0
              }];
              
        return {
            success: true,
            data: {
                date: date || new Date().toISOString().split('T')[0],
                totalBookings: totals[0] ? parseInt(totals[0].totalBookings || 0) : 0,
                totalRevenue: totals[0] ? parseFloat(totals[0].totalRevenue || 0) : 0,
                categories: processedCategories
            }
        };
    } catch (error) {
        console.error("Error in getDailyReportData:", error);
        return {
            success: false,
            message: `Error generating daily report: ${error.message}`,
            data: {
                date: date || new Date().toISOString().split('T')[0],
                totalBookings: 0,
                totalRevenue: 0,
                categories: [{
                    id: 0,
                    name: "Error Loading Data",
                    icon: "❌",
                    bookings: 0,
                    revenue: 0
                }]
            }
        };
    }
}
// Similar simplified approach for other report functions
// Query function for weekly reports
async function getWeeklyReportData(startDate, endDate) {
    console.log("getWeeklyReportData called with dates:", startDate, endDate);
    
    try {
        // Connect to your database
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Get total bookings and revenue for the week
        const [totals] = await connection.execute(`
            SELECT COUNT(*) as totalBookings, 
                   SUM(s.price) as totalRevenue
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE DATE(b.booking_date) BETWEEN ? AND ?
        `, [startDate, endDate]);
        
        // Get daily data for the week
        const [dailyData] = await connection.execute(`
            SELECT DATE(b.booking_date) as date,
                   COUNT(*) as totalBookings,
                   SUM(s.price) as totalRevenue
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE DATE(b.booking_date) BETWEEN ? AND ?
            GROUP BY DATE(b.booking_date)
            ORDER BY DATE(b.booking_date)
        `, [startDate, endDate]);
        
        // Get category-specific stats for the week
        const [categoryStats] = await connection.execute(`
            SELECT c.id, c.name, c.icon, 
                   COUNT(b.id) as bookings, 
                   SUM(s.price) as revenue
            FROM categories c
            LEFT JOIN services s ON c.name = s.category
            LEFT JOIN bookings b ON s.id = b.service_id AND DATE(b.booking_date) BETWEEN ? AND ?
            GROUP BY c.id, c.name, c.icon
        `, [startDate, endDate]);
        
        // Process daily data to ensure all days in range have entries
        const processedDailyData = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
            const dateStr = day.toISOString().split('T')[0];
            const dayData = dailyData.find(d => d.date.toISOString().split('T')[0] === dateStr);
            
            processedDailyData.push({
                date: dateStr,
                totalBookings: dayData ? parseInt(dayData.totalBookings) : 0,
                totalRevenue: dayData ? parseFloat(dayData.totalRevenue) : 0
            });
        }
        
        // Process category data
        const processedCategories = categoryStats && categoryStats.length > 0 
            ? categoryStats.map(cat => ({
                id: cat.id || 0,
                name: cat.name || "Uncategorized",
                icon: cat.icon || "📋",
                bookings: parseInt(cat.bookings || 0),
                revenue: parseFloat(cat.revenue || 0)
              }))
            : [{ // Default placeholder category if none found
                id: 0,
                name: "No Categories", 
                icon: "📋",
                bookings: 0,
                revenue: 0
              }];
        
        return {
            success: true,
            data: {
                startDate: startDate,
                endDate: endDate,
                totalBookings: totals[0] ? parseInt(totals[0].totalBookings || 0) : 0,
                totalRevenue: totals[0] ? parseFloat(totals[0].totalRevenue || 0) : 0,
                dailyData: processedDailyData,
                categories: processedCategories
            }
        };
    } catch (error) {
        console.error("Error in getWeeklyReportData:", error);
        return {
            success: false,
            message: `Error generating weekly report: ${error.message}`,
            data: {
                startDate: startDate,
                endDate: endDate,
                totalBookings: 0,
                totalRevenue: 0,
                dailyData: [],
                categories: [{
                    id: 0,
                    name: "Error Loading Data",
                    icon: "❌",
                    bookings: 0,
                    revenue: 0
                }]
            }
        };
    }
}

// Query function for monthly reports
async function getMonthlyReportData(startDate, endDate) {
    console.log("getMonthlyReportData called with dates:", startDate, endDate);
    
    try {
        // Connect to your database
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Extract month and year from the start date
        const currentMonth = new Date(startDate);
        const currentYear = currentMonth.getFullYear();
        const currentMonthNum = currentMonth.getMonth();
        
        // Calculate previous month dates
        const previousMonth = new Date(currentMonth);
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        const previousMonthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
        const previousMonthEnd = new Date(currentYear, currentMonthNum, 0);
        
        // Format dates for SQL
        const prevStart = previousMonthStart.toISOString().split('T')[0];
        const prevEnd = previousMonthEnd.toISOString().split('T')[0];
        
        // Get data for current month
        const [currentMonthData] = await connection.execute(`
            SELECT COUNT(*) as totalBookings, 
                   SUM(s.price) as totalRevenue
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE DATE(b.booking_date) BETWEEN ? AND ?
        `, [startDate, endDate]);
        
        // Get data for previous month
        const [previousMonthData] = await connection.execute(`
            SELECT COUNT(*) as totalBookings, 
                   SUM(s.price) as totalRevenue
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE DATE(b.booking_date) BETWEEN ? AND ?
        `, [prevStart, prevEnd]);
        
        // Get current month category stats
        const [currentCategoryStats] = await connection.execute(`
            SELECT c.id, c.name, c.icon, 
                   COUNT(b.id) as bookings, 
                   SUM(s.price) as revenue
            FROM categories c
            LEFT JOIN services s ON c.name = s.category
            LEFT JOIN bookings b ON s.id = b.service_id AND DATE(b.booking_date) BETWEEN ? AND ?
            GROUP BY c.id, c.name, c.icon
        `, [startDate, endDate]);
        
        // Get previous month category stats
        const [prevCategoryStats] = await connection.execute(`
            SELECT c.id, c.name, c.icon, 
                   COUNT(b.id) as bookings, 
                   SUM(s.price) as revenue
            FROM categories c
            LEFT JOIN services s ON c.name = s.category
            LEFT JOIN bookings b ON s.id = b.service_id AND DATE(b.booking_date) BETWEEN ? AND ?
            GROUP BY c.id, c.name, c.icon
        `, [prevStart, prevEnd]);
        
        // Process data for the response
        const curTotalBookings = currentMonthData[0] ? parseInt(currentMonthData[0].totalBookings || 0) : 0;
        const curTotalRevenue = currentMonthData[0] ? parseFloat(currentMonthData[0].totalRevenue || 0) : 0;
        const prevTotalBookings = previousMonthData[0] ? parseInt(previousMonthData[0].totalBookings || 0) : 0;
        const prevTotalRevenue = previousMonthData[0] ? parseFloat(previousMonthData[0].totalRevenue || 0) : 0;
        
        // Calculate growth percentages
        const bookingGrowth = prevTotalBookings === 0 ? 100 : 
            ((curTotalBookings - prevTotalBookings) / prevTotalBookings * 100).toFixed(1);
        const revenueGrowth = prevTotalRevenue === 0 ? 100 : 
            ((curTotalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(1);
        
        // Process category data with growth calculations
        const allCategoryIds = new Set([
            ...currentCategoryStats.map(c => c.id),
            ...prevCategoryStats.map(c => c.id)
        ]);
        
        const processedCategories = [];
        allCategoryIds.forEach(id => {
            const curCat = currentCategoryStats.find(c => c.id === id) || {
                id: id,
                name: "Unknown",
                icon: "❓",
                bookings: 0,
                revenue: 0
            };
            
            const prevCat = prevCategoryStats.find(c => c.id === id) || {
                id: id,
                bookings: 0,
                revenue: 0
            };
            
            const bookingsGrowth = prevCat.bookings === 0 ? 100 : 
                ((curCat.bookings - prevCat.bookings) / prevCat.bookings * 100).toFixed(1);
            const revenueGrowth = prevCat.revenue === 0 ? 100 : 
                ((curCat.revenue - prevCat.revenue) / prevCat.revenue * 100).toFixed(1);
            
            processedCategories.push({
                id: id,
                name: curCat.name,
                icon: curCat.icon,
                currentBookings: parseInt(curCat.bookings || 0),
                previousBookings: parseInt(prevCat.bookings || 0),
                bookingGrowth: bookingsGrowth,
                currentRevenue: parseFloat(curCat.revenue || 0),
                previousRevenue: parseFloat(prevCat.revenue || 0),
                revenueGrowth: revenueGrowth
            });
        });
        
        // Sort by revenue growth for better display
        processedCategories.sort((a, b) => b.revenueGrowth - a.revenueGrowth);
        
        return {
            success: true,
            data: {
                startDate: startDate,
                endDate: endDate,
                prevStartDate: prevStart,
                prevEndDate: prevEnd,
                currentMonth: {
                    totalBookings: curTotalBookings,
                    totalRevenue: curTotalRevenue
                },
                previousMonth: {
                    totalBookings: prevTotalBookings,
                    totalRevenue: prevTotalRevenue
                },
                bookingGrowth: bookingGrowth,
                revenueGrowth: revenueGrowth,
                categories: processedCategories
            }
        };
    } catch (error) {
        console.error("Error in getMonthlyReportData:", error);
        return {
            success: false,
            message: `Error generating monthly report: ${error.message}`,
            data: {
                startDate: startDate,
                endDate: endDate,   
                currentMonth: { totalBookings: 0, totalRevenue: 0 },
                previousMonth: { totalBookings: 0, totalRevenue: 0 },
                bookingGrowth: 0,
                revenueGrowth: 0,
                categories: [{
                    id: 0,
                    name: "Error Loading Data",
                    icon: "❌",
                    currentBookings: 0,
                    previousBookings: 0,
                    bookingGrowth: 0,
                    currentRevenue: 0,
                    previousRevenue: 0,
                    revenueGrowth: 0
                }]
            }
        };
    }
}

// Simple authentication middleware - if this doesn't exist yet
function authenticateUser(req, res, next) {
    // This is a placeholder - implement your actual authentication logic here
    // For example, check for a valid JWT token in the Authorization header
    
    // For testing purposes, let's just allow all requests through
    next();
    
    // In a real implementation, you would verify authentication and call next()
    // only if the user is authenticated, otherwise return a 401 Unauthorized response
}
//kh added for platform management-end







// Add this to your server.js to test if the server is properly handling requests
app.get('/test-endpoint', (req, res) => {
    res.json({ success: true, message: 'Server is properly responding to requests' });
});

// Also add a POST version to test POST requests specifically
app.post('/test-post', (req, res) => {
    res.json({ 
        success: true, 
        message: 'POST request successful',
        receivedData: req.body 
    });
});


// Suspension Code
// Toggle user suspension status endpoint
app.post('/api/toggle-suspension', async (req, res) => {
    try {
        const { user_id, isSuspended } = req.body;
        
        // Basic validation
        if (user_id === undefined || isSuspended === undefined) {
            return res.status(400).json({
                success: false,
                message: 'User ID and suspension status are required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );
        
        if (existingUser.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update user suspension status
        await connection.execute(
            'UPDATE user_accounts SET isSuspended = ? WHERE user_id = ?',
            [isSuspended, user_id]
        );
        
        await connection.end();
        
        console.log(`User ${user_id} suspension status updated to: ${isSuspended}`);
        res.json({
            success: true,
            message: `User ${isSuspended ? 'suspended' : 'unsuspended'} successfully`
        });
    } catch (error) {
        console.error('Error in toggle-suspension endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update suspension status: ' + error.message
        });
    }
});
















// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});