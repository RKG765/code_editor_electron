file structre


ai_code_editor/
│
├── package.json
├── package-lock.json
├── node_modules/
│
├── main.js              # Electron main process (entry point)
├── preload.js           # Preload script (safe bridge between renderer and Node)
│
├── src/                 # Your app source
│   ├── renderer/        # Renderer process (frontend UI)
│   │   ├── index.html   # Main HTML file
│   │   ├── index.js     # Renders UI, connects to backend
│   │   ├── style.css    # Custom styling
│   │   ├── editor.js    # Monaco Editor setup
│   │   ├── chat.js      # AI Pair Programmer panel
│   │   └── assets/      # Icons, logos, images
│   │
│   └── backend/         # Python backend
│       ├── app.py       # Main backend server (Flask/FastAPI/WebSocket)
│       ├── ai_engine.py # AI logic (OpenAI/Groq + llama.cpp interface)
│       └── models/      # Local LLM models (ggml-7B-q4.bin etc.)
│
├── scripts/             # Build & packaging scripts
│   └── build.js
│
└── .gitignore
