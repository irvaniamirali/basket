# Basket Frontend

React 19, TypeScript, and Vite storefront for the Django REST API.

## Development

Start the backend in one terminal from the repository root, with its database and Django environment configured:

```fish
source .venv/bin/activate.fish
python src/manage.py migrate
python src/manage.py runserver 127.0.0.1:8000
```

In another terminal, start the frontend:

```sh
cd frontend
npm install
npm run dev
```

Vite proxies `/api/*` to `http://127.0.0.1:8000` by default. Set `VITE_API_PROXY_TARGET` in a frontend `.env.local` file to use another backend URL.

## ZarinPal Return URL

For local payment testing, configure the Django process environment with sandbox mode, a sandbox merchant UUID, and this callback URL:

```text
ZARINPAL_SANDBOX=true
ZARINPAL_MERCHANT_ID=<sandbox merchant UUID>
ZARINPAL_CALLBACK_URL=http://localhost:5173/payment/return
```

The return page forwards ZarinPal's `Authority` and `Status` to the backend callback endpoint. The backend performs verification and remains the source of truth for payment status. Production must use the public HTTPS frontend return URL and production merchant ID.

## Available Checks

```sh
npm run format
npm run format:check
npm run lint
npm test
npm run build
```

The API currently provides no product images or categories, profile editing, or role-management endpoints. The interface does not fabricate these capabilities; staff product controls are shown only when the authenticated product `OPTIONS` response exposes write actions.