#!/usr/bin/env bash

#
# Rivalis Live - Quick Setup Script
# Initializes the project for development or production
#

set -e

if [ "$1" = "" ]; then
    echo "Usage: bash setup.sh [dev|prod|termux]"
    echo ""
    echo "Options:"
    echo "  dev    - Setup for local development"
    echo "  prod   - Setup for production deployment"
    echo "  termux - Setup for Android Termux"
    exit 1
fi

MODE=$1
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "======================================"
echo "   🏋️ RIVALIS LIVE - SETUP SCRIPT"
echo "======================================"
echo -e "${NC}"

# Check Node.js
echo -e "${YELLOW}📋 Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"

echo ""
echo -e "${YELLOW}📋 Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}⚠️ npm not found. Please install npm${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm $NPM_VERSION${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd live-server
echo "  • Installing live-server dependencies..."
npm install > /dev/null 2>&1 || npm install
cd ..

cd discord-bot
echo "  • Installing discord-bot dependencies..."
npm install > /dev/null 2>&1 || npm install
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Environment setup
echo ""
echo -e "${YELLOW}🔐 Setting up environment files...${NC}"

if [ ! -f "live-server/.env" ]; then
    echo "  • Creating live-server/.env from template..."
    cp live-server/.env.example live-server/.env
    echo -e "${YELLOW}    ⚠️ Please edit live-server/.env with your Firebase credentials${NC}"
else
    echo "  • live-server/.env already exists (skipped)"
fi

if [ ! -f "discord-bot/.env" ]; then
    echo "  • Creating discord-bot/.env from template..."
    cp discord-bot/.env.example discord-bot/.env
    echo -e "${YELLOW}    ⚠️ Please edit discord-bot/.env with your Discord credentials${NC}"
else
    echo "  • discord-bot/.env already exists (skipped)"
fi

echo -e "${GREEN}✅ Environment files ready${NC}"

# Mode-specific setup
echo ""
echo -e "${YELLOW}⚙️ Configuring for $MODE mode...${NC}"

case $MODE in
    dev)
        echo "  • Development mode selected"
        echo -e "${GREEN}✅ Ready for development!${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "  1. Edit environment files:"
        echo "     - live-server/.env (add Firebase credentials)"
        echo "     - discord-bot/.env (add Discord credentials)"
        echo ""
        echo "  2. Start live server (Terminal 1):"
        echo "     cd live-server && npm start"
        echo ""
        echo "  3. Start Discord bot (Terminal 2):"
        echo "     cd discord-bot && npm start"
        echo ""
        echo "  4. Test the API (Terminal 3):"
        echo "     node API_TEST.js"
        echo ""
        ;;
    
    prod)
        echo "  • Production mode selected"
        
        # Check for PM2
        if ! command -v pm2 &> /dev/null; then
            echo -e "${YELLOW}    Installing PM2...${NC}"
            npm install -g pm2 > /dev/null 2>&1
        fi
        
        echo -e "${GREEN}✅ Production ready!${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "  1. Edit .env files with production credentials"
        echo ""
        echo "  2. Start with PM2:"
        echo "     pm2 start ecosystem.config.js --env production"
        echo ""
        echo "  3. Setup auto-start:"
        echo "     pm2 startup systemd"
        echo "     pm2 save"
        echo ""
        echo "  4. Monitor:"
        echo "     pm2 monit"
        echo ""
        ;;
    
    termux)
        echo "  • Android Termux mode selected"
        
        # Check for PM2
        if ! command -v pm2 &> /dev/null; then
            echo -e "${YELLOW}    Installing PM2...${NC}"
            npm install -g pm2 > /dev/null 2>&1
        fi
        
        echo -e "${GREEN}✅ Termux ready!${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "  1. Edit .env files with your credentials"
        echo ""
        echo "  2. Allow wake lock (recommended):"
        echo "     termux-wake-lock"
        echo ""
        echo "  3. Start services:"
        echo "     pm2 start ecosystem.config.js --env production"
        echo ""
        echo "  4. (Optional) Setup auto-start with Termux:Boot:"
        echo "     mkdir -p ~/.termux/boot"
        echo "     # Create ~/.termux/boot/start.sh with pm2 start command"
        echo ""
        echo "  5. Monitor:"
        echo "     pm2 logs"
        echo ""
        ;;
    
    *)
        echo -e "${YELLOW}Unknown mode: $MODE${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}================================================"
echo "✅ Setup complete! Start following the instructions above"
echo "================================================${NC}"
echo ""
