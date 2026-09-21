build:
	@echo ⌛ building...
	yarn run build
	@echo done

client:
	@echo ⌛ building client...
	yarn workspace @ki-cl/client run build
	@echo done

codegen:
	@echo ⌛ generating...
	yarn run codegen
	@echo done

install:
	@echo ⌛ installing...
	yarn
	@echo done

lint:
	@echo ⌛ linting...
	yarn run lint
	@echo done

run:
	@echo ⌛ running development...
	yarn run development

run.production:
	@echo ⌛ running production...
	yarn run production

start:
	@echo ⌛ starting...
	yarn install && yarn run start
	@echo ✅ done
