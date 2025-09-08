#!/bin/bash
echo "🔧 Fixing all issues..."
nvm use
rm -rf node_modules ~/node_modules .expo package-lock.json
npm install
echo "✅ Fixed! Run ./start.sh to start"
