#!/bin/bash
set -e

export MSYS_NO_PATHCONV=1

# Load .env file
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✅ Loaded .env"
else
  echo "❌ ERROR: .env file not found!"
  exit 1
fi

echo "===================================="
echo "🔧 Setting permissions..."
echo "===================================="
chmod +x build.sh
chmod 644 ./db/master/replication.cnf
chmod 644 ./db/slave1/replication.cnf
chmod 644 ./db/slave2/replication.cnf
echo "✅ Permissions set"

echo "===================================="
echo "🛑 Stopping all containers and removing volumes..."
echo "===================================="
docker compose down -v

echo "===================================="
echo "🚀 Building Docker images (no cache)..."
echo "===================================="
docker compose build --no-cache
echo "✅ Docker images built"

echo "===================================="
echo "🗄 Starting MySQL master container..."
echo "===================================="
docker compose up -d db-master

echo "⏳ Waiting for MySQL master to be ready..."
until docker exec db-master mysql -uroot -p${DB_ROOT_PASSWORD} -e "SELECT 1;" >/dev/null 2>&1; do sleep 3; done

echo "⚙️ Applying master replication config..."
docker cp ./db/master/replication.cnf db-master:/etc/mysql/conf.d/replication.cnf
docker exec db-master sh -c "chmod 644 /etc/mysql/conf.d/replication.cnf"
docker restart db-master
sleep 5
until docker exec db-master mysql -uroot -p${DB_ROOT_PASSWORD} -e "SELECT 1;" >/dev/null 2>&1; do sleep 3; done

echo "👤 Creating users and database on master..."
docker exec db-master mysql -uroot -p${DB_ROOT_PASSWORD} -e "
  CREATE USER IF NOT EXISTS 'repl_user'@'%' IDENTIFIED BY 'repl_pass';
  GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
  CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
  GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO 'repl_user'@'%';
  GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%';
  FLUSH PRIVILEGES;
  CREATE DATABASE IF NOT EXISTS ${DB_NAME};
"

echo "===================================="
echo "🔴 Starting Redis..."
echo "===================================="
docker compose up -d redis
echo "⏳ Waiting for Redis to be ready..."
until docker exec redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 2; done
echo "✅ Redis is ready"

echo "===================================="
echo "🌱 Running DB init (schema + seed) on master..."
echo "===================================="
docker run --rm \
  --network parallel-voting-app_default \
  -e DB_HOST=db-master \
  -e DB_USER=${DB_USER} \
  -e DB_PASS=${DB_PASSWORD} \
  -e DB_NAME=${DB_NAME} \
  -e JWT_SECRET=${JWT_SECRET} \
  parallel-voting-app-backend1 \
  node src/db/dbInit.js

echo "✅ DB init complete on master"

echo "🔍 Tables on master:"
docker exec db-master mysql -uroot -p${DB_ROOT_PASSWORD} ${DB_NAME} -e "SHOW TABLES;"

echo "===================================="
echo "🛠 Resetting master binary logs (post-init)..."
echo "===================================="
docker exec db-master mysql -uroot -p${DB_ROOT_PASSWORD} -e "RESET BINARY LOGS AND GTIDS;"

MASTER_STATUS=$(docker exec db-master mysql -uroot -p${DB_ROOT_PASSWORD} -e "SHOW BINARY LOG STATUS\G")
MASTER_FILE=$(echo "$MASTER_STATUS" | awk '/File:/ {print $2}')
MASTER_POS=$(echo "$MASTER_STATUS" | awk '/Position:/ {print $2}')

echo "Master File: $MASTER_FILE"
echo "Master Position: $MASTER_POS"

echo "===================================="
echo "🗄 Starting MySQL slave containers..."
echo "===================================="
docker compose up -d db-slave1 db-slave2

echo "⏳ Waiting for slaves..."
until docker exec db-slave1 mysql -uroot -p${DB_ROOT_PASSWORD} -e "SELECT 1;" >/dev/null 2>&1; do sleep 3; done
until docker exec db-slave2 mysql -uroot -p${DB_ROOT_PASSWORD} -e "SELECT 1;" >/dev/null 2>&1; do sleep 3; done

echo "⚙️ Applying slave configs..."
for SLAVE in db-slave1 db-slave2; do
  SLAVE_DIR="${SLAVE#db-}"
  docker cp ./db/$SLAVE_DIR/replication.cnf $SLAVE:/etc/mysql/conf.d/replication.cnf
  docker exec $SLAVE sh -c "chmod 644 /etc/mysql/conf.d/replication.cnf"
  docker restart $SLAVE
done

sleep 5
until docker exec db-slave1 mysql -uroot -p${DB_ROOT_PASSWORD} -e "SELECT 1;" >/dev/null 2>&1; do sleep 3; done
until docker exec db-slave2 mysql -uroot -p${DB_ROOT_PASSWORD} -e "SELECT 1;" >/dev/null 2>&1; do sleep 3; done

echo "===================================="
echo "📤 Dumping master data into slaves..."
echo "===================================="
docker exec db-master mysqldump -uroot -p${DB_ROOT_PASSWORD} \
  --single-transaction \
  --routines \
  --triggers \
  ${DB_NAME} > ./votingdb_dump.sql

for SLAVE in db-slave1 db-slave2; do
  docker cp ./votingdb_dump.sql $SLAVE:/tmp/votingdb_dump.sql
  docker exec $SLAVE mysql -uroot -p${DB_ROOT_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
  docker exec $SLAVE sh -c "mysql -uroot -p${DB_ROOT_PASSWORD} ${DB_NAME} < /tmp/votingdb_dump.sql"
  echo "✅ Data loaded into $SLAVE"
done

rm -f ./votingdb_dump.sql

echo "===================================="
echo "👤 Creating voter user on slaves..."
echo "===================================="
for SLAVE in db-slave1 db-slave2; do
  docker exec $SLAVE mysql -uroot -p${DB_ROOT_PASSWORD} -e "
    CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%';
    FLUSH PRIVILEGES;
  "
  echo "✅ voter user created on $SLAVE"
done

echo "===================================="
echo "🔄 Configuring slaves for replication..."
echo "===================================="
for SLAVE in db-slave1 db-slave2; do
  docker exec $SLAVE mysql -uroot -p${DB_ROOT_PASSWORD} -e "
    STOP REPLICA;
    RESET REPLICA ALL;
    CHANGE REPLICATION SOURCE TO
      SOURCE_HOST='db-master',
      SOURCE_USER='repl_user',
      SOURCE_PASSWORD='repl_pass',
      SOURCE_LOG_FILE='$MASTER_FILE',
      SOURCE_LOG_POS=$MASTER_POS,
      GET_SOURCE_PUBLIC_KEY=1;
    START REPLICA;
  "
done

sleep 3

echo "===================================="
echo "🔍 Verifying replication..."
echo "===================================="
for SLAVE in db-slave1 db-slave2; do
  echo "--- $SLAVE ---"
  docker exec $SLAVE mysql -uroot -p${DB_ROOT_PASSWORD} -e "SHOW REPLICA STATUS\G" | grep -E "Replica_IO_Running|Replica_SQL_Running|Seconds_Behind"
done

echo "===================================="
echo "🔍 Checking tables on slaves..."
echo "===================================="
for SLAVE in db-slave1 db-slave2; do
  echo "--- $SLAVE ---"
  docker exec $SLAVE mysql -uroot -p${DB_ROOT_PASSWORD} ${DB_NAME} -e "SHOW TABLES;"
done

echo "===================================="
echo "✅ Starting backends and frontend..."
echo "===================================="
docker compose up -d backend1 backend2 backend3 frontend-dev frontend

echo "===================================="
echo "🎉 SYSTEM READY!"
echo "Frontend:  http://localhost:5173"
echo "Redis:     localhost:6379"
echo "===================================="