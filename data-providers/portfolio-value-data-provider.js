const buildPortfolioValueRequest = () => ({
  portfolio_id: window.DECISION_CONFIG?.portfolioId,
});

const unpackPortfolioValueResponse = (data) => ({
  estimatedValue: typeof data.estimated_value === "number" ? data.estimated_value : null,
});

const fetchPortfolioValue = async () => {
  const valuationEndpoint = `${window.getApiBase()}/api/portfolio/value`;
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
  });

  return unpackPortfolioValueResponse(data);
};

window.fetchPortfolioValue = fetchPortfolioValue;
