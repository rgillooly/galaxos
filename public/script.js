let devMode = false; // Development mode flag
let isLoggedIn = false; // Track the user's login state

// Login form handling
document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            isLoggedIn = true; // Set login state to true
            restoreWindows(data.openWindows); // Restore windows after successful login
        } else {
            alert('Login failed');
        }
    } catch (error) {
        console.error('Error logging in:', error);
    }
});

// Set the window position relative to the clicked button
function positionWindow(windowElement, button) {
    if (!button) {
        console.error("Positioning failed: button is undefined.");
        return;
    }

    const rect = button.getBoundingClientRect();
    windowElement.style.top = (rect.top + window.scrollY + 10) + "px";
    windowElement.style.left = (rect.left + window.scrollX + 10) + "px";
    windowElement.style.display = 'block';
}

// Function to enable dragging of elements
function dragElement(event, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    let offsetX = event.clientX - element.getBoundingClientRect().left;
    let offsetY = event.clientY - element.getBoundingClientRect().top;

    document.onmousemove = (e) => {
        element.style.top = (e.clientY - offsetY + window.scrollY) + "px";
        element.style.left = (e.clientX - offsetX + window.scrollX) + "px";

        if (devMode) {
            const cursorCoords = calculateCursorCoordinates(element, e.clientX, e.clientY);
            document.getElementById('cursor-percent').innerText = cursorCoords;
        }
    };

    document.onmouseup = () => {
        document.onmousemove = null;
        document.onmouseup = null;
    };
}

// Toggle Development Mode
function toggleDevMode() {
    devMode = !devMode;
    document.getElementById('cursor-position').style.display = devMode ? 'block' : 'none';
}

// Calculate cursor position in pixels relative to the window's top-left corner
function calculateCursorCoordinates(element, clientX, clientY) {
    const rect = element.getBoundingClientRect();
    const xPixels = clientX - rect.left;
    const yPixels = clientY - rect.top;
    return `X: ${xPixels}px, Y: ${yPixels}px`;
}

// Update cursor position display only if devMode is active
document.querySelectorAll('.sub-window').forEach(window => {
    window.addEventListener('mousemove', (e) => {
        if (devMode) {
            const cursorCoords = calculateCursorCoordinates(window, e.clientX, e.clientY);
            document.getElementById('cursor-percent').innerText = cursorCoords;
        }
    });
});

// Function to generate a grid
function generateGrid(rows = 10, cols = 10) {
    const gridContainer = document.createElement('div');
    gridContainer.classList.add('grid-container');

    // Create the grid cells
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            gridContainer.appendChild(cell);
        }
    }

    document.getElementById('grid-wrapper').appendChild(gridContainer);

    // Create a draggable token
    const token = document.createElement('div');
    token.classList.add('token');
    token.draggable = true;
    token.id = 'draggable-token'; // Assign an ID for the token

    // Event listeners for drag-and-drop functionality
    token.addEventListener('dragstart', dragStart);
    token.addEventListener('dragend', dragEnd);

    document.getElementById('grid-wrapper').appendChild(token);
}

// Helper function to get the nearest grid cell
function getNearestGridCell(x, y) {
    const cells = document.querySelectorAll('.grid-cell');
    let closestCell = null;
    let minDistance = Infinity;

    cells.forEach(cell => {
        const rect = cell.getBoundingClientRect();
        const cellCenterX = rect.left + rect.width / 2;
        const cellCenterY = rect.top + rect.height / 2;
        const distance = Math.sqrt((x - cellCenterX) ** 2 + (y - cellCenterY) ** 2);

        if (distance < minDistance) {
            minDistance = distance;
            closestCell = cell;
        }
    });

    return closestCell;
}

// Drag and drop token functionality
function dragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.id);
}

function dragEnd(event) {
    const closestCell = getNearestGridCell(event.clientX, event.clientY);
    if (closestCell) {
        closestCell.appendChild(event.target);
        event.target.style.position = 'relative';
        event.target.style.left = '0';
        event.target.style.top = '0';
    }
}

// Call generateGrid to initialize the grid
generateGrid();

// Function to restore windows based on saved state
function restoreWindows(openWindows) {
    openWindows.forEach(windowId => {
        const button = document.querySelector(`[onclick="openWindow('${windowId}', this)"]`);
        openWindow(windowId, button); // Reopens each window
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
                // 'Authorization': `Bearer ${yourAccessToken}`, // Uncomment this line if using auth
            },
            body: JSON.stringify({ openWindows })
        });
    } catch (error) {
        console.error('Failed to update open windows:', error);
    }
}

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

    // Get the current date and time for createdAt and updatedAt
    const currentDate = new Date().toISOString(); // Use ISO format for consistency

    try {
        const response = await fetch('http://localhost:3000/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                id,
                username, 
                password,
                createdAt: currentDate,  // Include createdAt
                updatedAt: currentDate   // Include updatedAt
            }),
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            closeWindow('window-signup'); // Optionally close the signup window
        } else {
            const error = await response.json();
            alert(error.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Error during signup:', error);
        alert('An error occurred while signing up.');
    }
}

// Additional code and functions...

// Call this to ensure the signup form listener is registered only when the window is opened
// document.getElementById('signup-form').addEventListener('submit', handleSignup);
