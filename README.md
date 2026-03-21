# Parallel Voting App — System Architecture

## Overview

```
                        [ Client ]
                            |
                     [ Load Balancer ]
                    /        |        \
             [Backend 1] [Backend 2] [Backend 3]
                    \        |        /
                        [ Redis ]
                            |
                      [ DB Master ]
                      /           \
               [ DB Slave 1]   [DB Slave 2]
```

---

## Components

### Client
- Browser or mobile app
- Sends HTTP requests to the load balancer

### Load Balancer
- Nginx
- Distributes incoming requests across backends using round-robin
- Single entry point for all traffic

### Backends (x3)
- Node.js REST API
- Stateless — any backend can handle any request
- All share the same Redis instance and DB master for writes

### Redis
- Shared cache and session store
- All 3 backends read/write to the same Redis instance

### DB Master
- MySQL
- Handles **all write operations** (INSERT, UPDATE, DELETE)
- Replicates data to both slaves after each write

### DB Slave 1 & Slave 2
- MySQL read replicas
- Handle **read operations** to offload the master
- Stay in sync via binary log replication from the master

---

## Data Flow

| Operation | Path |
|-----------|------|
| Read | Client → Load Balancer → Backend → DB Slave |
| Write | Client → Load Balancer → Backend → DB Master → (replicates) → Slaves |
| Session / Cache | Backend ↔ Redis |

---

## Replication

- **Type:** MySQL binary log replication (master → slave)
- **Slaves:** 2 read replicas (`db-slave1`, `db-slave2`)
- Slaves are configured at boot via `build.sh` using `CHANGE REPLICATION SOURCE TO`
- `repl_user` is the dedicated replication user on the master