#!/bin/bash

echo "🔧 Setting up MySQL Master-Slave Replication..."

# Wait for master to be ready
echo "⏳ Waiting for master database..."
until mysql -h mysql_master -u root -pmaster_root_password -e "SELECT 1"; do
  echo "Master not ready, waiting..."
  sleep 2
done

echo "✅ Master database is ready"

# Get master position
MASTER_STATUS=$(mysql -h mysql_master -u root -pmaster_root_password -e "SHOW MASTER STATUS\G")
MASTER_LOG_FILE=$(echo "$MASTER_STATUS" | grep "File:" | awk '{print $2}')
MASTER_LOG_POS=$(echo "$MASTER_STATUS" | grep "Position:" | awk '{print $2}')

echo "📊 Master Log File: $MASTER_LOG_FILE"
echo "📊 Master Log Position: $MASTER_LOG_POS"

# Setup replication for slave 1
echo "🔗 Setting up replication for slave 1..."
mysql -h mysql_slave1 -u root -pslave_root_password -e "
STOP SLAVE;
RESET SLAVE;
CHANGE MASTER TO
  MASTER_HOST='mysql_master',
  MASTER_USER='root',
  MASTER_PASSWORD='master_root_password',
  MASTER_LOG_FILE='$MASTER_LOG_FILE',
  MASTER_LOG_POS=$MASTER_LOG_POS,
  MASTER_PORT=3306;
START SLAVE;
"

# Setup replication for slave 2
echo "🔗 Setting up replication for slave 2..."
mysql -h mysql_slave2 -u root -pslave_root_password -e "
STOP SLAVE;
RESET SLAVE;
CHANGE MASTER TO
  MASTER_HOST='mysql_master',
  MASTER_USER='root',
  MASTER_PASSWORD='master_root_password',
  MASTER_LOG_FILE='$MASTER_LOG_FILE',
  MASTER_LOG_POS=$MASTER_LOG_POS,
  MASTER_PORT=3306;
START SLAVE;
"

# Setup replication for slave 3
echo "🔗 Setting up replication for slave 3..."
mysql -h mysql_slave3 -u root -pslave_root_password -e "
STOP SLAVE;
RESET SLAVE;
CHANGE MASTER TO
  MASTER_HOST='mysql_master',
  MASTER_USER='root',
  MASTER_PASSWORD='master_root_password',
  MASTER_LOG_FILE='$MASTER_LOG_FILE',
  MASTER_LOG_POS=$MASTER_LOG_POS,
  MASTER_PORT=3306;
START SLAVE;
"

# Check slave status
echo "🔍 Checking replication status..."
for slave in mysql_slave1 mysql_slave2 mysql_slave3; do
  echo "📊 Checking $slave..."
  SLAVE_STATUS=$(mysql -h $slave -u root -pslave_root_password -e "SHOW SLAVE STATUS\G")
  SLAVE_IO_RUNNING=$(echo "$SLAVE_STATUS" | grep "Slave_IO_Running:" | awk '{print $2}')
  SLAVE_SQL_RUNNING=$(echo "$SLAVE_STATUS" | grep "Slave_SQL_Running:" | awk '{print $2}')
  
  echo "  Slave_IO_Running: $SLAVE_IO_RUNNING"
  echo "  Slave_SQL_Running: $SLAVE_SQL_RUNNING"
  
  if [[ "$SLAVE_IO_RUNNING" == "Yes" && "$SLAVE_SQL_RUNNING" == "Yes" ]]; then
    echo "✅ $slave replication is working"
  else
    echo "❌ $slave replication has issues"
  fi
done

echo "🎉 Replication setup completed!"
