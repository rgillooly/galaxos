const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session'); // Import express-session
const path = require('path'); // Import path for file serving
const User = require('./models/User'); // Ensure this path is correct
const sequelize = require('./db'); // Import the sequelize instance
require('dotenv').config();

// Sync the models with the database
sequelize.sync()
    .then(() => {
        console.log('Database & tables created!');
    })
    .catch(err => {
        console.error('Error syncing database:', err);
    });

const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable for PORT

// Middleware
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'Filmlover17', // Use environment variable for secret
    resave: false,
    saveUninitialized: true,
}));

// Serve static files if needed
app.use(express.static('public')); 
    
    // Signup route
    app.post('/signup', async (req, res) => {
        try {
            const { username, password } = req.body;
    
            // Create a new user
            const newUser = await User.create({ username, password });
            res.status(201).json({ message: 'Signup successful!', user: newUser });
        } catch (error) {
            console.error('Signup error:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ message: 'Username already exists' });
            }
            res.status(500).json({ message: 'Signup failed' });
        }
    });

    app.post('/login', async (req, res) => {
        const { username, password } = req.body;
    
        try {
            const user = await User.findOne({ where: { username } });
    
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
    
            const isPasswordValid = await bcrypt.compare(password, user.password);
    
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid password' });
            }
    
            // Store user ID in session
            req.session.user = { id: user.id, username: user.username };
    
            // Retrieve open windows from user data
            const openWindows = user.openWindows || []; // This should be an array of window IDs
    
            res.status(200).json({ message: 'Login successful', userId: user.id, openWindows });
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ message: 'An error occurred during login' });
        }
    });    

app.post('/update-windows', async (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');

    const { openWindows } = req.body; // Expecting an array of window IDs
    try {
        await User.update({ openWindows }, {
            where: {
                id: req.session.user.id // Assuming you store user ID in the session
            }
        });
        res.sendStatus(200);
    } catch (error) {
        console.error('Error updating open windows:', error);
        res.status(500).send('Error updating windows');
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.status(200).json({ message: 'Logout successful' });
    });
});

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store open windows on the server
app.post('/update-windows', (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    req.session.openWindows = req.body.openWindows; // Update session data
    res.sendStatus(200);
});

// Start the server
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
