// BOUNDARY
class UserLoginPage {
    constructor() {
        // No need to store user data here
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
}

// CONTROLLER
class LoginController {
    constructor() {
        this.authenticator = new AuthenticationService();
        this.loginPage = new UserLoginPage();
    }

    run() {
        console.log("Running User Login");
    }

    async processLogin() {
        const credentials = this.loginPage.getUserInput();
        const user = new User(credentials.username, credentials.password);

        const isAuthenticated = this.authenticator.authenticate(user);

        if (isAuthenticated) {
            this.loginPage.displaySuccessMsg();
            setTimeout(() => {
                window.location.href = "dashboard.html"; // Change this to your desired page
            }, 1000);
        } else {
            this.loginPage.displayErrorMsg();
        }
    }
}

// ENTITY
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

// SERVICE
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

// Entry point - Updated to handle async authentication
async function handleLogin(event) {
    event.preventDefault(); // Prevent form submission

    const loginController = new LoginController();
    loginController.run();
    await loginController.processLogin();

    return false; // Prevent form submission
}


// SERVICE (not strictly part of BCE, but necessary)
// class AuthenticationService {
//     authenticate(user) {
//         // In a real system, this would check against a database
//         return user.getUsername() === "john" && user.getPassword() === "password";
//     }
// }

// // Entry point
// function handleLogin() {
//     const loginController = new LoginController();
//     loginController.run();
//     loginController.processLogin();
// }



