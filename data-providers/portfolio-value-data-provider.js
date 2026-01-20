const buildPortfolioValueRequest = () => ({
  portfolio_id: window.DECISION_CONFIG?.portfolioId,
});

const getDecisionShareCount = (decision) => {
  if (typeof decision?.shares_to_sell === "number") {
    return decision.shares_to_sell;
  }
  if (typeof decision?.shares_to_buy === "number") {
    return decision.shares_to_buy;
  }
  if (typeof decision?.share_count === "number") {
    return decision.share_count;
  }
  if (typeof decision?.shares === "number") {
    return decision.shares;
  }
  return 0;
};

const unpackPortfolioValueResponse = (data) => ({
  estimatedValue: typeof data.estimated_value === "number" ? data.estimated_value : null,
  capitalBalance: typeof data.capital_balance === "number" ? data.capital_balance : null,
  holdings: Array.isArray(data.holdings)
    ? data.holdings
        .filter((holding) => holding?.ticker)
        .map((holding) => ({
          ticker: holding.ticker,
          shareCount: typeof holding.share_count === "number" ? holding.share_count : 0,
          value: 0,
        }))
    : [],
  latestSellDecisions: Array.isArray(data.latest_sell_decisions)
    ? data.latest_sell_decisions
        .filter((decision) => decision?.ticker)
        .map((decision) => ({
          ticker: decision.ticker,
          sharesToSell: getDecisionShareCount(decision),
        }))
    : [],
  latestBuyDecisions: Array.isArray(data.latest_buy_decisions)
    ? data.latest_buy_decisions
        .filter((decision) => decision?.ticker)
        .map((decision) => ({
          ticker: decision.ticker,
          sharesToBuy: getDecisionShareCount(decision),
        }))
    : [],
});

const fetchPortfolioValue = async () => {
  const valuationEndpoint = `${window.getApiBase()}/api/portfolio`;
  const payload = buildPortfolioValueRequest();
  console.info("[valuation] POST request", { endpoint: valuationEndpoint, payload });
  const response = await fetch(valuationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("[valuation] API error response", {
      endpoint: valuationEndpoint,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  console.info("[valuation] API response received", {
    endpoint: valuationEndpoint,
    estimatedValue: data.estimated_value ?? null,
    holdingsCount: Array.isArray(data.holdings) ? data.holdings.length : 0,
  });
  return unpackPortfolioValueResponse(data);
};

window.fetchPortfolioValue = fetchPortfolioValue;
