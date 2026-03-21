docker compose build frontend
docker compose up -d frontend

docker-compose up -d --build frontend
docker-compose up -d --build backend1 backend2 backend3
# Restart if the docker file is changed
docker compose up -d --build backend1 backend2 backend3

# restart only
docker compose restart backend1 backend2 backend3

docker-compose restart frontend
docker-compose restart backend1 backend2 backend3

docker compose restart backend1 backend2 backend3

# restart updated docker compose
docker compose down && docker compose up --build

