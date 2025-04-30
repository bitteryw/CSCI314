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



// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});