start:
	@if [ -n "$$(docker compose -f docker-compose.prod.yml ps -q)" ]; then \
		echo "Stopping and removing running containers..."; \
		docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod down --remove-orphans; \
	fi
	@if [ ! -f .env.prod ] || [ ! -f run/.env.prod ] || [ ! -f pm2-server/.env.prod ] || [ ! -f .env.docker-compose.prod ]; then \
		echo "Generating environment and config files..."; \
		bash ./generate-env-files.sh; \
	else \
		echo "All environment and config files already exist. Skipping generation."; \
	fi
	@echo "Pulling latest images for all services..."
	docker compose -f docker-compose.prod.yml pull
	@echo "Starting up the application..."
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod up -d
	@echo "Waiting for backend container to be healthy..."
	@docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend sh -c 'until nc -z localhost 8888; do sleep 1; done'
	@echo "Running sequelize migrations in backend container..."
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:create
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:migrate
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:seed:all

stop:
	@echo "Stopping and cleaning up all containers and networks..."
	docker compose -f docker-compose.prod.yml down --remove-orphans 

nuke:
	@echo "Nuking everything: containers, networks, volumes, and generated env/config files..."
	docker compose -f docker-compose.prod.yml down --remove-orphans --volumes
	rm -f .env.prod run/.env.prod pm2-server/.env.prod
	rm -f pgbouncer/.env.pgbouncer.prod pgbouncer/userlist.txt pgbouncer/pgbouncer.ini

update:
	@echo "Pulling latest images for all services..."
	docker compose -f docker-compose.prod.yml pull
	@echo "Recreating containers with latest images..."
	docker compose -f docker-compose.prod.yml up -d --force-recreate
	@echo "Waiting for backend container to be healthy..."
	@docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend sh -c 'until nc -z localhost 8888; do sleep 1; done'
	@echo "Running sequelize migrations in backend container..."
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:migrate
	@echo "Running sequelize seeds in backend container..."
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:seed:all