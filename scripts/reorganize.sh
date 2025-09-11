#!/bin/bash

echo "🔧 Reorganizing backend directory structure..."

# Create new directories
mkdir -p config services data

# Move files to appropriate directories
echo "📁 Moving configuration files..."
[ -f "serviceAccountKey.json" ] && mv serviceAccountKey.json config/

echo "📁 Moving service files..."
[ -f "japan-stations.js" ] && mv japan-stations.js services/station-service.js
[ -f "square-payment-service.js" ] && mv square-payment-service.js services/payment-service.js
[ -f "odpt-service.js" ] && mv odpt-service.js services/

echo "📁 Moving data files..."
[ -f "tokyo-stations.js" ] && mv tokyo-stations.js data/

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
  echo "📝 Creating .gitignore..."
  cat > .gitignore << 'EOF'
node_modules/
.env
config/serviceAccountKey.json
backup/
*.log
.DS_Store
EOF
fi

# Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
  echo "📝 Creating .env.example..."
  cat > .env.example << 'EOF'
NODE_ENV=production
PORT=8080
GOOGLE_MAPS_API_KEY=your_key_here
WEATHER_API_KEY=your_key_here
EOF
fi

echo "✅ Reorganization complete!"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Update your server.js imports to use new paths:"
echo "   - require('./services/station-service')"
echo "   - require('./services/payment-service')"
echo "   - require('./services/odpt-service')"
echo ""
echo "2. Make sure serviceAccountKey.json is in .gitignore"
echo ""
echo "3. Consider removing server-complete.js if it's an old version"
echo ""
echo "Directory structure is now organized! 🎉"
