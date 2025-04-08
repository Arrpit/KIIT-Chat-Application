# KIIT Chat Application

A real-time chat application built with React, Node.js, and Socket.IO. This guide will help you set up and run the application on a Windows system.

## Prerequisites

Before you begin, ensure you have the following installed on your Windows system:

1. **Visual Studio Code**
   - Download and install from: https://code.visualstudio.com/

2. **Node.js and npm**
   - Download and install the LTS version from: https://nodejs.org/
   - Minimum version required: Node.js 14.x or higher
   - npm will be installed automatically with Node.js

3. **Git** (optional but recommended)
   - Download and install from: https://git-scm.com/downloads

## Project Setup

1. **Clone or Download the Project**
   - If using Git: `git clone [repository-url]`
   - Or download and extract the project ZIP file

2. **Install Frontend Dependencies**
   ```bash
   # Navigate to the project root directory
   cd "KIIT Projects"
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   # Navigate to the server directory
   cd server
   npm install
   ```

## Environment Setup

1. **Create Environment File**
   - Create a `.env` file in the project root directory
   - Add the following configuration:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

## Running the Application

1. **Start the Backend Server**
   ```bash
   # In the server directory
   cd server
   npm run dev
   ```
   The server will start on http://localhost:3000

2. **Start the Frontend Development Server**
   ```bash
   # In the project root directory
   cd ..
   npm run dev
   ```
   The frontend will start on http://localhost:5011

3. **Access the Application**
   - Open your web browser
   - Navigate to http://localhost:5011
   - Register a new account or login with existing credentials

## Project Structure

```
KIIT Projects/
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── contexts/         # Context providers
│   ├── pages/            # Application pages
│   └── main.jsx          # Application entry point
├── server/               # Backend source code
│   └── index.js          # Server entry point
├── public/               # Static assets
└── package.json          # Project dependencies
```

## Main Dependencies

### Frontend
- React (UI library)
- React Router (routing)
- Material-UI (UI components)
- Socket.IO Client (real-time communication)
- Vite (build tool)

### Backend
- Express (web framework)
- Socket.IO (real-time server)
- Node.js (runtime environment)

## Troubleshooting

1. **Port Already in Use**
   - Close any applications using ports 3000 or 5011
   - Or modify the port numbers in the respective configuration files

2. **Module Not Found Errors**
   - Delete the `node_modules` folder
   - Run `npm install` again in both frontend and backend directories

3. **Connection Errors**
   - Ensure both frontend and backend servers are running
   - Check if the VITE_API_URL in .env matches the backend server URL

## Additional Notes

- The application uses WebSocket for real-time communication
- Ensure your firewall allows the application to access the required ports
- For development, both frontend and backend servers must be running simultaneously