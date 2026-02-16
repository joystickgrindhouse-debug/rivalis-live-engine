#!/bin/bash
cd /workspaces/rivalis-live-engine
git add live-server/public/lobby-preview.html
git commit -m "Fix lobby preview HTML corruption and JavaScript errors

- Fix corrupted HTML structure in Chaos mode section
- Fix corrupted HTML structure in Speed Demon mode section  
- Fix JavaScript typo: loadActiveSessionsrval -> loadActiveSessions
- Add proper setInterval call for live updates
- All Create Session buttons now have correct onclick handlers"
git push
