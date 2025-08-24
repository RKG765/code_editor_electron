const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 Building AI Code Editor...\n');

// Helper functions
function runCommand(command, options = {}) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { 
      stdio: 'inherit', 
      ...options 
    });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function createDirIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  } else {
    console.log(`✅ Directory exists: ${dirPath}`);
  }
}

function writeFileIfNotExists(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created file: ${filePath}`);
  } else {
    console.log(`✅ File exists: ${filePath}`);
  }
}

// Step 1: Check prerequisites
console.log('📋 Checking prerequisites...\n');

if (!checkCommand('node')) {
  console.error('❌ Node.js not found. Please install Node.js 16+');
  process.exit(1);
}
console.log('✅ Node.js found');

const pythonCommands = ['python3', 'python'];
let pythonCmd = null;

for (const cmd of pythonCommands) {
  if (checkCommand(cmd)) {
    pythonCmd = cmd;
    break;
  }
}

if (!pythonCmd) {
  console.error('❌ Python not found. Please install Python 3.7+');
  process.exit(1);
}
console.log(`✅ Python found: ${pythonCmd}`);

// Step 2: Check and install Node.js dependencies
console.log('\n📦 Checking Node.js dependencies...');

const requiredPackages = {
  'electron': '^27.0.0',
  'monaco-editor': '^0.44.0',
  'ws': '^8.14.2'
};

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  for (const [pkg, version] of Object.entries(requiredPackages)) {
    if (!dependencies[pkg]) {
      console.log(`Installing missing package: ${pkg}@${version}`);
      if (!runCommand(`npm install ${pkg}@${version}`)) {
        process.exit(1);
      }
    } else {
      console.log(`✅ ${pkg} found`);
    }
  }
} catch (error) {
  console.log('Installing all dependencies...');
  if (!runCommand('npm install')) {
    process.exit(1);
  }
}

// Step 3: Create necessary directories
console.log('\n📁 Creating project structure...');

const directories = [
  'src/backend/models',
  'src/renderer/assets', 
  'dist',
  'logs',
  'temp',
  'scripts'
];

directories.forEach(dir => createDirIfNotExists(dir));

// Step 4: Create Python requirements.txt
console.log('\n📝 Creating Python requirements...');

const requirements = `# AI Code Editor Python Dependencies
websockets>=11.0.0
aiohttp>=3.8.0
asyncio
requests>=2.31.0
openai>=1.0.0
python-dotenv>=1.0.0

# Optional: For enhanced features
colorama>=0.4.6
rich>=13.0.0
`;

writeFileIfNotExists('src/backend/requirements.txt', requirements);

// Step 5: Install Python dependencies
console.log('\n🐍 Setting up Python environment...');

const pipCommand = os.platform() === 'win32' ? 'pip' : 'pip3';

process.chdir('src/backend');
if (!runCommand(`${pipCommand} install -r requirements.txt`)) {
  console.log('⚠️ Python dependencies installation failed, but continuing...');
}
process.chdir('../..');

// Step 6: Create environment configuration
console.log('\n🔧 Creating environment configuration...');

const envTemplate = `# AI Code Editor Environment Variables
# Copy this file to .env and fill in your API keys

# =====================================
# AI API Keys (Choose one or more)
# =====================================

# OpenAI API Key (GPT models)
# Get from: https://platform.openai.com/api-keys
# OPENAI_API_KEY=sk-your-openai-key-here

# Groq API Key (Fast inference)
# Get from: https://console.groq.com/keys
# GROQ_API_KEY=gsk_your-groq-key-here

# Google Gemini API Key
# Get from: https://ai.google.dev/
# GEMINI_API_KEY=your-gemini-key-here

# OpenRouter API Key (Multiple models)
# Get from: https://openrouter.ai/keys
# OPENROUTER_API_KEY=sk-or-your-openrouter-key-here

# =====================================
# Backend Configuration
# =====================================
BACKEND_HOST=localhost
BACKEND_PORT=8765
HEALTH_PORT=8766

# =====================================
# Application Settings
# =====================================
DEFAULT_AI_MODE=online
DEFAULT_PERSONA=teacher
AUTO_SAVE_INTERVAL=30
MAX_CHAT_HISTORY=100

# =====================================
# Development Settings
# =====================================
DEBUG=false
DEV_TOOLS=false
NODE_ENV=production
`;

writeFileIfNotExists('.env.template', envTemplate);

// Create basic .env if it doesn't exist
if (!fs.existsSync('.env')) {
  const basicEnv = `# AI Code Editor Environment Variables
# Add your API keys here

BACKEND_HOST=localhost
BACKEND_PORT=8765
HEALTH_PORT=8766
DEFAULT_AI_MODE=online
DEFAULT_PERSONA=teacher
`;
  fs.writeFileSync('.env', basicEnv);
  console.log('✅ Created basic .env file');
}

// Step 7: Create application icon
console.log('\n🎨 Creating application assets...');

const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4ecdc4;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#44a08d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0e639c;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="256" height="256" rx="32" fill="url(#bg-gradient)"/>
  
  <!-- Robot head -->
  <circle cx="128" cy="100" r="45" fill="white" opacity="0.95" stroke="#0e639c" stroke-width="3"/>
  
  <!-- Eyes -->
  <circle cx="115" cy="90" r="8" fill="#0e639c"/>
  <circle cx="141" cy="90" r="8" fill="#0e639c"/>
  <circle cx="117" cy="88" r="3" fill="white"/>
  <circle cx="143" cy="88" r="3" fill="white"/>
  
  <!-- Mouth -->
  <path d="M 108 115 Q 128 125 148 115" stroke="#0e639c" stroke-width="3" fill="none" stroke-linecap="round"/>
  
  <!-- Antenna -->
  <line x1="128" y1="55" x2="128" y2="45" stroke="#0e639c" stroke-width="3" stroke-linecap="round"/>
  <circle cx="128" cy="42" r="4" fill="#4ecdc4"/>
  
  <!-- Code lines -->
  <rect x="64" y="160" width="128" height="6" rx="3" fill="white" opacity="0.9"/>
  <rect x="80" y="175" width="96" height="6" rx="3" fill="white" opacity="0.7"/>
  <rect x="96" y="190" width="64" height="6" rx="3" fill="white" opacity="0.5"/>
  <rect x="88" y="205" width="80" height="6" rx="3" fill="white" opacity="0.3"/>
  
  <!-- AI Text -->
  <text x="128" y="235" text-anchor="middle" fill="url(#text-gradient)" 
        font-family="Arial, sans-serif" font-size="28" font-weight="bold">AI</text>
</svg>`;

writeFileIfNotExists('src/renderer/assets/icon.svg', iconSvg);

// Create a simple PNG placeholder
const iconPlaceholder = `# Icon placeholder - replace with actual PNG
# This is a placeholder for the application icon
# Place your icon.png (256x256) in this directory
`;

writeFileIfNotExists('src/renderer/assets/icon.png', iconPlaceholder);

// Step 8: Create startup scripts
console.log('\n📝 Creating startup scripts...');

// Windows batch file
const windowsScript = `@echo off
title AI Code Editor
echo ============================================
echo           AI Code Editor Startup
echo ============================================
echo.

echo [1/4] Checking Python environment...
cd src\\backend
python -c "import sys; print(f'Python {sys.version}')" 2>nul
if errorlevel 1 (
    echo ❌ Python not found!
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

echo [2/4] Checking Python dependencies...
python -c "import websockets, aiohttp; print('✅ Dependencies OK')" 2>nul
if errorlevel 1 (
    echo 📦 Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Failed to install Python dependencies
        pause
        exit /b 1
    )
)

cd ..\\..

echo [3/4] Checking Node.js dependencies...
if not exist "node_modules" (
    echo 📦 Installing Node.js dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install Node.js dependencies
        pause
        exit /b 1
    )
)

echo [4/4] Starting AI Code Editor...
echo.
echo 🚀 Launching application...
echo.

npm start

if errorlevel 1 (
    echo.
    echo ❌ Application failed to start
    echo Check the error messages above
    pause
)

echo.
echo Application closed.
pause
`;

fs.writeFileSync('start-windows.bat', windowsScript);

// Unix shell script
const unixScript = `#!/bin/bash

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}           AI Code Editor Startup${NC}"
echo -e "${BLUE}============================================${NC}"
echo

echo -e "${YELLOW}[1/4] Checking Python environment...${NC}"
cd src/backend

if ! command -v ${pythonCmd} &> /dev/null; then
    echo -e "${RED}❌ Python not found!${NC}"
    echo "Please install Python 3.7+ from https://python.org"
    exit 1
fi

echo -e "${GREEN}✅ Python found: $(${pythonCmd} --version)${NC}"

echo -e "${YELLOW}[2/4] Checking Python dependencies...${NC}"
if ! ${pythonCmd} -c "import websockets, aiohttp" 2>/dev/null; then
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    ${pipCommand} install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Python dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Python dependencies OK${NC}"
fi

cd ../..

echo -e "${YELLOW}[3/4] Checking Node.js dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Node.js dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Node.js dependencies OK${NC}"
fi

echo -e "${YELLOW}[4/4] Starting AI Code Editor...${NC}"
echo
echo -e "${GREEN}🚀 Launching application...${NC}"
echo

npm start

if [ $? -ne 0 ]; then
    echo
    echo -e "${RED}❌ Application failed to start${NC}"
    echo "Check the error messages above"
    exit 1
fi

echo
echo "Application closed."
`;

fs.writeFileSync('start-unix.sh', unixScript);

// Make Unix script executable
try {
  execSync('chmod +x start-unix.sh');
  console.log('✅ Created executable startup scripts');
} catch (error) {
  console.log('✅ Created startup scripts (chmod failed on Windows)');
}

// Step 9: Create development setup script
console.log('\n🛠️ Creating development utilities...');

const setupDevScript = `#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

console.log('🛠️ Setting up AI Code Editor for development...\\n');

function runCommand(command, options = {}) {
  try {
    console.log(\`Running: \${command}\`);
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    console.error(\`❌ Command failed: \${command}\`);
    return false;
  }
}

// Install dependencies
console.log('📦 Installing dependencies...');
if (!runCommand('npm install')) {
  process.exit(1);
}

// Install Python dependencies
console.log('\\n🐍 Installing Python dependencies...');
const pipCommand = os.platform() === 'win32' ? 'pip' : 'pip3';

process.chdir('src/backend');
runCommand(\`\${pipCommand} install -r requirements.txt\`);
process.chdir('../..');

// Create .env if it doesn't exist
if (!fs.existsSync('.env')) {
  if (fs.existsSync('.env.template')) {
    fs.copyFileSync('.env.template', '.env');
    console.log('\\n✅ Created .env from template');
  }
}

console.log('\\n✅ Development setup complete!');
console.log('\\n📋 Next steps:');
console.log('1. Edit .env file with your API keys');
console.log('2. Run: npm start');
console.log('\\n📖 See README.md for detailed instructions');
`;

fs.writeFileSync('setup-dev.js', setupDevScript);

try {
  execSync('chmod +x setup-dev.js');
} catch (error) {
  // Ignore on Windows
}

// Step 10: Create comprehensive README
console.log('\n📚 Creating documentation...');

const buildReadme = `# AI Code Editor - Build & Setup Guide

## 🚀 Quick Start

### Automated Setup
\`\`\`bash
# Run the setup script
node scripts/build.js

# Or use the development setup
node setup-dev.js
\`\`\`

### Manual Setup

1. **Install Dependencies**
   \`\`\`bash
   npm install
   cd src/backend && pip install -r requirements.txt && cd ../..
   \`\`\`

2. **Configure Environment**
   \`\`\`bash
   cp .env.template .env
   # Edit .env with your API keys
   \`\`\`

3. **Start Application**
   \`\`\`bash
   npm start
   \`\`\`

## 🔧 Configuration

### API Keys
Choose one or more AI providers:

| Provider | API Key | Get Key From |
|----------|---------|--------------|
| OpenAI | \`OPENAI_API_KEY\` | https://platform.openai.com/api-keys |
| Groq | \`GROQ_API_KEY\` | https://console.groq.com/keys |
| Gemini | \`GEMINI_API_KEY\` | https://ai.google.dev/ |
| OpenRouter | \`OPENROUTER_API_KEY\` | https://openrouter.ai/keys |

### Environment Variables
\`\`\`env
# Required
BACKEND_HOST=localhost
BACKEND_PORT=8765

# Optional
DEFAULT_AI_MODE=online
DEFAULT_PERSONA=teacher
AUTO_SAVE_INTERVAL=30
\`\`\`

## 🌟 Features

- ✅ **File Operations**: Full CRUD operations on files and folders
- ✅ **Monaco Editor**: VS Code-like editing experience  
- ✅ **AI Assistant**: Multi-provider AI integration
- ✅ **Code Actions**: Explain, translate, optimize code
- ✅ **Multiple Personas**: Teacher, hacker, reviewer modes
- ✅ **Time Travel**: Code history snapshots
- ✅ **Online/Offline**: Toggle between AI modes
- ✅ **Multi-language**: Syntax highlighting for 20+ languages

## 🛠️ Development

### Prerequisites
- Node.js 16+
- Python 3.7+
- Git

### Development Mode
\`\`\`bash
# Enable development mode
export NODE_ENV=development
npm start
\`\`\`

### Building for Distribution
\`\`\`bash
npm run build
\`\`\`

## 🚨 Troubleshooting

### Python Backend Issues
- **Port in use**: Change \`BACKEND_PORT\` in .env
- **Dependencies missing**: Run \`pip install -r src/backend/requirements.txt\`
- **Permission denied**: Check Python installation and PATH

### AI Features Not Working
- **No API key**: Set at least one API key in .env
- **Rate limited**: Check your API usage and billing
- **Network issues**: Check internet connection for online mode

### Monaco Editor Issues
- **Editor not loading**: Clear browser cache
- **Syntax highlighting broken**: Reinstall with \`npm install monaco-editor\`

## 📁 Project Structure

\`\`\`
ai-code-editor/
├── main.js                 # Electron main process
├── preload.js             # Secure bridge to renderer
├── src/
│   ├── renderer/          # Frontend (HTML/CSS/JS)
│   │   ├── index.html
│   │   ├── index.js       # Main application logic
│   │   ├── style.css      # UI styling
│   │   └── assets/        # Icons and images
│   └── backend/           # Python AI backend
│       ├── api.py         # WebSocket server
│       ├── ai_engine.py   # AI provider integration
│       └── models/        # Local AI models (optional)
├── scripts/
│   └── build.js           # Build and setup script
└── package.json
\`\`\`

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly  
5. Submit a pull request

## 📞 Support

- Check the troubleshooting section
- Review console logs for errors
- Verify all prerequisites are met
- Ensure API keys are correctly set
`;

fs.writeFileSync('BUILD.md', buildReadme);

// Step 11: Final validation
console.log('\n🧪 Validating build...');

const validationChecks = [
  { name: 'package.json', path: 'package.json' },
  { name: 'Main process', path: 'main.js' },
  { name: 'Preload script', path: 'preload.js' },
  { name: 'Frontend HTML', path: 'src/renderer/index.html' },
  { name: 'Python requirements', path: 'src/backend/requirements.txt' },
  { name: 'Environment template', path: '.env.template' },
  { name: 'Assets directory', path: 'src/renderer/assets' },
  { name: 'Backend directory', path: 'src/backend' }
];

let allValid = true;
validationChecks.forEach(check => {
  if (fs.existsSync(check.path)) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name} - Missing: ${check.path}`);
    allValid = false;
  }
});

// Final summary
console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('🎉 Build completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Edit .env file with your AI API keys');
  console.log('2. Run startup script:');
  console.log('   - Windows: start-windows.bat');
  console.log('   - Unix/macOS: ./start-unix.sh');
  console.log('   - Or: npm start');
  console.log('\n📖 See BUILD.md for detailed instructions');
} else {
  console.log('❌ Build completed with issues');
  console.log('Please check the missing files above');
  process.exit(1);
}
console.log('='.repeat(50));