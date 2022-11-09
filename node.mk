-: npm
npm:
#	@cd ./scripts && npm install --legacy-peer-deps && npm run rebuild && cd ..
audit-fix:
	@cd ./scripts && npm audit fix && cd ..
audit-fix-force:
	@cd ./scripts && npm audit fix --force && cd ..
