.PHONY: test test-py demo lint typecheck

test:
	npm test

test-engine:
	node --experimental-strip-types --test src/lib/edgepilot/money.test.ts

test-py:
	PYTHONPATH=python/src python3 -m pytest python/tests -q

demo:
	@echo "Open the desk, stay in PAPER, press Run fixture suite."

typecheck:
	npm run typecheck
