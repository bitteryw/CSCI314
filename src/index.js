// BOUNDARY
class UserLoginPage {
    constructor(loginController) {
        this.loginController = loginController;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', this.handleLoginSubmit.bind(this));
            }
        });
    }

    async handleLoginSubmit(event) {
        event.preventDefault(); // Prevent form submission

        // Get input and pass to controller
        const credentials = this.getUserInput();

        // Call the controller
        await this.loginController.processLogin(credentials.username, credentials.password);

        return false; // Prevent form submission
    }

    getUserInput() {
        return {
            username: document.getElementById("username").value,
            password: document.getElementById("password").value
        };
    }

    displaySuccessMsg() {
        document.getElementById("message").textContent = "Log-In Successful";
        document.getElementById("message").style.color = "green";
    }

    displayErrorMsg() {
        document.getElementById("message").textContent = "Log-In Unsuccessful";
        document.getElementById("message").style.color = "red";
    }

    navigateToUserPage() {
        window.location.href = "user-management.html"; // Change this to your desired page
    }
}

// CONTROLLER - Contains only business logic
class LoginController {
    constructor() {
        this.authenticator = new AuthenticationService();
    }

    run() {
        console.log("Running User Login");
    }

    async processLogin(username, password) {
        this.run();

        // Create user entity
        const user = new User(username, password);

        // Business logic: authenticate user
        const isAuthenticated = await this.authenticator.authenticate(user);

        // Get reference to boundary
        const loginPage = this.getLoginPage();

        // Handle result (no UI logic here)
        if (isAuthenticated) {
            loginPage.displaySuccessMsg();
            setTimeout(() => {
                loginPage.navigateToUserPage();
            }, 1000);
        } else {
            loginPage.displayErrorMsg();
        }
    }

    // Method to get the boundary reference
    getLoginPage() {
        return window.loginPage;
    }
}

// ENTITY - Data structure
class User {
    constructor(username, password) {
        this.username = username;
        this.password = password;
    }

    getUsername() {
        return this.username;
    }

    getPassword() {
        return this.password;
    }
}

// Log-in function
class AuthenticationService {
    async authenticate(user) {
        try {
            const response = await fetch('http://localhost:3000/api/authenticate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: user.getUsername(),
                    password: user.getPassword()
                })
            });

            const data = await response.json();
            return data.authenticated;
        } catch (error) {
            console.error('Authentication error:', error);
            return false;
        }
    }
}

// Initialize application
const loginController = new LoginController();
// Store loginPage in window to allow controller to access it
// This is a pattern to avoid circular dependencies
window.loginPage = new UserLoginPage(loginController);