#!/bin/bash

echo "🚀 Starting Parallel Voting App Cluster..."

# Create necessary directories
mkdir -p master/data slave1/data slave2/data slave3/data redis/data logs

# Set proper permissions
chmod 755 master/data slave1/data slave2/data slave3/data redis/data logs
chmod +x scripts/setup-replication.sh

# Start all services
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Setup replication
echo "🔧 Setting up database replication..."
docker-compose exec -T app_server1 bash -c "cd /app && ./scripts/setup-replication.sh"

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

echo ""
echo "🎉 Cluster is starting up!"
echo ""
echo "📊 Service URLs:"
echo "  🌐 Application: http://localhost"
echo "  📈 HAProxy Stats: http://localhost:8404 (admin/admin123)"
echo "  🗄️ MySQL Master: localhost:3306"
echo "  🗄️ MySQL Slave 1: localhost:3307"
echo "  🗄️ MySQL Slave 2: localhost:3308"
echo "  🗄️ MySQL Slave 3: localhost:3309"
echo "  💾 Redis: localhost:6379"
echo ""
echo "🔧 Application Servers:"
echo "  📡 Server 1 (Publisher): http://localhost:3000"
echo "  📡 Server 2 (Subscriber): http://localhost:3001"
echo "  📡 Server 3 (Subscriber): http://localhost:3002"
echo ""
echo "🔌 API Endpoints:"
echo "  📡 API 1: http://localhost:5000"
echo "  📡 API 2: http://localhost:5001"
echo "  📡 API 3: http://localhost:5002"
echo ""
echo "📋 Useful Commands:"
echo "  📊 View logs: docker-compose logs -f [service_name]"
echo "  🛑 Stop cluster: docker-compose down"
echo "  🔄 Restart cluster: docker-compose restart"
echo "  🗄️ Access MySQL: docker-compose exec mysql_master mysql -u root -p"
echo ""
