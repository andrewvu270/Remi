#!/bin/bash

# AI Academic Scheduler Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up AI Academic Scheduler development environment..."
echo "This will set up both backend and frontend services with Docker."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed."
    echo ""
    echo "📖 Please follow the installation guide at INSTALL.md"
    echo "   - macOS: Install Docker Desktop via Homebrew"
    echo "   - Windows: Download from docker.com"
    echo "   - Linux: Use your package manager"
    echo ""
    echo "After installing Docker, restart your computer and run this script again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    echo "Please install Docker Compose and try again."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running."
    echo "Please start Docker Desktop (macOS/Windows) or Docker service (Linux) and try again."
    exit 1
fi

# Create backend/.env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env file from template..."
    cp backend/.env.example backend/.env
    echo ""
    echo "⚠️  IMPORTANT: You must edit the backend/.env file before continuing!"
    echo ""
    echo "Required steps:"
    echo "1. Get OpenAI API Key: https://platform.openai.com/api-keys"
    echo "2. Get Groq API Key: https://console.groq.com/keys"
    echo "3. Edit backend/.env file and add your API keys"
    echo "4. Generate a secure SECRET_KEY for JWT"
    echo ""
    echo "Optional: Supabase setup (if using instead of local PostgreSQL)"
    echo "   - URL and Keys: https://supabase.com/dashboard"
    echo ""
    read -p "Press Enter after you've configured your backend/.env file..."
else
    echo "✅ backend/.env file already exists"
    
    # Check if OpenAI API key is configured
    if grep -q "your_openai_api_key" backend/.env; then
        echo ""
        echo "⚠️  WARNING: OpenAI API key is not configured in backend/.env file"
        echo "   Please edit backend/.env and add your actual OPENAI_API_KEY"
        echo "   Get your key at: https://platform.openai.com/api-keys"
        echo ""
        read -p "Press Enter to continue anyway..."
    fi
    
    # Check if Groq API key is configured
    if grep -q "your_groq_api_key" backend/.env; then
        echo ""
        echo "⚠️  WARNING: Groq API key is not configured in backend/.env file"
        echo "   Please edit backend/.env and add your actual GROQ_API_KEY"
        echo "   Get your key at: https://console.groq.com/keys"
        echo ""
        read -p "Press Enter to continue anyway..."
    fi
    
    # Check if Supabase credentials are configured
    if grep -q "your-project-id.supabase.co" backend/.env; then
        echo ""
        echo "⚠️  WARNING: Supabase credentials are not configured in backend/.env file"
        echo "   Please edit backend/.env and add your actual Supabase credentials"
        echo "   Get your credentials at: https://supabase.com/dashboard"
        echo ""
        read -p "Press Enter to continue anyway..."
    fi
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads

# Build and start Docker containers
echo "🐳 Building and starting Docker containers..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    # Try installing with npx (no global permissions needed)
    if command -v npx &> /dev/null; then
        echo "Using npx to install Supabase CLI (no global permissions needed)..."
        echo "Note: You'll need to use 'npx supabase' instead of 'supabase' in commands"
    else
        echo "⚠️  Could not install Supabase CLI automatically."
        echo "Please install it manually:"
        echo "  npm install -g supabase"
        echo "Or visit: https://supabase.com/docs/reference/cli"
    fi
fi

# Run database migrations
echo "🗄️ Running database migrations..."
if command -v supabase &> /dev/null; then
    # Try to run migrations with Supabase CLI
    supabase db push 2>/dev/null || echo "⚠️  Could not run migrations automatically. Please run 'supabase db push' manually after linking your project."
elif command -v npx &> /dev/null; then
    # Try with npx
    npx supabase db push 2>/dev/null || echo "⚠️  Could not run migrations automatically. Please run 'npx supabase db push' manually after linking your project."
else
    echo "⚠️  Supabase CLI not found. Please install it and run 'supabase db push' manually."
fi

# Seed sample data
echo "🌱 Seeding sample data..."
docker-compose exec backend python scripts/seed_data.py

# Check if services are running
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running successfully!"
    echo ""
    echo "🌐 Access your application:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:8000"
    echo "   - API Documentation: http://localhost:8000/docs"
    echo "   - Supabase Dashboard: https://supabase.com/dashboard"
    echo ""
    echo "📚 Useful commands:"
    echo "   - View logs: docker-compose logs -f"
    echo "   - Stop services: docker-compose down"
    echo "   - Restart services: docker-compose restart"
    echo "   - Access backend shell: docker-compose exec backend bash"
    echo "   - Run migrations: supabase db push"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Edit backend/.env file with your API keys"
    echo "   2. Link your Supabase project:"
    if command -v supabase &> /dev/null; then
        echo "      supabase link --project-ref your-project-id"
    elif command -v npx &> /dev/null; then
        echo "      npx supabase link --project-ref your-project-id"
    else
        echo "      [install supabase CLI first]"
    fi
    echo "   3. Run migrations:"
    if command -v supabase &> /dev/null; then
        echo "      supabase db push"
    elif command -v npx &> /dev/null; then
        echo "      npx supabase db push"
    else
        echo "      [install supabase CLI first]"
    fi
    echo "   4. Visit http://localhost:3000 to use the application"
    echo "   5. Visit http://localhost:8000/docs to test the API"
else
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

echo "🎉 Setup completed successfully!"