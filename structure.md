backend/
├─ package.json
├─ .env
├─ index.js
└─ src/
    ├─ config/
    │   ├─ database.js
    │   └─ jwtUtils.js
    │
    ├─ controllers/
    │   ├─ candidateController.js
    │   ├─ electionController.js
    │   ├─ userController.js
    │   └─ voteController.js
    │
    ├─ middleware/
    │   ├─ authMiddleware.js
    │   ├─ errorHandler.js
    │   └─ validationMiddleware.js
    │
    ├─ models/
    │   ├─ Candidate.js
    │   ├─ Election.js
    │   ├─ User.js
    │   └─ Vote.js
    │
    ├─ routes/
    │   ├─ authRoutes.js
    │   ├─ userRoutes.js
    │   ├─ candidateRoutes.js
    │   ├─ electionRoutes.js
    │   └─ voteRoutes.js
    │
    └─ utils/
        ├─ passwordUtils.js
        └─ voteUtils.js

db/
└─ mydb.sql

frontend/
├─ package.json
├─ .env
├─ .env.example
├─ index.html
├─ vite.config.js (or equivalent if using Vite)
└─ src/
    ├─ main.jsx
    ├─ App.jsx
    │
    ├─ api/
    │   └─ apiService.js
    │
    ├─ components/
    │   ├─ Header.jsx
    │   ├─ Footer.jsx
    │   ├─ Layout.jsx
    │   ├─ LoadingSpinner.jsx
    │   └─ VotingCard.jsx
    │
    ├─ pages/
    │   ├─ Login.jsx
    │   ├─ Register.jsx
    │   ├─ Dashboard.jsx
    │   ├─ Elections.jsx
    │   ├─ Vote.jsx
    │   ├─ Results.jsx
    │   └─ AdminDashboard.jsx
    │
    ├─ store/
    │   ├─ authStore.js
    │   └─ electionStore.js
    │
    ├─ hooks/
    │   └─ useFormValidation.js
    │
    └─ utils/
        └─ validation.js

scripts/
└─ start.sh
