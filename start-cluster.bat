@echo off
echo 🚀 Starting Parallel Voting App Cluster...

echo 🗄️ Starting MySQL...
docker run -d --name voting_mysql --network voting_network -e MYSQL_ROOT_PASSWORD=root_password -e MYSQL_DATABASE=voting_db -p 3306:3306 mariadb:10.3

echo 💾 Starting Redis...
docker run -d --name voting_redis --network voting_network -p 6379:6379 redis:7-alpine redis-server --appendonly yes

echo 🌐 Starting HAProxy...
docker run -d --name voting_haproxy --network voting_network -p 80:80 -p 8404:8404 -v ./haproxy/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg haproxy:2.8

echo 🖥️ Starting Master Server...
docker run -d --name voting_app1 --network voting_network -p 3000:3000 -v .:/app -e NODE_ENV=production -e API_PORT=3000 -e PUBLISHER=true -e PORT=3000 -e MASTER_DB_HOST=mysql -e MASTER_DB_USER=voting_user -e MASTER_DB_PASS=voting_password -e MASTER_DB_NAME=voting_db -e REDIS_HOST=redis -e REDIS_PORT=6379 node:20-alpine sh -c "cd /app && npm install && node backend/index-cluster.js"

echo 🖥️ Starting Slave Server 1...
docker run -d --name voting_app2 --network voting_network -p 3001:3001 -v .:/app -e NODE_ENV=production -e API_PORT=3001 -e PUBLISHER=false -e PORT=3001 -e MASTER_DB_HOST=mysql -e MASTER_DB_USER=voting_user -e MASTER_DB_PASS=voting_password -e MASTER_DB_NAME=voting_db -e REDIS_HOST=redis -e REDIS_PORT=6379 node:20-alpine sh -c "cd /app && npm install && node backend/index-cluster.js"

echo 🖥️ Starting Slave Server 2...
docker run -d --name voting_app3 --network voting_network -p 3002:3002 -v .:/app -e NODE_ENV=production -e API_PORT=3002 -e PUBLISHER=false -e PORT=3002 -e MASTER_DB_HOST=mysql -e MASTER_DB_USER=voting_user -e MASTER_DB_PASS=voting_password -e MASTER_DB_NAME=voting_db -e REDIS_HOST=redis -e REDIS_PORT=6379 node:20-alpine sh -c "cd /app && npm install && node backend/index-cluster.js"

echo.
echo ✅ Cluster started!
echo 🌐 Main App: http://localhost
echo 📊 HAProxy Stats: http://localhost:8404
echo 🗄️ Database: localhost:3306
echo 💾 Redis: localhost:6379
echo.
pause
