🎮 GameStoreDB - Full-Stack E-Commerce Platform
A robust, full-stack video game store web application built with **Node.js**, **Express**, **MongoDB**, and **WebSockets**. Features secure user authentication, shopping cart management, an administrative inventory dashboard, real-time updates, and sales tracking.

## ✨ Key Features
* **User Authentication & Role-Based Access:** Secure registration and login system with distinct permissions for standard customers and administrators.
* **Product Management (Admin):** Admins can add, update, and delete game listings with custom image uploads using Multer.
* **Interactive Shopping Cart:** Customers can add items, adjust quantities, remove products, and complete checkouts.
* **Sales Tracking & History:** Automatically records sales transactions with customer and product details for business reporting.
* **Real-Time Communication:** Powered by WebSockets to broadcast live inventory updates and support real-time chat.
* **Session Management:** Secure server-side session handling with Express-Session.

## 🛠️ Tech Stack
* **Backend:** Node.js, Express.js
* **Database:** MongoDB, Mongoose ODM
* **Real-time:** WebSockets (`ws`)
* **Templating Engine:** EJS (Embedded JavaScript)
* **File Uploads:** Multer

## 🚀 Getting Started Locally
Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites
Make sure you have the following installed on your computer:
* [Node.js](https://nodejs.org/) (v16 or higher recommended)
* [MongoDB](https://www.mongodb.com/) (running locally on `mongodb://127.0.0.1:27017`)

### Installation Steps
**Clone the repository:**
Bash
git clone https://github.com/boniyami/GameStore-ECommerce.git
cd GameStore-ECommerce

Install dependencies:
Bash
npm install
Ensure MongoDB is running:
Start your local MongoDB service.

Run the application:
Bash
node app.js
Open your browser:
Navigate to http://localhost:3000

🔑 Default Access & Roles
Customer Portal: Register a new account from the sign-up page to browse games and shop.
Admin Portal: Register an account with the username admin (case-insensitive) to automatically unlock administrative privileges and access the inventory/sales dashboard at /admin/inventory.

📂 Project Structure
Plaintext
├── public/             # Static frontend assets (CSS, client-side scripts)
├── views/              # EJS template views (home, dashboard, admin, login)
├── uploads/            # Dynamically stored uploaded product images
├── app.js              # Main application entry point and server logic
├── package.json        # Project metadata and dependencies
└── README.md           # Project documentation

💡 Future Improvements
Integrating online payment gateways (Stripe/PayPal).
Enhancing UI with modern frontend frameworks (Angular/React).
Adding automated unit tests for backend API routes.
