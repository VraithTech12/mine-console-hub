# Aether

Build a web dashboard that remotely manages my home Minecraft Forge server through a desktop agent I've already built. I'm attaching PROTOCOL.md — that file is the contract. Implement it exactly as written; don't redesign the message formats, headers, or action names. ARCHITECTURE (important) 

The agent dials OUT to this website. The website never connects to the home network.

Pairing: implement POST /api/agent/pair exactly as PROTOCOL.md section 1 — accept the JSON body, validate a single-use pairing code (I generate codes in the UI; codes expire in ≤10 min), and return { agentId, agentToken, relayUrl }. Use HTTPS (the app enforces it).

Relay: implement an outbound WebSocket relay at wss://<host>/agent (PROTOCOL.md section 2). The agent connects with Authorization: Bearer <agentToken> plus x-agent-id / x-agent-name / x-agent-protocol headers. Reject bad credentials by closing with code 4001 or 4003 — the agent then wipes its token and shows "pair again".

When the agent's "hello" frame arrives, store its supported actions and status. Reply to its pings with {"type":"pong"}. Send requests as {"id":"<unique>","action":"...","payload":{}} and match the agent's responses by id. Handle unsolicited events: server.status and console.line.

Never store or log agent tokens in plaintext. Respect the agent-side rate limits listed at the bottom of PROTOCOL.md — don't blast requests.

 PAGES & FEATURES 

Dashboard — server status (state, uptime, CPU, RAM, players + player list) with Start / Stop / Restart buttons. Live status updates pushed over the relay.

Console — a live scrolling console fed by console.line events. The console is my chat view: show player chat clearly, and give me an input box that sends console.command (e.g. "say Hello everyone"). Also load history via console.history on open.

Files — a file browser rooted at the server folder using files.list; folder navigation, create folder, upload, download, delete, rename, move, plus a text editor that opens/reads/saves via files.readText / files.writeText. Confirm before deleting. Show file sizes and modified dates.

Mods — list mods (mods.list), upload a .jar (mods.upload), replace, and delete (mods.delete).

Backups — list (backups.list), create with a label (backups.create), delete, and download (backups.download — these are large base64 payloads, handle them patiently with progress feedback).

Agents — a page listing my paired agents: name, connection state (connected/offline), last seen, and a button to generate a new pairing code (shown as ABCD-1234, valid 10 min, single use). Also an "unpair agent" button.

 DESIGN & STYLE 

Dark theme, clean and gamer-adjacent but professional — think server admin panel, not a toy.

Show connection state prominently (a colored dot: green connected, amber connecting, red offline) so I always know if the agent is reachable.

Buttons should disable or show a spinner while waiting for the agent's response, and surface agent errors (RATE_LIMITED, ACTION_FAILED, etc.) as friendly toast messages.

Mobile-friendly: I want to check the server and console from my phone.

 ACCOUNTS 

Add user login so only I can control the server. The agent list, pairing, and relay must be scoped to my account — another user must never see or reach my agent.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1355a42e-3bab-4901-982b-2f2f61a385bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
