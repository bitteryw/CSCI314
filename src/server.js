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

// Database configuration
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'password', //please change if needed
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

// Get all listings
app.get('/api/listings', async (req, res) => {
    try {
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(`
            SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name 
            FROM listings l
            JOIN user_accounts u ON l.user_id = u.user_id
            ORDER BY l.created_at DESC
        `);
        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch listings',
            error: error.message
        });
    }
});

app.get('/api/listings/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(`
            SELECT l.*,
                   l.user_id,
                   u.first_name,
                   u.last_name,
                   CONCAT(u.first_name, ' ', u.last_name) as provider_name
            FROM listings l
                     LEFT JOIN user_accounts u ON l.user_id = u.user_id
            ORDER BY l.created_at DESC
        `);
        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user listings',
            error: error.message
        });
    }
});

// Create a new listing
app.post('/api/listings', async (req, res) => {
    try {
        const { title, description, price, image_path, user_id, category } = req.body;

        // Validate required fields
        if (!title || !description || !price || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, price, and user_id are required fields'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if user exists
        const [userCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        if (userCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if title already exists
        const [titleCheck] = await connection.execute(
            'SELECT * FROM listings WHERE title = ?',
            [title]
        );

        if (titleCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'A listing with this title already exists'
            });
        }

        // Get the next numeric ID
        const [maxIdResult] = await connection.execute(
            'SELECT MAX(listing_id) AS max_id FROM listings'
        );

        let nextId = 1;
        if (maxIdResult[0].max_id) {
            nextId = parseInt(maxIdResult[0].max_id) + 1;
        }

        // Make sure all values are defined (convert undefined to null)
        const category_name = category || null;
        const image_path_value = image_path || null;

        // Add this right before the INSERT query
        console.log('Values being inserted:', {
            listing_id: nextId,
            title: title,
            description: description,
            price: price,
            image_path: image_path_value,
            user_id: user_id,
            category_name: category_name
        });

        // Insert the listing
        await connection.execute(
            'INSERT INTO listings (listing_id, title, description, price, image_path, user_id, category_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nextId, title, description, price, image_path_value, user_id, category_name]
        );

        // Get user details for the response
        const [userDetails] = await connection.execute(
            'SELECT CONCAT(first_name, " ", last_name) as provider_name FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'Listing created successfully',
            data: {
                listing_id: nextId,
                title,
                description,
                price,
                image_path: image_path_value,
                user_id,
                provider_name: userDetails[0].provider_name,
                created_at: new Date(),
                category_name: category_name
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to create listing',
            error: error.message
        });
    }
});

// Update a listing
app.put('/api/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, image_path, user_id } = req.body;

        // Validate required fields
        if (!title || !description || !price || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // First check if the listing exists and belongs to the user
        const [existingListing] = await connection.execute(
            'SELECT * FROM listings WHERE listing_id = ?',
            [id]
        );

        if (existingListing.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        // Verify ownership
        if (existingListing[0].user_id !== user_id) {
            await connection.end();
            return res.status(403).json({
                success: false,
                message: 'You can only update your own listings'
            });
        }

        // Check if the new title conflicts with another listing
        if (title !== existingListing[0].title) {
            const [titleCheck] = await connection.execute(
                'SELECT * FROM listings WHERE title = ? AND listing_id != ?',
                [title, id]
            );

            if (titleCheck.length > 0) {
                await connection.end();
                return res.status(409).json({
                    success: false,
                    message: 'A listing with this title already exists'
                });
            }
        }

        // Update the listing
        await connection.execute(
            'UPDATE listings SET title = ?, description = ?, price = ?, image_path = ? WHERE listing_id = ?',
            [title, description, price, image_path || null, id]
        );

        // Get user details for the response
        const [userDetails] = await connection.execute(
            'SELECT CONCAT(first_name, " ", last_name) as provider_name FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        await connection.end();

        res.json({
            success: true,
            message: 'Listing updated successfully',
            data: {
                listing_id: parseInt(id),
                title,
                description,
                price,
                image_path,
                user_id,
                provider_name: userDetails[0].provider_name
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update listing',
            error: error.message
        });
    }
});

// Delete a listing
app.delete('/api/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query; // Get the user_id from query param

        const connection = await mysql2Promise.createConnection(dbConfig);

        // First check if the listing exists
        const [existingListing] = await connection.execute(
            'SELECT * FROM listings WHERE listing_id = ?',
            [id]
        );

        if (existingListing.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        // Verify ownership if user_id is provided
        if (user_id && existingListing[0].user_id !== user_id) {
            await connection.end();
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own listings'
            });
        }

        // Delete the listing
        await connection.execute(
            'DELETE FROM listings WHERE listing_id = ?',
            [id]
        );

        await connection.end();

        res.json({
            success: true,
            message: 'Listing deleted successfully'
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete listing',
            error: error.message
        });
    }
});

app.get('/api/listings/search', async (req, res) => {
    try {
        const query = req.query.query || '';
        const userId = req.query.userId || null;

        // Log the search request
        console.log(`Search request received - query: "${query}", userId: ${userId || 'not specified'}`);

        // Skip empty searches
        if (!query.trim()) {
            // Return all listings or user's listings if userId provided
            let sql = `
                SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name 
                FROM listings l
                JOIN user_accounts u ON l.user_id = u.user_id
            `;
            let params = [];

            if (userId) {
                sql += ' WHERE l.user_id = ?';
                params.push(userId);
            }

            sql += ' ORDER BY l.created_at DESC';

            const connection = await mysql2Promise.createConnection(dbConfig);
            const [rows] = await connection.execute(sql, params);
            await connection.end();

            return res.json({
                success: true,
                data: rows
            });
        }

        // Build the SQL query for search with wildcards
        let sql = `
            SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name 
            FROM listings l
            JOIN user_accounts u ON l.user_id = u.user_id
            WHERE (
                l.title LIKE ? OR 
                l.description LIKE ? OR 
                l.category_name LIKE ? OR 
                CAST(l.price AS CHAR) LIKE ?
            )
        `;

        // Add user filter if userId is provided
        if (userId) {
            sql += ` AND l.user_id = ?`;
        }

        // Add order by created_at for consistent sorting
        sql += ` ORDER BY l.created_at DESC`;

        // Create the search parameter (with wildcards for partial matches)
        const searchParam = `%${query}%`;

        // Set up query parameters
        let params = [searchParam, searchParam, searchParam, searchParam];

        // Add userId to params if it was provided
        if (userId) {
            params.push(userId);
        }

        // Execute the query
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(sql, params);
        await connection.end();

        console.log(`Search found ${rows.length} results`);

        // Return the results
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search listings',
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

// Add these endpoints to your server.js file

// Get shortlisted listings for a user
app.get('/api/shortlist/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const connection = await mysql2Promise.createConnection(dbConfig);

        const [rows] = await connection.execute(`
            SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name, 
                   s.created_at as shortlisted_at
            FROM shortlisted_listings s
            JOIN listings l ON s.listing_id = l.listing_id
            JOIN user_accounts u ON l.user_id = u.user_id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
        `, [userId]);

        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch shortlisted listings',
            error: error.message
        });
    }
});

// Add a listing to shortlist
app.post('/api/shortlist', async (req, res) => {
    try {
        const { user_id, listing_id } = req.body;

        // Validate required fields
        if (!user_id || !listing_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Listing ID are required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if the listing exists
        const [listingCheck] = await connection.execute(
            'SELECT * FROM listings WHERE listing_id = ?',
            [listing_id]
        );

        if (listingCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        // Check if user exists
        const [userCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        if (userCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if already shortlisted
        const [existingShortlist] = await connection.execute(
            'SELECT * FROM shortlisted_listings WHERE user_id = ? AND listing_id = ?',
            [user_id, listing_id]
        );

        if (existingShortlist.length > 0) {
            await connection.end();
            return res.status(200).json({
                success: true,
                message: 'Listing is already in shortlist',
                isShortlisted: true
            });
        }

        // Add to shortlist
        await connection.execute(
            'INSERT INTO shortlisted_listings (user_id, listing_id) VALUES (?, ?)',
            [user_id, listing_id]
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'Listing added to shortlist',
            isShortlisted: true
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add listing to shortlist',
            error: error.message
        });
    }
});

// Remove a listing from shortlist
app.delete('/api/shortlist', async (req, res) => {
    try {
        const { user_id, listing_id } = req.body;

        // Validate required fields
        if (!user_id || !listing_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Listing ID are required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Delete from shortlist
        await connection.execute(
            'DELETE FROM shortlisted_listings WHERE user_id = ? AND listing_id = ?',
            [user_id, listing_id]
        );

        await connection.end();

        res.json({
            success: true,
            message: 'Listing removed from shortlist',
            isShortlisted: false
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove listing from shortlist',
            error: error.message
        });
    }
});

// Check if a listing is shortlisted by a user
app.get('/api/shortlist/check', async (req, res) => {
    try {
        const { user_id, listing_id } = req.query;

        // Validate required fields
        if (!user_id || !listing_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Listing ID are required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if shortlisted
        const [rows] = await connection.execute(
            'SELECT * FROM shortlisted_listings WHERE user_id = ? AND listing_id = ?',
            [user_id, listing_id]
        );

        await connection.end();

        res.json({
            success: true,
            isShortlisted: rows.length > 0
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check shortlist status',
            error: error.message
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

// CREATE TABLE shortlisted_listings (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id VARCHAR(50) NOT NULL,
//   listing_id INT NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   UNIQUE KEY unique_shortlist (user_id, listing_id),
//   FOREIGN KEY (user_id) REFERENCES user_accounts(user_id),
//   FOREIGN KEY (listing_id) REFERENCES listings(listing_id)
// );