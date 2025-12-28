# CampusConnect - Virtual Notice Board

CampusConnect is a modern, full-stack virtual notice board application designed for educational institutions. It allows administrators to post announcements, events, and academic updates, while students can stay updated with the latest campus news in real-time.

## 🚀 Features

- **Unified Login System**: A single login interface for both Students and Admins, automatically redirecting users based on their roles.
- **Admin Dashboard**: Comprehensive management tools for admins to create, edit, and delete notices.
- **Hidden Archive**: Admins can archive old notices via backend API calls, removing them from the public UI while keeping them in the database for reference.
- **Real-Time Updates**: Notices are displayed dynamically with "New" badges for unread content.
- **Categorized Notices**: Filter notices by categories like Academics, Placements, Events, and more.
- **Image Uploads**: Support for attaching images to notices.
- **Responsive Design**: Fully responsive UI built with Bootstrap 5.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, FontAwesome.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB with Mongoose ODM.
- **Authentication**: JSON Web Tokens (JWT) and Bcrypt.js for secure password hashing.
- **File Handling**: Multer for image uploads.

## 📦 Installation & Setup

### Prerequisites
- Node.js installed on your machine.
- MongoDB database (local or Atlas).

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/CampusConnect.git
cd CampusConnect
```

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` folder and add your configuration:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 3. Access the Application
The backend is configured to serve the frontend static files. Once the server is running, open your browser and navigate to:
`http://localhost:5000`

## 📂 Project Structure

- `/backend`: Express.js server, API routes, and MongoDB models.
- `/frontend`: Static HTML, CSS, and client-side JavaScript.
- `/backend/uploads`: Directory for storing uploaded notice images.

## 🔑 Default Roles
- **User (Student)**: Can view all active notices and mark them as read.
- **Admin**: Can manage all notices and access the admin dashboard.

---
Built with ❤️ for Campus Communication.
