# LifeLink - Intelligent Emergency Response Platform

![LifeLink Banner](https://img.shields.io/badge/Status-Hackathon_Ready-brightgreen)
![React Native](https://img.shields.io/badge/Mobile-React_Native_Expo-blue)
![React](https://img.shields.io/badge/Web-React_Vite-cyan)
![Supabase](https://img.shields.io/badge/Backend-Supabase-emerald)
![AI](https://img.shields.io/badge/AI-Groq_Llama_Vision-orange)

**LifeLink** is a multimodal AI-powered emergency assistance platform designed to drastically improve the "Golden Hour" response time. By combining voice input, automatic scene captures, and cutting-edge vision AI (Groq Llama 4 Scout), LifeLink generates a rich contextual emergency packet for verified medical responders and hospital dashboards, rather than just sending a simple location ping.

---

## 🚀 Features

- **Intelligent SOS**: One-tap emergency activation. Captures background audio transcripts and burst photos automatically.
- **AI Triage Engine**: Uses Groq (Llama 4 Scout) and Whisper to instantly analyze the scene, assigning a severity score (CRITICAL, URGENT, SAFE) and providing first-aid recommendations.
- **Hospital Web Dashboard**: A real-time command center for hospitals to monitor incoming cases, dispatch ambulances, and view AI-generated preparation checklists.
- **Live Ambulance Tracking**: Once dispatched, victims can see the exact highlighted road route and live Estimated Time of Arrival (ETA) of the ambulance on their phone.
- **Simulate Demo Mode**: Built-in ambulance simulation in the web dashboard for easy hackathon presentations without needing multiple devices.

---

## 📂 Project Structure

This repository is a monorepo containing three main components:

1. `/mobile` - The Expo React Native application for victims and responders.
2. `/hospital-web` - The Vite + React web application for the hospital command center.
3. `/supabase` - Database migrations, schema, and backend configuration.

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (optional, if running backend locally)

### 1. Environment Variables
You will need API keys for **Supabase** and **Groq**. 
Create a `.env` file in **both** the `/mobile` and `/hospital-web` directories with the following keys:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key
```
*(Note: Both the web app and mobile app use the `EXPO_PUBLIC_` prefix for Vite and Expo compatibility)*

### 2. Running the Hospital Web Dashboard
Open a terminal and navigate to the `hospital-web` directory:
```bash
cd hospital-web
npm install
npm run dev
```
The dashboard will be available at `http://localhost:5173`.

### 3. Running the Mobile Application
Open a new terminal and navigate to the `mobile` directory:
```bash
cd mobile
npm install
npx expo start --clear
```
- Download the **Expo Go** app on your iOS or Android device.
- Scan the QR code in the terminal to open the LifeLink app.
- Ensure your phone and computer are on the same Wi-Fi network.

---

## 💻 How to Test the Full Flow (One Device Setup)

If you only have one physical smartphone to test with, you can use the built-in simulator:

1. **Trigger an SOS**: Open the app on your phone, log in as a normal user, and hold the SOS button.
2. **View Dashboard**: Open the Hospital Dashboard on your laptop. You will hear an alert and see a pop-up for the new case.
3. **Dispatch**: Click "View Incident Details" and then click **Dispatch**.
4. **Simulate Ambulance**: Click the orange **▶️ Simulate Drive** button on the dashboard.
5. **Watch the Magic**: Look at your phone! You will see the ambulance icon smoothly driving down the road towards you, and the ETA will drop in real time.

---

## 🧠 Tech Stack
- **Frontend**: React Native (Expo), React.js (Vite)
- **Backend**: Supabase (PostgreSQL, Realtime WebSockets, Auth)
- **AI/ML**: Groq API (Llama 4 Scout Vision, Whisper Large v3)
- **Maps/Routing**: React-Leaflet, React-Native-Maps, Open Source Routing Machine (OSRM)
