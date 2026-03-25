# 🌱 MyFarmAI - Premium AI Agricultural Ecosystem
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel)](https://farm-ai-iota.vercel.app/)
[![Database](https://img.shields.io/badge/Database-MongoDB_Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)
[![AI Model](https://img.shields.io/badge/AI-Llama_3.3_70B-blue?logo=meta)](https://groq.com/)

**MyFarmAI** is a comprehensive, AI-driven Progressive Web App (PWA) designed to modernize the agricultural experience in Nigeria. It integrates advanced AI consultation, a real-time marketplace, and veterinary expert connectivity into a single, seamless platform.

---

## 📑 Project Breakdown Report

### 1. 🚀 Core Features
*   **🧠 Intelligent AI Assistant (ChatGPT-style)**:
    *   **Persistent Conversations**: Multi-session history saved to MongoDB.
    *   **Contextual Knowledge**: The AI has real-time access to current marketplace listings and certified consultants.
    *   **Agricultural Expertise**: Powered by Llama 3.3 (70B) for high-accuracy crop, livestock, and soil advice.
*   **🛒 Digital Marketplace**:
    *   **Verified Listings**: Real-time product posting with categories and smart image placeholders.
    *   **Persistent Shopping Cart**: Cross-device cart synchronization linked to user accounts.
    *   **Direct Contact**: One-click WhatsApp integration to connect buyers directly with farmers/sellers.
*   **🏥 Veterinary Consultation**:
    *   Dynamic consultant suggestions based on availability and specialty.
    *   Static fallback system ensuring service uptime even during database maintenance.
*   **📱 Native PWA Experience**:
    *   Installable on Android/iOS.
    *   Offline-ready with Service Worker caching.
    *   Mobile-first, premium glassmorphism design.

### 2. 🛡️ Advanced Authentication Bridge (SSO)
One of the most complex architectural achievements is the **Unified Auth Bridge**:
*   **The Shell**: The main Marketplace app (`index.html`) manages the primary user session in `localStorage`.
*   **The Bridge**: Uses `window.postMessage` to securely sync the user's authentication state to the embedded AI Assistant iframe.
*   **Automatic Login**: Users log in once to the Marketplace and are automatically authenticated within the AI Chat, providing a unified "Single Sign-On" experience.

### 3. 🛠️ Technical Architecture
#### **Frontend (Shell & AI Console)**
- **Structure**: Vanilla HTML5 (Semantic)
- **Styling**: Premium CSS3 System (Variables, Flex/Grid, Keyframe Animations)
- **Logic**: Async JavaScript (ES6+)
- **Communications**: Cross-Origin Messaging (PostMessage API)

#### **Backend (AI Engine)**
- **Runtime**: Node.js (Express.js)
- **Database**: MongoDB Atlas (Mongoose ODM)
- **LLM API**: Groq Cloud (Llama 3.3 70B Versatile)
- **Deployment**: Vercel Serverless Functions

### 4. 🗄️ Database Schema Breakdown
*   **User**: Handles authentication and role-based access.
*   **Conversation**: Stores unique chat sessions with ID-based retrieval.
*   **Product**: Manages marketplace inventory (Title, Price, Category, Seller Contact).
*   **Cart**: Persistent user-item relations for frictionless shopping.
*   **Consultant**: Profile-based data for agricultural experts.

---

## ⚡ Setup & Deployment
### **Pre-requisites**
- Node.js 18+
- MongoDB Atlas Cluster
- Groq API Key

### **Local Development**
1. Clone the repository and navigate to `/ai_enginr/backend`.
2. Create a `.env` file with:
   ```env
   MONGODB_URI=your_atlas_uri
   GROQ_API_KEY=your_groq_key
   ```
3. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```
4. Serve the root folder (`/`) using any web server (e.g., Live Server) to access the main app.

### **Production Deployment**
This project is optimized for **Vercel**. Simply connect your GitHub repository, add your `.env` variables to Vercel, and it will deploy instantly.

---

**Developed with ❤️ for the future of Farming.**