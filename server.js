const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session'); // Import express-session
const path = require('path'); // Import path for file serving

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files

// Session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with your secret key
    resave: false,
    saveUninitialized: true,
}));

// Initialize SQLite database
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) {
                console.error(err.message);
            }
        });
    }
});

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sign-up endpoint
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Hash password for security
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ message: 'Error hashing password.' });
        }

        // Insert user into database
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ message: 'Username already taken.' });
                }
                return res.status(500).json({ message: 'Error saving user.' });
            }

            res.status(201).json({ message: 'User created successfully.' });
        });
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Query the database for the user
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            return res.status(500).send('Database error.');
        }
        if (!user) {
            return res.status(401).send('Unauthorized');
        }

        // Compare hashed password
        bcrypt.compare(password, user.password, (err, result) => {
            if (err || !result) {
                return res.status(401).send('Unauthorized');
            }

            // Store user information in session
            req.session.user = { id: user.id, username: user.username };
            req.session.openWindows = req.session.openWindows || []; // Initialize if not set
            res.json({ openWindows: req.session.openWindows });
        });
    });
});

// Store open windows on the server
app.post('/update-windows', (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');
    req.session.openWindows = req.body.openWindows; // Update session data
    res.sendStatus(200);
});

// Start the server
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
