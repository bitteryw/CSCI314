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

    // navigateToUserPage() {
    //     window.location.href = "../src/user-management.html"; // Change this to your desired page
    // }

    navigateToHomePage(role) {
        let targetPage;
        const processedRole = (role || '').toString().trim().toLowerCase();

        switch (processedRole) {
            case 'home_owner':
                targetPage = "../src/home-owner.html";
                break;
            case 'home_cleaner':
                targetPage = "../src/home_cleaner/homePage.html";
                break;
            case 'user_admin':
                targetPage = "../src/user-management.html";
                break;
            case 'platform_manager':
                targetPage = "../src/platform-manager.html";
                break;
            default:
                console.log("Role not recognized, using default page. Received:", role);
                targetPage = "../src/user-management.html";
        }
        console.log("Redirecting to:", targetPage);
        window.location.href = targetPage;
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
        const authResult = await this.authenticator.authenticate(user);

        // Get reference to boundary
        const loginPage = this.getLoginPage();

        // Handle result (no UI logic here)
        if (authResult.authenticated) {
            // Store user role for reference
            localStorage.setItem('userRole', authResult.userRole);

            loginPage.displaySuccessMsg();
            setTimeout(() => {
                // Navigate based on user_role
                loginPage.navigateToHomePage(authResult.userRole);
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

            // If authentication is successful, get user details for proper display
            if (data.authenticated) {
                try {
                    // Store the user_id in localStorage - this is the username we're using in our system
                    localStorage.setItem('currentUserId', user.getUsername());

                    // Try to get the user's full name from the database
                    const userResponse = await fetch(`http://localhost:3000/get-homeowners`);
                    const userData = await userResponse.json();

                    if (userData.success) {
                        // Find the user in the response
                        const userDetails = userData.data.find(u => u.user_id === user.getUsername());

                        if (userDetails) {
                            // Store the user's full name for display
                            localStorage.setItem('currentUsername', `${userDetails.first_name} ${userDetails.last_name}`);
                        } else {
                            // Fallback to user_id if full name not found
                            localStorage.setItem('currentUsername', user.getUsername());
                        }
                    }
                } catch (error) {
                    // If there's an error getting user details, just use the user_id
                    console.error('Error getting user details:', error);
                    localStorage.setItem('currentUsername', user.getUsername());
                }
            }

            return {
                authenticated: data.authenticated,
                userRole: data.userRole || 'home_owner' // Default to home_owner if no role is provided
            };
        } catch (error) {
            console.error('Authentication error:', error);
            return {
                authenticated: false,
                userRole: null
            };
        }
    }
}

// Initialize application
const loginController = new LoginController();
// Store loginPage in window to allow controller to access it
// This is a pattern to avoid circular dependencies
window.loginPage = new UserLoginPage(loginController);