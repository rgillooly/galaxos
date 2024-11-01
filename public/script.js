let devMode = false; // Development mode flag
let isLoggedIn = false; // Track the user's login state

// Check login status and toggle button visibility
function checkLoginStatus() {
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    // Update login state based on the existence of an auth token
    isLoggedIn = !!authToken; // Set isLoggedIn to true if authToken exists

    // Set visibility based on login state
    if (isLoggedIn) {
        document.getElementById('login-container').style.display = 'none'; // Hide the login form
        document.getElementById('logout-container').style.display = 'block'; // Show the logout button
    } else {
        document.getElementById('login-container').style.display = 'block'; // Show the login form
        document.getElementById('logout-container').style.display = 'none'; // Hide the logout button
    }
}

// Call this function on page load to set up the login/logout button
window.onload = checkLoginStatus;

// Handle login and logout actions with separate functions
async function handleAuth() {
    if (isLoggedIn) {
        await logoutUser(); // If logged in, call the logout function
    } else {
        showLoginForm(); // If not logged in, show the login form
    }
}

// Function to log out the user
async function logoutUser() {
    if (confirm("Are you sure you want to log out?")) {
        // Clear tokens and cookies on logout
        localStorage.removeItem('authToken');
        sessionStorage.clear();

        document.cookie.split(";").forEach((cookie) => {
            document.cookie = cookie
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
        });

        isLoggedIn = false; // Update login state
        checkLoginStatus(); // Update the button visibility
        window.location.href = 'index.html'; // Redirect after logout
    }
}

// Function to handle login
async function handleLogin(e) {
    e.preventDefault(); // Prevent the default form submission behavior

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('Attempting to log in with:', { username, password }); // Log credentials

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        console.log('Response status:', response.status); // Log response status
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful:', data); // Log success response
            isLoggedIn = true; // Set login state to true
            localStorage.setItem('authToken', data.authToken); // Store the auth token
            checkLoginStatus(); // Update button visibility based on login state
            restoreWindows(data.openWindows); // Restore any open windows
        } else {
            const errorData = await response.json();
            console.error('Login failed:', errorData); // Log error response
            showAlert(errorData.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error logging in:', error); // Log errors in the fetch process
        showAlert('An error occurred while logging in.');
    }
}

// Display the login form
function showLoginForm() {
    document.getElementById('login-container').style.display = 'block'; // Show the login container
}

// Attach the event listener to the login form
document.getElementById('login-form').addEventListener('submit', handleLogin);

// Attach event listener to the auth button for logout
document.getElementById('logout-button').addEventListener('click', handleAuth);

// Restore windows function
function restoreWindows(openWindows) {
    if (!Array.isArray(openWindows)) {
        console.error('openWindows is not an array:', openWindows);
        return;
    }

    openWindows.forEach(windowId => {
        const button = document.querySelector(`[onclick="openWindow('${windowId}', this)"]`);
        openWindow(windowId, button);
    });
}

// Function to update open windows state on the server
async function updateOpenWindows() {
    if (!isLoggedIn) {
        console.error('User is not logged in. Cannot update open windows.');
        return; // Exit the function if the user is not logged in
    }

    const openWindows = Array.from(document.querySelectorAll('.sub-window'))
        .filter(window => window.style.display === 'block')
        .map(window => window.id);

    try {
        await fetch('/update-windows', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ openWindows })
        });
    } catch (error) {
        console.error('Failed to update open windows:', error);
    }
}

// Open window functionality
async function openWindow(windowId, button) {
    const windowElement = document.getElementById(windowId);

    if (!windowElement.dataset.loaded) {
        try {
            const response = await fetch(`${windowId}.html`);
            const html = await response.text();
            windowElement.innerHTML = html;
            windowElement.dataset.loaded = "true"; // Set as loaded

            positionWindow(windowElement, button);

            // Register event listener if it's the signup window
            if (windowId === 'window-signup') {
                const signupForm = document.getElementById('signup-form'); // Get the signup form
                if (signupForm) { // Check if the form exists
                    signupForm.addEventListener('submit', handleSignup);
                } else {
                    console.error("Signup form not found."); // Log if not found
                }
            }

        } catch (error) {
            console.error(`Error loading ${windowId}:`, error);
        }
    } else {
        positionWindow(windowElement, button);
    }

    // Only update open windows if the user is logged in
    if (isLoggedIn) {
        await updateOpenWindows(); // Update open windows after opening a new one
    }
}

// Close window function
function closeWindow(windowId) {
    document.getElementById(windowId).style.display = 'none';
}

// Function to handle signup
async function handleSignup(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    try {
        const response = await fetch('/signup', { // Change to correct endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username, 
                password
            }),
        });

        if (response.ok) {
            const result = await response.json();
            showAlert(result.message);
            closeWindow('window-signup'); // Optionally close the signup window
        } else {
            const error = await response.json();
            showAlert(error.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Error during signup:', error);
        showAlert('An error occurred while signing up.');
    }
}

// Function to pop out windows
function popOutWindow(windowId, contentToRestore) {
    const newWindow = window.open(`${windowId}.html`, "Milky Way Galaxy", "width=1800,height=1020");
    newWindow.onload = () => {
        // Transfer specific content after loading the new window
        newWindow.document.getElementById(windowId).innerHTML = contentToRestore;
        newWindow.document.head.appendChild(document.querySelector('#window-css').cloneNode(true));
    };
}

// Function to restore content in the main window
function restoreContent(contentId, newContent) {
    document.getElementById(contentId).value = newContent;
}
