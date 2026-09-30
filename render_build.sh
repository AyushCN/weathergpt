#!/bin/bash

# Exit on error
set -o errexit

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r backend/requirements.txt

# Install frontend dependencies and build
echo "Building frontend..."
cd frontend
NODE_ENV=development npm install
npm run build
cd ..

echo "Build complete!"
