# futu-bridge

Futu has no cloud API: every query must go through **OpenD**, a gateway that stays logged in to your
Futu account. This folder runs OpenD on an always-on VM next to a tiny read-only HTTP service, so the
dashboard (on Vercel) can fetch US positions from anywhere.

```
Browser (dashboard) ──HTTPS + Bearer token──> Caddy :443 ──> futu-bridge 127.0.0.1:8787
                                                               └─WebSocket──> OpenD 127.0.0.1:33333 ──> Futu
```

- OpenD's ports stay bound to `127.0.0.1`; only Caddy (80/443) is public.
- The bridge exposes one endpoint, `GET /positions`. It never places orders, and it never unlocks trading.
- Results are cached for 30 s, so repeated dashboard refreshes don't hit OpenD every time.

## Deploy

Step-by-step guide for an Oracle Cloud Always Free VM (network, firewall, reserved IP, OpenD login,
HTTPS, troubleshooting): **[DEPLOY_ORACLE.md](DEPLOY_ORACLE.md)** (in Traditional Chinese).

Files used by the guide live in `deploy/`: `opend.service`, `futu-bridge.service`, `Caddyfile`,
`futu-bridge.env.example`.

## Local development

```bash
npm install
BRIDGE_TOKEN=$(openssl rand -hex 32) FUTU_WEBSOCKET_KEY=... ALLOWED_ORIGINS=http://localhost:5173 npm start
```
