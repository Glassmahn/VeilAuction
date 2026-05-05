#!/bin/bash
# VeilAuction Devnet Deployment Script
# Run this inside WSL2 (Ubuntu) after installing the Arcium toolchain
# Usage: ./deploy-devnet.sh

set -e

echo "=== VeilAuction Devnet Deployment ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}WARN: $1${NC}"
}

success() {
    echo -e "${GREEN}$1${NC}"
}

info() {
    echo -e "$1"
}

# Prerequisite checks
info "Checking prerequisites..."

command -v arcium >/dev/null 2>&1 || error "arcium CLI not found. Install via: curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash"
command -v solana >/dev/null 2>&1 || error "solana CLI not found. Install from https://docs.solanalabs.com/cli/install"
command -v anchor >/dev/null 2>&1 || error "anchor CLI not found. Install via: cargo install --locked anchor-cli --version 0.32.1"
command -v yarn >/dev/null 2>&1 || error "yarn not found. Install via: npm install -g yarn"

success "All prerequisites found."
echo ""

# Check Solana config
SOLANA_CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
info "Current Solana cluster: $SOLANA_CLUSTER"

if [[ "$SOLANA_CLUSTER" != *"devnet"* ]]; then
    info "Switching Solana CLI to devnet..."
    solana config set --url https://api.devnet.solana.com
    success "Switched to devnet."
fi

echo ""

# Check wallet
WALLET_PATH=$(solana config get | grep "Keypair Path" | awk '{print $3}')
if [[ ! -f "$WALLET_PATH" ]]; then
    warn "No wallet found. Creating one..."
    solana-keygen new
    WALLET_PATH=$(solana config get | grep "Keypair Path" | awk '{print $3}')
fi

WALLET_ADDR=$(solana address)
info "Wallet: $WALLET_ADDR"

# Check balance
BALANCE=$(solana balance --url https://api.devnet.solana.com | awk '{print $1}')
info "Devnet SOL balance: $BALANCE"

# Airdrop if balance is low
BALANCE_INT=$(echo "$BALANCE" | cut -d'.' -f1)
if [[ "$BALANCE_INT" -lt 2 ]]; then
    warn "Low balance. Requesting airdrop..."
    solana airdrop 5 --url https://api.devnet.solana.com
    success "Airdropped 5 SOL."
fi

echo ""

# Install dependencies
info "Installing npm dependencies..."
yarn install
success "Dependencies installed."
echo ""

# Build the program
info "Building VeilAuction program with Arcium..."
arcium build
success "Build complete."
echo ""

# Deploy
info "Deploying to devnet..."
DEPLOY_OUTPUT=$(arcium deploy --provider.cluster devnet 2>&1) || error "Deployment failed: $DEPLOY_OUTPUT"
echo "$DEPLOY_OUTPUT"

# Extract program ID from output
PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP '[A-HJ-NP-Za-km-z]{32,44}' | head -1)

if [[ -n "$PROGRAM_ID" ]]; then
    success "Program deployed: $PROGRAM_ID"
else
    warn "Could not extract program ID from output. Update Anchor.toml and .env.local manually."
fi

echo ""

# Update .env.local with deployed program ID
if [[ -n "$PROGRAM_ID" ]]; then
    ENV_FILE=".env.local"
    if [[ -f "$ENV_FILE" ]]; then
        sed -i "s/NEXT_PUBLIC_VEIL_AUCTION_PROGRAM_ID=.*/NEXT_PUBLIC_VEIL_AUCTION_PROGRAM_ID=$PROGRAM_ID/" "$ENV_FILE"
        success "Updated .env.local with program ID: $PROGRAM_ID"
    fi
fi

# Update Anchor.toml
if [[ -n "$PROGRAM_ID" ]]; then
    sed -i "s/\[programs\.devnet\]/[programs.devnet]\nveil_auction = \"$PROGRAM_ID\"/" Anchor.toml 2>/dev/null || true
    sed -i 's/veil_auction = "VeiLAUcTi0nS3a1aN4ucti0nP1atform77777777777"/veil_auction = "'"$PROGRAM_ID"'"/' Anchor.toml
    success "Updated Anchor.toml with program ID."
fi

echo ""

# Initialize computation definitions
info "Initializing computation definitions on devnet..."

# Set Arcium environment for devnet
export ARCIUM_ENV=devnet
export ARCIUM_CLUSTER_OFFSET=0

# Run comp def initialization
arcium test --cluster devnet 2>&1 | tee test-output.log || warn "Some tests may have failed. Check test-output.log for details."

echo ""
echo "========================================"
success "  Deployment Summary"
echo "========================================"
echo "  Program ID: ${PROGRAM_ID:-Check deploy output above}"
echo "  Cluster: devnet"
echo "  Wallet: $WALLET_ADDR"
echo ""
echo "  Next steps:"
echo "  1. Update .env.local NEXT_PUBLIC_VEIL_AUCTION_PROGRAM_ID"
echo "  2. Update Arcium.toml cluster offset for devnet"
echo "  3. Restart Next.js: npm run dev"
echo "  4. Open http://localhost:3000/dashboard"
echo "========================================"
