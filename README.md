# AIMS - Advanced Inventory Management System

AIMS is a web application that helps companies track their **hardware assets** (laptops, monitors, phones) and **cloud software licenses** (SaaS like Slack, AWS, Figma) all in one place.

---

## 🌟 Key Features

1. **Hardware Tracking**: Manage company laptops, phones, and monitors, along with their location and status (In Stock, Allocated, Damaged, Retired).
2. **QR Code Scanning**: Print custom QR codes for devices and scan them using a simulated webcam scanner.
3. **Digital Custody Signatures**: Capture digital hand-drawn signatures on a screen when assigning devices to employees.
4. **Cloud Software Licenses**: Track SaaS, PaaS, and IaaS license seats, renewal dates, and monthly costs.
5. **AI Inventory Assistant**: Ask questions in plain English to query your inventory database dynamically.

---

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

1. **Node.js** (Version 18 or higher)
2. **npm** (Node Package Manager - installed automatically with Node.js)
3. **MySQL Server** (Running locally on Port 3306)

---

## 🚀 Easy Installation Guide

Follow these steps to get the application up and running on your computer:

### Step 1: Configure the Database
1. Go into the `server` directory.
2. Create a file named `.env` and fill it with your local MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password_here
   DB_NAME=aims_db
   PORT=5000
   JWT_SECRET=your_jwt_secret_key
   ADMIN_EMAIL=admin@techcorp.co.in
   ADMIN_PASSWORD=Admin@123
   ```

### Step 2: Seed the Database
In your terminal, go to `server` and run the seeding commands to populate your database with initial tables and data:
```bash
# 1. Install server dependencies
npm install

# 2. Run the main asset seeder
node seeders/seed.js

# 3. Run the cloud licenses seeder
node seeders/seed_saas_paas_iaas.js
```

### Step 3: Run the Backend API Server
Inside the `server` folder, start the backend application:
```bash
npm start
```
*The backend API will run on **http://localhost:5000***.

### Step 4: Run the Frontend React Application
Open a new terminal, navigate to the `client` folder, install its dependencies, and start the development server:
```bash
# 1. Navigate to the client directory
cd client

# 2. Install dependencies
npm install

# 3. Start the application
npm run dev
```
*The React user interface will open on **http://localhost:5173***.

---

## 🔑 Login Credentials

Log in as the administrator using:
* **Email**: `admin@techcorp.co.in`
* **Password**: `Admin@123`
