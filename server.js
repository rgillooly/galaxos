const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session'); // Import express-session
const path = require('path'); // Import path for file serving
const { User, syncDatabase } = require('./models/user');
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
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(session({
    secret: 'Filmlover17',
    resave: false,
    saveUninitialized: true,
}));

// Serve static files if needed
app.use(express.static('public')); 

// Sign up route
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const user = await User.create({
            username,
            password: hashedPassword, // Store hashed password
            createdAt: new Date(),
            updatedAt: new Date()
        });

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        console.error('Error during signup:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Username already exists' });
        }
        res.status(500).json({ message: 'An error occurred during signup' });
    }
});

// Login route (optional)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the user by username
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        res.status(200).json({ message: 'Login successful', userId: user.id });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'An error occurred during login' });
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
