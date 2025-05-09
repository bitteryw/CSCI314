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