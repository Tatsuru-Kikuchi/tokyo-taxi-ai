#!/bin/bash

# 🚕 全国AIタクシー Backend Reorganization Script
# Version 3.0.1

echo "================================================"
echo "🚕 全国AIタクシー Backend Reorganization Script"
echo "================================================"
echo ""

# Check if we're in the backend directory
if [ ! -f "server.js" ] && [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the backend directory"
    echo "Please run: cd ~/tokyo-taxi-ai/backend"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Step 1: Create backup
echo "Step 1: Creating backup..."
BACKUP_DIR="../backend-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo "✅ Backup created at: $BACKUP_DIR"
echo ""

# Step 2: Create new directory structure
echo "Step 2: Creating directory structure..."
mkdir -p config services data
echo "✅ Directories created: config/, services/, data/"
echo ""

# Step 3: Move and rename files
echo "Step 3: Reorganizing files..."

# Move configuration files
if [ -f "serviceAccountKey.json" ]; then
    mv serviceAccountKey.json config/
    echo "  ✅ Moved serviceAccountKey.json → config/"
fi

# Move and rename service files
if [ -f "japan-stations.js" ]; then
    mv japan-stations.js services/station-service.js
    echo "  ✅ Renamed japan-stations.js → services/station-service.js"
fi

if [ -f "square-payment-service.js" ]; then
    mv square-payment-service.js services/payment-service.js
    echo "  ✅ Renamed square-payment-service.js → services/payment-service.js"
fi

if [ -f "odpt-service.js" ]; then
    mv odpt-service.js services/
    echo "  ✅ Moved odpt-service.js → services/"
fi

# Move data files
if [ -f "tokyo-stations.js" ]; then
    mv tokyo-stations.js data/
    echo "  ✅ Moved tokyo-stations.js → data/"
fi

echo ""

# Step 4: Clean up old/duplicate files
echo "Step 4: Cleaning up old files..."
if [ -f "server-complete.js" ]; then
    rm server-complete.js
    echo "  ✅ Removed server-complete.js (old version)"
fi

# Remove empty directories if they exist
if [ -d "routes" ] && [ -z "$(ls -A routes 2>/dev/null)" ]; then
    rmdir routes
    echo "  ✅ Removed empty routes/ directory"
fi

if [ -d "src" ] && [ -z "$(ls -A src 2>/dev/null)" ]; then
    rmdir src
    echo "  ✅ Removed empty src/ directory"
fi

echo ""

# Step 5: Create .gitignore
echo "Step 5: Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development
.env.production

# Sensitive files
config/serviceAccountKey.json
*.key
*.pem
*.cert

# Backup files
backup/
*.backup
*.bak

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Logs
logs/
*.log

# Testing
coverage/
.nyc_output/

# Build files
dist/
build/
EOF
echo "✅ .gitignore created"
echo ""

# Step 6: Create .env.example
echo "Step 6: Creating .env.example..."
cat > .env.example << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=8080

# API Keys
GOOGLE_MAPS_API_KEY=AIzaSyBq3VeVVbuM0sdmGLZN2PD5ns1xaoE3qUQ
WEATHER_API_KEY=bd17578f85cb46d681ca3e4f3bdc9963

# Payment (Square)
SQUARE_ACCESS_TOKEN=EAAAlyq9gGAbEBVYkjw6K6emJ0uMGzv6_pvr1VAK1zijai-oxytvuSK481nLtxkp
SQUARE_LOCATION_ID=LNEWVTK44Y8KT
SQUARE_ENVIRONMENT=sandbox

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json

# LINE Integration
LINE_CHANNEL_ID=2007928791
LINE_CHANNEL_ACCESS_TOKEN=7302c88d22457d1b79e8cd34e4f9e7e0

# ODPT (Train API)
ODPT_API_KEY=pv3srzgo4tfolzf0a323n4zmsng5j1gl81yk3mwwrirfxzfxjqbsc5ki0byh0xn6
EOF
echo "✅ .env.example created"
echo ""

# Step 7: Update server.js imports if it exists
echo "Step 7: Updating server.js imports..."
if [ -f "server.js" ]; then
    # Create a temporary file with updated imports
    sed -e "s|require('./japan-stations')|require('./services/station-service')|g" \
        -e "s|require('./square-payment-service')|require('./services/payment-service')|g" \
        -e "s|require('./odpt-service')|require('./services/odpt-service')|g" \
        -e "s|require('./tokyo-stations')|require('./data/tokyo-stations')|g" \
        server.js > server.js.tmp

    mv server.js.tmp server.js
    echo "✅ Updated import paths in server.js"
else
    echo "⚠️  server.js not found - skipping import updates"
fi
echo ""

# Step 8: Create README if it doesn't exist
if [ ! -f "README.md" ]; then
    echo "Step 8: Creating README.md..."
    cat > README.md << 'EOF'
# 🚕 全国AIタクシー Backend

## Version 3.0.1

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production server
npm start
```

## Directory Structure

```
backend/
├── server.js              # Main server file
├── config/               # Configuration files
│   └── serviceAccountKey.json  # Firebase (git-ignored)
├── services/            # Service modules
│   ├── station-service.js
│   ├── payment-service.js
│   └── odpt-service.js
├── data/               # Static data
│   └── tokyo-stations.js
└── backup/            # Backup files (git-ignored)
```

## Environment Variables

Copy `.env.example` to `.env` and add your API keys.

## Deployment

### Railway
- Root Directory: `backend`
- Start Command: `npm start`

### Local
```bash
npm run dev
```
EOF
    echo "✅ README.md created"
else
    echo "Step 8: README.md already exists - skipping"
fi
echo ""

# Step 9: Display summary
echo "================================================"
echo "📊 Reorganization Summary"
echo "================================================"
echo ""
echo "✅ Directory structure:"
echo "   backend/"
echo "   ├── config/"
[ -f "config/serviceAccountKey.json" ] && echo "   │   └── serviceAccountKey.json"
echo "   ├── services/"
[ -f "services/station-service.js" ] && echo "   │   ├── station-service.js"
[ -f "services/payment-service.js" ] && echo "   │   ├── payment-service.js"
[ -f "services/odpt-service.js" ] && echo "   │   └── odpt-service.js"
echo "   ├── data/"
[ -f "data/tokyo-stations.js" ] && echo "   │   └── tokyo-stations.js"
echo "   ├── server.js"
echo "   ├── package.json"
echo "   ├── .env"
echo "   ├── .env.example"
echo "   └── .gitignore"
echo ""

# Step 10: Check for potential issues
echo "⚠️  Important Reminders:"
echo ""
echo "1. NEVER commit these files to Git:"
echo "   - .env (contains real API keys)"
echo "   - config/serviceAccountKey.json (Firebase credentials)"
echo ""
echo "2. Your .env file should have:"
echo "   - PORT=8080 (or 3000 if you prefer)"
echo "   - All your API keys WITHOUT quotes"
echo ""
echo "3. Before pushing to GitHub:"
echo "   git status  # Make sure .env is NOT listed"
echo ""

# Step 11: Test the server
echo "================================================"
echo "Would you like to test the server now? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Installing dependencies..."
    npm install

    echo ""
    echo "Starting server for testing..."
    echo "Server will run for 10 seconds then stop automatically..."
    echo ""

    # Start server in background
    npm start &
    SERVER_PID=$!

    # Wait a bit for server to start
    sleep 3

    # Test health endpoint
    echo ""
    echo "Testing health endpoint..."
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Server is running!"
        curl -s http://localhost:8080/health | python -m json.tool 2>/dev/null || curl -s http://localhost:8080/health
    else
        echo "Server might still be starting..."
    fi

    # Kill the server after a few seconds
    sleep 5
    kill $SERVER_PID 2>/dev/null

    echo ""
    echo "✅ Server test complete!"
fi

echo ""
echo "================================================"
echo "✨ Reorganization Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Review the changes"
echo "2. Test locally: npm start"
echo "3. Commit to Git: git add . && git commit -m 'Reorganized backend structure v3.0.1'"
echo "4. Push to GitHub: git push origin main"
echo "5. Railway will auto-deploy!"
echo ""
echo "Need help? Check the README.md file"
echo ""
