# Parallel Voting App - Cluster Setup

## 🏗️ Architecture Overview

This voting system is designed for high availability and scalability with the following components:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Users     │    │   Admins    │    │  Monitors   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                   ┌─────────────┐
                   │   HAProxy   │ (Load Balancer)
                   │   :80       │
                   └──────┬──────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│   App Server │  │   App Server │  │   App Server │
│   :3000      │  │   :3001      │  │   :3002      │
│ (Publisher)  │  │ (Subscriber) │  │ (Subscriber) │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│ MySQL Master │  │ MySQL Slave  │  │ MySQL Slave  │
│   :3306      │  │   :3307      │  │   :3308      │
│ (Read/Write) │  │ (Read-only)  │  │ (Read-only)  │
└──────────────┘  └──────────────┘  └──────────────┘
                                           │
                                    ┌───────▼──────┐
                                    │ MySQL Slave  │
                                    │   :3309      │
                                    │ (Read-only)  │
                                    └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- Node.js 18+ (for local development)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd Parallel-Voting-App
```

### 2. Start the Cluster
```bash
chmod +x scripts/start-cluster.sh
./scripts/start-cluster.sh
```

### 3. Access the Application
- **Main Application**: http://localhost
- **HAProxy Stats**: http://localhost:8404 (admin/admin123)
- **API Documentation**: http://localhost/api/docs

## 📊 Service URLs

### Load Balanced Endpoints
- **Application**: http://localhost (HAProxy)
- **API**: http://localhost:5000 (HAProxy)

### Individual Servers
- **Server 1 (Publisher)**: http://localhost:3000
- **Server 2 (Subscriber)**: http://localhost:3001
- **Server 3 (Subscriber)**: http://localhost:3002

### Database Nodes
- **MySQL Master**: localhost:3306 (Read/Write)
- **MySQL Slave 1**: localhost:3307 (Read-only)
- **MySQL Slave 2**: localhost:3308 (Read-only)
- **MySQL Slave 3**: localhost:3309 (Read-only)

### Caching
- **Redis**: localhost:6379

## 🔧 Configuration

### Environment Variables
Key environment variables in `.env.production`:

```bash
# Database
MASTER_DB_HOST=mysql_master
SLAVE_DB_HOST=mysql_slave1

# Server Roles
PUBLISHER=true  # Only Server 1
PUBLISHER=false # Servers 2 & 3

# Load Balancing
SERVER_NAME=app_server1
PORTS=app_server2:3001,app_server3:3002
```

### HAProxy Configuration
- **Algorithm**: Round Robin
- **Health Checks**: Every 30 seconds
- **Session Persistence**: Cookie-based
- **WebSocket Support**: Enabled

## 🔄 Publisher-Subscriber Pattern

### Publisher (Server 1)
- Handles all write operations
- Broadcasts real-time updates
- Manages election state changes

### Subscribers (Servers 2 & 3)
- Receive updates from Publisher
- Serve read operations
- Provide redundancy and load distribution

## 🗄️ Database Replication

### Master-Slave Setup
- **Master**: Handles all INSERT/UPDATE/DELETE operations
- **Slaves**: Replicate data for read operations
- **Replication**: Asynchronous binlog-based
- **Failover**: Manual slave promotion

### Replication Monitoring
```bash
# Check slave status
docker-compose exec mysql_slave1 mysql -u root -pslave_root_password -e "SHOW SLAVE STATUS\G"
```

## 🔍 Monitoring & Health Checks

### Service Health
```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs -f app_server1
```

### HAProxy Statistics
- URL: http://localhost:8404
- Real-time connection stats
- Server health status
- Request/response metrics

### Application Health
```bash
# Health check endpoints
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## 🛠️ Management Commands

### Start/Stop Services
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart app_server1

# View logs
docker-compose logs -f [service_name]
```

### Database Management
```bash
# Access master database
docker-compose exec mysql_master mysql -u root -pmaster_root_password

# Access slave database
docker-compose exec mysql_slave1 mysql -u root -pslave_root_password

# Setup replication manually
docker-compose exec app_server1 bash -c "cd /app && ./scripts/setup-replication.sh"
```

## 🔒 Security Features

### Network Security
- Internal service communication
- Database access limited to application containers
- HAProxy as reverse proxy

### Authentication
- JWT-based authentication
- Role-based access control
- Session management with Redis

### Data Protection
- Encrypted database connections
- Password hashing with bcrypt
- Input validation and sanitization

## 📈 Performance Optimization

### Load Balancing
- Round-robin algorithm
- Health checks and failover
- Connection pooling

### Caching Strategy
- Redis for session storage
- Application-level caching
- Database query optimization

### Database Optimization
- Read operations distributed to slaves
- Connection pooling
- Query caching enabled

## 🚨 Troubleshooting

### Common Issues

#### Replication Not Working
```bash
# Check slave status
docker-compose exec mysql_slave1 mysql -u root -pslave_root_password -e "SHOW SLAVE STATUS\G"

# Restart replication
STOP SLAVE;
START SLAVE;
```

#### Socket.io Connection Issues
```bash
# Check server logs
docker-compose logs app_server1

# Verify Redis connectivity
docker-compose exec redis redis-cli ping
```

#### HAProxy Health Checks Failing
```bash
# Check HAProxy config
docker-compose exec haproxy haproxy -f /usr/local/etc/haproxy/haproxy.cfg -c

# View stats
curl http://localhost:8404/stats
```

## 📝 Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start backend API
npm run api

# Start frontend
npm run frontend

# Start all servers locally
npm start
```

### Database Schema Updates
1. Update `db/mysql_db.sql`
2. Restart containers
3. Verify replication

## 🤝 Contributing

1. Create feature branch
2. Test with cluster setup
3. Ensure replication works
4. Submit pull request

## 📄 License

This project is licensed under the ISC License.
