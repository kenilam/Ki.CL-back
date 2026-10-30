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

# The site's writing: make translations.seed DIR=../Ki.CL/App/locales
# The server's own messages and emails: make translations.seed DIR=Server/locales
# Reads <DIR>/en-US/<namespace>.json into one row for each string. seed
# adds and changes strings, diff fails when the database is behind the files,
# prune removes strings the files no longer have, drop removes a whole namespace.
translations.seed:
	@npx tsx Server/Scripts/translations.ts seed "$(DIR)"

translations.diff:
	@npx tsx Server/Scripts/translations.ts diff "$(DIR)"

translations.prune:
	@npx tsx Server/Scripts/translations.ts prune "$(DIR)"

translations.drop:
	@npx tsx Server/Scripts/translations.ts drop "$(NAMESPACE)"

# Translates the en-US strings that are new or changed into every other
# AcceptLanguage, or the ones named: make translations.translate LANGUAGES="fr ja".
# Run it after seeding. A string that fails is reported and tried again next run.
translations.translate:
	@npx tsx Server/Scripts/translations.ts translate $$LANGUAGES

# Renames language to accept-language (en becomes en-US). Run it before the first
# seed of a release, and with FINISH=--finish a release later.
translations.migrate:
	@npx tsx Server/Scripts/translations.ts migrate $(FINISH)

# Every repo's namespaces at once. The other repos are checked out beside this
# one; name other folders with TRANSLATION_DIRS="a b".
#   make translations.seed.all                               the development database
#   MONGODB_DATABASE=production make translations.seed.all   production
TRANSLATION_DIRS ?= Server/locales ../Ki.CL/App/locales ../Ki.CL-design-system/Design/src/locales ../Ki.CL-moonshot-exercise/Client/src/locales

translations.seed.all:
	@for dir in $(TRANSLATION_DIRS); do npx tsx Server/Scripts/translations.ts seed "$$dir" || exit 1; done

translations.diff.all:
	@for dir in $(TRANSLATION_DIRS); do npx tsx Server/Scripts/translations.ts diff "$$dir" || exit 1; done
