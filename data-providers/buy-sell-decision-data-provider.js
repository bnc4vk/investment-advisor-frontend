const getApiBase = () => {
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return isLocalhost ? "http://localhost:3000" : "https://investment-advisor-backend-ssf6.onrender.com";
};

const buildDecisionRequest = () => ({
  tickers: ["SPY", "QQQ"],
  timestamp: new Date().toISOString(),
});

const unpackDecisionResponse = (data) => ({
  decisions: {
    sell: data.sell ?? [],
    buy: data.buy ?? [],
  },
  portfolio: {
    holdings: data.updated_holdings ?? null,
    cashBalance: data.cash_balance ?? null,
    lastChangePercent: data.daily_change_percent ?? null,
    lastDecisionDate: data.decision_date ?? null,
  },
});

const fetchBuySellDecisions = async () => {
  const decisionsEndpoint = `${getApiBase()}/api/decisions`;
  const payload = buildDecisionRequest();
  console.info("[decisions] POST request", { endpoint: decisionsEndpoint, payload });
  const response = await fetch(decisionsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("[decisions] API error response", {
      endpoint: decisionsEndpoint,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  console.info("[decisions] API response received", {
    endpoint: decisionsEndpoint,
    decisionDate: data.decision_date ?? null,
    skipped: data.skipped ?? null,
    reason: data.reason ?? null,
  });
  return unpackDecisionResponse(data);
};
