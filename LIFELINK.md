# LifeLink - Intelligent Emergency Response Platform

## Project Overview

**Tagline:** Golden Hour, Powered by AI

**LifeLink** is an AI-powered smart emergency assistance platform that connects victims, **verified medical responders**, and hospitals in real-time using multimodal AI (voice + scene images) for intelligent triage.

**Core Differentiator:**  
Instead of just sending location like most SOS apps, LifeLink creates a **rich contextual emergency packet** using Gemini AI and sends it to the right people.

---

## Problem Statement

- India loses over **1.7 lakh** lives every year in road accidents.
- Nearly **50%** of deaths are preventable with timely care in the **Golden Hour**.
- Current systems (112, ambulances) lack proper triage, context, and coordination.
- Hospitals receive patients with zero prior information.
- Bystanders are unreliable unless they are verified medical professionals.

---

## Solution

One-tap SOS → Voice description + Burst photos → Multimodal AI Triage (Gemini) → Rich Emergency Packet → Sent to Verified Responders + Hospitals.

---

## Key Features

### 1. Intelligent SOS (Core)
- Explicit consent for mic & camera
- Voice input + Automatic burst photo capture (6-10 images)
- Live camera preview (privacy-first)
- Multimodal AI analysis using Gemini

### 2. AI Triage Engine
- Severity Scoring: **Red / Orange / Yellow**
- Injury summary, risks, and recommendations
- Structured JSON output

### 3. Verified Responder Network
- Two-tier system:
  - Priority: Verified doctors, nurses, paramedics
  - Secondary: Regular users
- Badges and priority alerts

### 4. Smart Hospital Dashboard
- Real-time incoming emergency cards with photos + AI summary
- ETA, route, and preparation checklist

### 5. Offline Support
- SOS works offline
- Data queued locally and auto-synced when online

---

## Tech Stack

- **Mobile App**: React Native + Expo
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **AI**: Google Gemini 1.5 Flash (Multimodal)
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Maps**: Google Maps API / Expo Location
- **Hospital Dashboard**: React.js (Web)

---

## Team Roles & Responsibilities

### **Member 1 (You) - Core SOS + AI Triage + Backend**
- Supabase project setup + schema design
- SOS Screen (Consent, Big SOS Button)
- Voice recording + Burst camera photos
- Gemini API integration & prompt engineering
- Emergency Packet creation (structured data)
- Offline queuing logic (AsyncStorage + sync)
- All core backend tables and logic

### **Member 2 - Responder Side + Notifications**
- Responder alert screen (high priority UI)
- Accept / Reject emergency functionality
- FCM Push Notifications (Tier 1 & Tier 2)
- Real-time status updates (on the way, ETA, etc.)
- Verified Responder profile screen

### **Member 3 - Hospital Dashboard**
- Web-based Hospital Dashboard (React.js)
- Real-time emergency cards using Supabase Realtime
- Hospital login + view
- Google Maps integration (for hospital side)
- Acknowledge & Prepare features

### **Member 4 - Authentication & User Classification**
- Login / Signup flow (Email/Phone + OTP)
- Onboarding flow for medical professionals
- Form to collect professional details (Doctor/Nurse/Paramedic, Experience, Registration No.)
- Document upload (medical certificate)
- Logic to mark user as `is_verified_medical: true/false`

---

## Database Schema (Supabase)

**Main Tables:**
- `users` (id, email, phone, is_verified_medical, role, certificate_url, etc.)
- `emergencies` (id, user_id, location, voice_transcript, severity, ai_summary, photos[], status, created_at)
- `emergency_responses` (emergency_id, responder_id, status, accepted_at)

---

## Success Criteria (MVP)

1. SOS button works with voice + burst photos
2. Gemini returns proper severity score + summary
3. Verified responders get priority notification
4. Hospital dashboard shows rich emergency card
5. Offline → Online sync works (demo)

---

## Demo Flow (Most Important)

1. Victim presses SOS → Voice + Photos
2. AI Analysis shown
3. Offline simulation
4. Responder receives alert and accepts
5. Hospital dashboard receives rich data

---

**Project Status**: In Development  
**Target**: National Level Hackathon (Open Innovation / HealthTech)
