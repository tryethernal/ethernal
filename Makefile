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
	@DB_NAME=$$(grep '^DB_NAME=' run/.env.prod | cut -d '=' -f2); \
	if docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$$DB_NAME'" | grep -q 1; then \
		echo "Database '$$DB_NAME' already exists. Skipping creation."; \
	else \
		docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:create; \
	fi
	@echo "Running sequelize migrations in backend container..."
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:migrate
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:seed:all
	@$(MAKE) info-box

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
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod up -d --force-recreate
	@echo "Waiting for backend container to be healthy..."
	@docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend sh -c 'until nc -z localhost 8888; do sleep 1; done'
	@echo "Running sequelize migrations in backend container..."
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:migrate
	@echo "Running sequelize seeds in backend container..."
	docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod exec backend npx sequelize db:seed

info-box:
	@DOMAIN=$$(grep '^APP_DOMAIN=' run/.env.prod | cut -d '=' -f2); \
	if [ -z "$$DOMAIN" ]; then \
	  APP_URL=$$(grep '^APP_URL=' run/.env.prod | cut -d '=' -f2); \
	  EXPOSED_PORT=$$(grep '^EXPOSED_PORT=' .env.docker-compose.prod | cut -d '=' -f2); \
	  if [ -z "$$EXPOSED_PORT" ] || [ "$$EXPOSED_PORT" = "80" ]; then \
	    DOMAIN="$$APP_URL"; \
	  else \
	    DOMAIN="$$APP_URL:$$EXPOSED_PORT"; \
	  fi; \
	fi; \
	DB_USER=$$(grep '^DB_USER=' run/.env.prod | cut -d '=' -f2); \
	DB_PASSWORD=$$(grep '^DB_PASSWORD=' run/.env.prod | cut -d '=' -f2); \
	DB_NAME=$$(grep '^DB_NAME=' run/.env.prod | cut -d '=' -f2); \
	DB_HOST=$$(grep '^DB_HOST=' run/.env.prod | cut -d '=' -f2); \
	DB_PORT=$$(grep '^DB_PORT=' run/.env.prod | cut -d '=' -f2); \
	BULLBOARD_USERNAME=$$(grep '^BULLBOARD_USERNAME=' run/.env.prod | cut -d '=' -f2); \
	BULLBOARD_PASSWORD=$$(grep '^BULLBOARD_PASSWORD=' run/.env.prod | cut -d '=' -f2); \
	CONN_STR="postgresql://$$DB_USER:$$DB_PASSWORD@$$DB_HOST:$$DB_PORT/$$DB_NAME"; \
	echo ""; \
	echo "==================== Ethernal Installation Complete! ===================="; \
	echo ""; \
	echo "🔗  Start here to setup your instance:"; \
	echo "    http://$$DOMAIN/setup"; \
	echo ""; \
	echo "🐘  PostgreSQL Connection String:"; \
	echo "    $$CONN_STR"; \
	echo ""; \
	echo "📊  Bullboard Access (background jobs):"; \
	echo "    http://$$DOMAIN/bull"; \
	echo "    Username: $$BULLBOARD_USERNAME"; \
	echo "    Password: $$BULLBOARD_PASSWORD"; \
	echo ""; \
	echo "==============================================================="; \
	echo "";