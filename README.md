# Doctor AI — Open Source Product

A modern, open-source AI platform built with **Vue 3** (frontend), **NestJS / Node.js** (backend API), and **PostgreSQL** (database). It features a ChatGPT-like AI conversational interface, human-in-the-loop fallback escalation, dicom image capabilities, and robust multi-language support.

<img width="1906" height="835" alt="image" src="https://github.com/user-attachments/assets/4bd64270-cbda-4e2a-bfa7-17d408ebcba4" />

<img width="1600" height="706" alt="image" src="https://github.com/user-attachments/assets/759b7a4e-516a-4041-891f-154ef6d0c3d0" />

<img width="1600" height="620" alt="image" src="https://github.com/user-attachments/assets/759cd71c-a13a-4b2a-817f-76d858a06f1c" />


---
# Next tasks

  - Simple backend []
  - PostgresSQL []
  - Langraph infrastructure []
  
## 🛠️ Tech Stack

### **Frontend**

* **Vue 3** + **TypeScript** + **Composition API**
* **Vuetify 3** (UI Component Library)
* **Pinia** (State Management)
* **Vue Router** (Routing with short URL support)
* **Vite** (Build tool & dev server)

### **Backend**

* **NestJS** (Node.js framework built with TypeScript)
* **TypeORM** / **Prisma** (ORM for PostgreSQL interaction)
* **JWT Authentication** (Secure API endpoints & sessions)
* **WebSockets / Gateway** (Real-time chat & human fallback messaging)

### **Database & Infrastructure**

* **PostgreSQL** (Relational database)
* **Docker & Docker Compose** (Containerized development & production deployment)
* **Nginx** (Reverse proxy for production)

---

## 📁 Project Structure

```text
doctor-ai-open-source/
├── frontend/             # Vue 3 client application
│   ├── src/
│   │   ├── assets/       # Static assets, styles, and i18n legal html docs
│   │   ├── components/   # Reusable UI components & dialogs
│   │   ├── views/        # Page views (Chat, Settings, Admin, etc.)
│   │   └── router/       # Vue Router configuration & feature flags
│   ├── vite.config.ts
│   └── package.json
│
├── backend/              # NestJS / Node.js API server
│   ├── src/
│   │   ├── auth/         # Authentication & Authorization modules
│   │   ├── chat/         # Chat, AI connectors & WebSockets
│   │   ├── users/        # User management & roles
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.dev.yml   # Local development setup with hot-reload
├── docker-compose.prod.yml  # Production deployment configuration
└── README.md

```

---

## 🚀 Getting Started (Local Development)

### **Prerequisites**

* [Node.js](https://nodejs.org/) (v20+ recommended)
* **npm** (This project uses npm exclusively; avoid yarn/pnpm)
* [Docker & Docker Compose](https://www.docker.com/) (Recommended for running Postgres and services seamlessly)

### **1. Environment Configuration**

Clone the repository and set up your environment variables:

```bash
git clone https://github.com/your-username/doctor-ai-open-source.git
cd doctor-ai-open-source

```

Create a `.env` file at the root (or copy from `.env.example`) and configure your database and API tokens:

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

### **Option A: Running with Docker (Recommended)**

The easiest way to spin up the Frontend, Backend, and PostgreSQL database simultaneously with hot-reloading enabled is via Docker Compose:

```bash
# Start development environment
npm run docker:dev
# Or directly:
docker compose -f docker-compose.dev.yml up --build

```

* **Frontend App:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:3000](http://localhost:3000)

To check logs or stop the containers:

```bash
npm run docker:dev:logs
npm run docker:dev:down

```

---

### **Option B: Running Manually (Without Docker)**

#### **1. Database Setup**

Ensure your local PostgreSQL instance is running and create a database named `doctor_ai_db`.

#### **2. Backend Setup (NestJS)**

```bash
cd backend
npm install
npm run start:dev

```

The API server will run on `http://localhost:3000`.

#### **3. Frontend Setup (Vue 3)**

Open a separate terminal window:

```bash
cd frontend
npm install
npm run dev

```

The frontend dev server will run on `http://localhost:5173`.

---

## 📦 Production Deployment

To build and run the complete ecosystem in production mode using Docker and Nginx:

```bash
docker compose -f docker-compose.prod.yml up --build

```

* The production web client will be served at [http://localhost:8080](http://localhost:8080).

---

## ⚙ Key Features & Configuration

* **ChatGPT-like Interface:** Complete conversational UI layout featuring a navigation drawer and active thread pane.
* **Human Fallback:** Seamless protocol enabling automated bots to escalate active user threads to live human support agents.
* **Social Media Integration:** Built-in connection capabilities for cross-platform sharing and multi-channel messaging (WhatsApp, Instagram, Twitter, etc.).
* **Feature Flags:** Easily toggle features on/off without writing code by configuring the `VITE_DISABLE_FEATURE_FLAGS` environment variable.
* **Multi-language Support:** Full i18n implementation covering English, Portuguese, French, Arabic (RTL support), and German.

---

## 📚 Documentation

Detailed guides and architecture notes are available inside the [`/docs`](https://www.google.com/search?q=docs/) folder:

* **[Main Documentation Index](https://www.google.com/search?q=docs/README.md)**
* **[Implementation Guides](https://www.google.com/search?q=docs/implementation/)**
* **[Integration Guides](https://www.google.com/search?q=docs/integrations/)**

---

## 🤝 Contributing

We welcome contributions from the community!

1. Review the [`/docs`](https://www.google.com/search?q=docs/) folder before starting new implementations.
2. Follow established code patterns in frontend components and NestJS modules.
3. Write clean, modular TypeScript code with appropriate tests.
4. Open an issue or submit a pull request.

---

## 📄 License

This project is open-source and licensed under the **MIT License**.
