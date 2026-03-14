.PHONY: help build up down restart logs shell clean rebuild

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker image
	docker-compose build

up: ## Start the bot in detached mode
	docker-compose up -d

down: ## Stop and remove the bot container
	docker-compose down

restart: ## Restart the bot
	docker-compose restart

logs: ## Follow the bot logs
	docker-compose logs -f

logs-tail: ## Show last 100 log lines
	docker-compose logs --tail 100

shell: ## Open a shell in the running container
	docker-compose exec ozbargain-bot sh

ps: ## Show container status
	docker-compose ps

rebuild: ## Rebuild and restart the bot
	docker-compose up -d --build

clean: ## Remove containers, images, and volumes
	docker-compose down -v --rmi all

stats: ## Show container resource usage
	docker stats ozbargain-bot

setup: ## Initial setup - copy .env.example to .env
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env file. Please edit it with your credentials."; \
	else \
		echo "✗ .env file already exists"; \
	fi

start: setup up ## Setup and start the bot (first time)

update: ## Pull changes and rebuild
	git pull
	docker-compose up -d --build
