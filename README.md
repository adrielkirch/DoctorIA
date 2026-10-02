# Doctor AI — Open Source Clinical Reasoning Platform

A modern, open-source AI platform built with **Vue 3** (frontend), **NestJS / Node.js** (backend API), and **PostgreSQL** (database). It features a clinical-grade conversational interface, multi-agent reasoning graphs, human-in-the-loop fallback escalation, and native DICOM/pathology imaging capabilities—**100% open-source and self-hostable**.

---

## 🩺 Supported Clinical Specialties (100% Open Source)

Doctor AI is engineered with specialized reasoning profiles across **10 distinct medical domains**, leveraging open-source medical foundational models, LangGraph orchestrations, and specialized prompt topologies:

1. **General Practice & Primary Care:** Differential diagnosis for multi-symptom presentations, preventive care tracking, and triage guidance.
2. **Cardiology & Cardiovascular Medicine:** ECG waveform interpretation analysis, risk-scoring (ASCVD/HEART score), and heart failure trajectory monitoring.
3. **Oncology & Tumor Board Analysis:** Staging synthesis, multi-modal biomarker review, and personalized therapy pathway matching.
4. **Radiology & Diagnostic Imaging:** DICOM image viewer integration, structural anomaly flagging, and preliminary imaging impression reports.
5. **Pathology & Digital Histopathology:** Whole-slide image (WSI) metadata analysis, cellular anomaly breakdown, and grading report generation.
6. **Pulmonology & Critical Care:** ABG (Arterial Blood Gas) interpretation, ventilator parameter reasoning, and acute respiratory distress evaluation.
7. **Endocrinology & Metabolic Health:** Glycemic trend analytics, diabetic ketoacidosis risk stratification, and endocrine panel evaluations.
8. **Neurology & Neuro-imaging:** Stroke protocol timelines, NIHSS scoring assistance, and localized neurological deficit assessments.
9. **Gastroenterology & Hepatology:** Liver fibrosis staging calculators, inflammatory bowel disease flare tracking, and GI bleeding risk tools.
10. **Nephrology & Urology:** eGFR tracking, electrolyte imbalance correction reasoning, and acute kidney injury staging.

---

## 🧠 Fabric of Reasoning & Agentic Capabilities

Doctor AI moves beyond simple chatbot responses by implementing a robust **Fabric of Reasoning** engine:

* **Multi-Step Clinical Synthesis:** Breaks down complex patient presentations into distinct diagnostic hypotheses, orders them by clinical probability, and identifies critical "red flag" differential exclusions.
* **Autonomous Internet Search & Literature Retrieval:** Automatically queries trusted open medical databases and web literature for real-time clinical guidelines, newly approved therapeutics, and rare disease case studies.
* **Advanced RAG (Retrieval-Augmented Generation):** Ingests institutional guidelines, internal hospital protocols, clinical trial data, and localized formularies into a vector database to ground every AI response in verified documentation.
* **Automated Comprehensive Medical Reports:** Synthesizes chat transcripts, lab values, and imaging findings into structured, exportable clinical summary reports.
* **Human-in-the-Loop Safeguards:** Automatically flags low-confidence or high-risk cases and routes them to attending clinicians for review before final sign-off.

---

## 🛠️ Tech Stack

### **Frontend**

* **Vue 3** + **TypeScript** + **Composition API**
* **Vuetify 3** (Medical-grade UI component library)
* **Pinia** (State Management)
* **Vue Router** (Routing with short URL support)
* **Vite** (Build tool & dev server)

### **Backend**

* **NestJS** (Node.js framework built with TypeScript)
* **TypeORM** / **Prisma** (ORM for PostgreSQL interaction)
* **LangGraph / Node AI Orchestration** (Fabric of reasoning workflows)
* **JWT Authentication** (Secure API endpoints & sessions)
* **WebSockets / Gateway** (Real-time streaming chat & fallback messaging)

### **Database & Infrastructure**

* **PostgreSQL** (Relational database)
* **Docker & Docker Compose** (Containerized development & independent database setup)

---

## 📁 Project Structure

```text
doctor-ai-open-source/
├── frontend/               # Vue 3 client application
│   ├── src/
│   │   ├── assets/         # Static assets, styles, and medical templates
│   │   ├── components/     # Reusable UI components & DICOM viewers
│   │   ├── views/          # Specialty views (Chat, Radiology, Tumor Board, Settings)
│   │   └── router/         # Vue Router configuration
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                # NestJS / Node.js API server
│   ├── src/
│   │   ├── auth/           # Authentication & role-based access control
│   │   ├── chat/           # Chat, LangGraph connectors & WebSockets
│   │   ├── reasoning/      # Fabric of reasoning engines, RAG & internet search
│   │   └── users/          # User management & clinical roles
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.db.yml   # Independent PostgreSQL database container
└── README.md

```

---

## 🚀 Getting Started (Local Development)

### **Prerequisites**

* [Node.js](https://nodejs.org/) (v20+ recommended)
* **npm** (This project uses npm exclusively)
* [Docker & Docker Compose](https://www.docker.com/) (For running PostgreSQL)

---

### **1. Environment Configuration**

Clone the repository and set up your environment variables:

```bash
git clone https://github.com/your-username/doctor-ai-open-source.git
cd doctor-ai-open-source

```

Create a `.env` file in the root directory:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=doctor_ai_db
JWT_SECRET=your_super_secret_jwt_key

```

---

### **2. Running the Database (Docker)**

Spin up the standalone PostgreSQL database container in the background:

```bash
docker compose -f docker-compose.db.yml up -d

```

---

### **3. Running the Backend (NestJS)**

Open a terminal, navigate to the backend directory, install dependencies, and start the development server:

```bash
cd backend
npm install
npm run start:dev

```

*The API server will run on `http://localhost:3000` with Swagger docs available at `http://localhost:3000/api/docs`.*

---

### **4. Running the Frontend (Vue 3)**

Open a separate terminal window, navigate to the frontend directory, install dependencies, and start the dev server:

```bash
cd frontend
npm install --allow-git=all
npm run dev

```

*The frontend will run on `http://localhost:5173`.*

---

## 🤝 Contributing

We welcome contributions from clinicians, researchers, and engineers passionate about open-source healthcare AI!

1. Explore the codebase and review existing reasoning modules in `/backend/src/reasoning`.
2. Follow established TypeScript patterns and maintain modular architecture.
3. Submit issues or pull requests for new clinical domain modules, RAG enhancements, or UI tools.

---

## 📄 License

This project is open-source and licensed under the **MIT License**.
