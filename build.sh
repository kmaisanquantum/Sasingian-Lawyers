#!/usr/bin/env bash
# Exit on any error
set -e

echo "--- 🚀 Starting Build Process ---"

# Build Backend
echo "--- 📦 Installing Backend Dependencies ---"
cd backend
npm install
cd ..

# Build Frontend
echo "--- 📦 Installing Frontend Dependencies ---"
cd frontend
# We use --include=dev to ensure build tools like Vite are installed
# even if NODE_ENV is set to production
npm install --include=dev

echo "--- 🏗️ Building Frontend ---"
# Run build and ensure it succeeds
npm run build
cd ..

# Stage Assets
echo "--- 📂 Staging Frontend Assets for Backend ---"
# Create public directory in backend if it doesn't exist
mkdir -p backend/public
# Clean out existing files
rm -rf backend/public/*
# Copy built assets from frontend/dist to backend/public
cp -r frontend/dist/* backend/public/

echo "--- ✅ Build Complete ---"
