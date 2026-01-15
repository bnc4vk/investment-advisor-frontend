# Portfolio Web UI

This folder contains a lightweight static webpage to monitor a $100K ETF
portfolio and fetch end-of-day trade decisions from a backend API.

## How to use

1. Update the API base URL in `app.js`:

   ```js
   const apiBase = "https://your-render-service.onrender.com";
   ```

2. Open `index.html` in a browser.

## Expected API response shape

The UI expects `/api/decisions` to respond with JSON similar to:

```json
{
  "decision_date": "2024-04-15",
  "daily_change_percent": 0.42,
  "cash_balance": 100120.55,
  "updated_holdings": [
    { "ticker": "SPY", "value": 25000 },
    { "ticker": "QQQ", "value": 35000 }
  ],
  "sell": [
    { "ticker": "IWM", "score": -0.33 }
  ],
  "buy": [
    { "ticker": "VTI", "score": 0.21 }
  ]
}
```

The UI uses `sell` and `buy` lists for candidate tickers, and uses
`updated_holdings`, `cash_balance`, and `daily_change_percent` to render the
portfolio summary if provided.
