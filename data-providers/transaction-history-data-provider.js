const buildTransactionHistoryRequest = ({ startDatetime } = {}) => {
  const payload = {
    portfolio_id: window.DECISION_CONFIG?.portfolioId,
  };

  if (startDatetime) {
    payload.start_datetime = startDatetime;
  }

  return payload;
};

const unpackTransactionHistoryResponse = (data) => ({
  portfolioId: data.portfolio_id ?? null,
  sales: (data.sales ?? []).map((entry) => ({
    ticker: entry.ticker,
    shareCount: entry.share_count ?? 0,
    transactionTime: entry.transaction_time ?? null,
  })),
  purchases: (data.purchases ?? []).map((entry) => ({
    ticker: entry.ticker,
    shareCount: entry.share_count ?? 0,
    transactionTime: entry.transaction_time ?? null,
  })),
});

const fetchTransactionHistory = async ({ startDatetime } = {}) => {
  const transactionEndpoint = `${window.getApiBase()}/api/transactions`;
  const payload = buildTransactionHistoryRequest({ startDatetime });
  console.info("[transactions] POST request", { endpoint: transactionEndpoint, payload });
  const response = await fetch(transactionEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("[transactions] API error response", {
      endpoint: transactionEndpoint,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  console.info("[transactions] API response received", {
    endpoint: transactionEndpoint,
    portfolioId: data.portfolio_id ?? null,
    salesCount: Array.isArray(data.sales) ? data.sales.length : 0,
    purchasesCount: Array.isArray(data.purchases) ? data.purchases.length : 0,
  });
  return unpackTransactionHistoryResponse(data);
};

window.fetchTransactionHistory = fetchTransactionHistory;
