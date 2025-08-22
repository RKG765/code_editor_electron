const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building AI Code Editor...\n');

// Check if all dependencies are installed
console.log('📦 Checking dependencies...');
try {
  execSync('npm list monaco-editor', { stdio: 'ignore' });
  console.log('✅ Monaco Editor found');
} catch (error) {
  console.log('❌ Monaco Editor not found, installing...');
  execSync('npm install monaco-editor@^0.44.0', { stdio: 'inherit' });
}

try {
  execSync('npm list ws', { stdio: 'ignore' });
  console.log('✅ WebSocket library found');
} catch (error) {
  console.log('❌ WebSocket library not found, installing...');
  execSync('npm install ws@^8.14.2', { stdio: 'inherit' });
}

// Check Python dependencies
console.log('\n🐍 Checking Python environment...');
try {
  execSync('python --version', { stdio: 'pipe' });
  console.log('✅ Python found');
} catch (error) {
  console.log('❌ Python not found. Please install Python 3.7+');
  process.exit(1);
}

// Create necessary directories
const dirsToCreate = [
  'src/backend/models',
  'src/renderer/assets',
  'dist'
];

console.log('\n📁 Creating directories...');
dirsToCreate.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created ${dir}`);
  } else {
    console.log(`✅ ${dir} exists`);
  }
});

// Create requirements.txt for Python
console.log('\n📝 Creating Python requirements...');
const requirements = `websockets>=11.0
asyncio
requests>=2.31.0
openai>=1.0.0
python-dotenv>=1.0.0`;

fs.writeFileSync('src/backend/requirements.txt', requirements);
console.log('✅ Created requirements.txt');

// Create .env template
console.log('\n🔧 Creating environment template...');
const envTemplate = `# AI Code Editor Environment Variables
# Uncomment and fill in your API keys

# OpenAI API Key (for online mode)
# OPENAI_API_KEY=your_openai_api_key_here

# Groq API Key (alternative for online mode)
# GROQ_API_KEY=your_groq_api_key_here

# Backend Configuration
BACKEND_HOST=localhost
BACKEND_PORT=8765
HEALTH_PORT=8766

# Model Configuration (for offline mode)
# LLAMA_MODEL_PATH=./models/your-model.gguf
# LLAMA_EXECUTABLE=./llama`;

fs.writeFileSync('.env', envTemplate);
console.log('✅ Created .env template');

// Create a simple icon
console.log('\n🎨 Creating application icon...');
const iconPath = 'src/renderer/assets/icon.png';
if (!fs.existsSync(iconPath)) {
  // Create a simple SVG icon and save as PNG placeholder
  const iconSvg = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" fill="#1e1e1e"/>
    <circle cx="128" cy="128" r="80" fill="#4ecdc4"/>
    <text x="128" y="140" text-anchor="middle" fill="#1e1e1e" font-family="Arial" font-size="60" font-weight="bold">AI</text>
  </svg>`;
  
  // For now, just create a placeholder file
  fs.writeFileSync('src/renderer/assets/icon.svg', iconSvg);
  console.log('✅ Created application icon (SVG)');
} else {
  console.log('✅ Application icon exists');
}

// Create startup scripts
console.log('\n🔧 Creating startup scripts...');

// Windows batch file
const windowsScript = `@echo off
echo Starting AI Code Editor...

echo Installing Python dependencies...
cd src\\backend
pip install -r requirements.txt
cd ..\\..

echo Starting Electron application...
npm start

pause`;

fs.writeFileSync('start-windows.bat', windowsScript);

// Unix shell script
const unixScript = `#!/bin/bash
echo "Starting AI Code Editor..."

echo "Installing Python dependencies..."
cd src/backend
pip3 install -r requirements.txt
cd ../..

echo "Starting Electron application..."
npm start`;

fs.writeFileSync('start-unix.sh', unixScript);

// Make Unix script executable
try {
  execSync('chmod +x start-unix.sh');
} catch (error) {
  // Ignore on Windows
}

console.log('✅ Created startup scripts');

// Create development setup script
console.log('\n🛠️ Creating development setup...');

const devSetup = `#!/usr/bin/env node
const { execSync } = require('child_process');
const os = require('os');

console.log('🛠️ Setting up AI Code Editor for development...\\n');

// Install Node.js dependencies
console.log('📦 Installing Node.js dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Node.js dependencies installed');
} catch (error) {
  console.error('❌ Failed to install Node.js dependencies');
  process.exit(1);
}

// Install Python dependencies
console.log('\\n🐍 Installing Python dependencies...');
try {
  process.chdir('src/backend');
  const pipCommand = os.platform() === 'win32' ? 'pip' : 'pip3';
  execSync(\`\${pipCommand} install -r requirements.txt\`, { stdio: 'inherit' });
  console.log('✅ Python dependencies installed');
  process.chdir('../..');
} catch (error) {
  console.error('❌ Failed to install Python dependencies');
  console.error('Make sure Python 3.7+ and pip are installed');
  process.exit(1);
}

console.log('\\n✅ Development setup complete!');
console.log('\\nTo start the application:');
console.log('- npm start (or use start-windows.bat / start-unix.sh)');
console.log('\\nTo enable AI features:');
console.log('- Edit .env file with your API keys');
console.log('- Or place a GGUF model in src/backend/models/ for offline mode');`;

fs.writeFileSync('setup-dev.js', devSetup);

try {
  execSync('chmod +x setup-dev.js');
} catch (error) {
  // Ignore on Windows
}

console.log('✅ Created development setup script');

// Create README for the build
console.log('\n📖 Creating build README...');

const buildReadme = `# AI Code Editor - Build Instructions

## Quick Start

1. **Run setup:**
   \`\`\`bash
   node setup-dev.js
   \`\`\`

2. **Start the application:**
   - Windows: Double-click \`start-windows.bat\`
   - Unix/Linux/macOS: \`./start-unix.sh\`
   - Or use: \`npm start\`

## Manual Setup

### Prerequisites
- Node.js 16+
- Python 3.7+
- pip (Python package manager)

### Installation Steps

1. **Install Node.js dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Install Python dependencies:**
   \`\`\`bash
   cd src/backend
   pip install -r requirements.txt
   cd ../..
   \`\`\`

3. **Configure AI Services (Optional):**
   
   Edit \`.env\` file:
   \`\`\`env
   # For online AI mode
   OPENAI_API_KEY=your_key_here
   # OR
   GROQ_API_KEY=your_key_here
   
   # For offline AI mode
   # Place .gguf model files in src/backend/models/
   # Install llama.cpp binary
   \`\`\`

## Building for Distribution

\`\`\`bash
npm run build
\`\`\`

This will create distributables in the \`dist/\` folder.

## Features

- ✅ **File Explorer**: CRUD operations
- ✅ **Monaco Editor**: VS Code-like editing
- ✅ **AI Chat**: Programming assistant
- ✅ **Code Actions**: Explain, Translate, Optimize
- ✅ **Multiple Personas**: Teacher, Hacker, Reviewer
- ✅ **Time Travel**: Code history snapshots
- ✅ **Online/Offline AI**: Toggle between modes
- ✅ **Multi-language Support**: Syntax highlighting

## Troubleshooting

### Python Backend Not Starting
- Check Python version: \`python --version\`
- Install dependencies: \`pip install -r src/backend/requirements.txt\`
- Check firewall settings for ports 8765-8766

### AI Features Not Working
- **Online mode**: Check API keys in \`.env\`
- **Offline mode**: Place GGUF model in \`src/backend/models/\`
- Check console for error messages

### Monaco Editor Issues
- Clear browser cache
- Reinstall: \`rm -rf node_modules && npm install\`
- Check Monaco Editor paths in HTML
`;

fs.writeFileSync('BUILD.md', buildReadme);
console.log('✅ Created BUILD.md');

console.log('\n🎉 Build setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Run: node setup-dev.js');
console.log('2. Configure .env with your AI API keys');
console.log('3. Start the app: npm start');
console.log('\n📖 See BUILD.md for detailed instructions');