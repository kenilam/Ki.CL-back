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

# Portfolio access: make portfolio.grant PIECE=moonshot EMAIL=someone@example.com
# MONGODB_DATABASE=production picks the production database.
portfolio.grant:
	@npx tsx Server/Scripts/portfolioAccess.ts grant "$(PIECE)" "$(EMAIL)"

portfolio.revoke:
	@npx tsx Server/Scripts/portfolioAccess.ts revoke "$(PIECE)" "$(EMAIL)"

portfolio.list:
	@npx tsx Server/Scripts/portfolioAccess.ts list "$(PIECE)"

# Contact form: make contact.forget EMAIL=someone@example.com
# Deletes every message kept under that address, for a deletion request.
contact.forget:
	@npx tsx Server/Scripts/contactMessages.ts forget "$(EMAIL)"
