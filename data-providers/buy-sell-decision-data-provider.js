const buildDecisionRequest = () => ({
  portfolio_id: window.DECISION_CONFIG?.portfolioId,
  forecast_horizon: window.DECISION_CONFIG?.forecastHorizons.EOY,
  model_type: window.DECISION_CONFIG?.modelTypes.RANDOM_FOREST_REGRESSION,
});

const unpackDecisionResponse = (data) => ({
  decisions: {
    sell: (data.sell ?? []).map((item) => ({
      ticker: item.ticker,
      sharesToSell: item.shares_to_sell ?? 0,
      predictedReturn: item.predicted_return ?? null,
      predictedReturnPeriod: item.predicted_return_period ?? null,
      selloffDate: item.selloff_date ?? null,
      selloffReturn: item.selloff_return ?? null,
    })),
    buy: (data.buy ?? []).map((item) => ({
      ticker: item.ticker,
      sharesToBuy: item.shares_to_buy ?? 0,
    })),
  },
  meta: {
    skipped: data.skipped ?? false,
    reason: data.reason ?? null,
    decisionDate: data.decision_date ?? null,
    capitalBalance: data.capital_balance ?? null,
    unchangedHoldings: (data.unchanged_holdings ?? []).map((holding) => ({
      ticker: holding.ticker,
      shareCount: holding.share_count ?? 0,
    })),
  },
});

const fetchBuySellDecisions = async () => {
  const decisionsEndpoint = `${window.getApiBase()}/api/decisions`;
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
