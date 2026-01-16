const buySellDecisionProvider = (() => {
  const getApiBase = () => {
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return isLocalhost ? "http://localhost:3000" : "https://investment-advisor-backend-ssf6.onrender.com";
  };

  const decisionsEndpoint = `${getApiBase()}/api/decisions`;

  const fetchDecisions = async ({
    updateDecisionStatus,
    renderDecisions,
    portfolioState,
    renderPortfolio,
  }) => {
    updateDecisionStatus("Fetching...", "Reaching out to the ML API.");

    try {
      const response = await fetch(decisionsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: ["SPY", "QQQ"],
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      renderDecisions(data);
      portfolioState.holdings = data.updated_holdings ?? portfolioState.holdings;
      portfolioState.cashBalance = data.cash_balance ?? portfolioState.cashBalance;
      portfolioState.lastChangePercent = data.daily_change_percent ?? portfolioState.lastChangePercent;
      portfolioState.lastUpdated = new Date();
      portfolioState.lastDecisionDate = data.decision_date ?? portfolioState.lastDecisionDate;

      renderPortfolio();
      updateDecisionStatus("Ready", "Decisions updated for next-day execution.");
    } catch (error) {
      updateDecisionStatus("Offline", "Unable to reach the backend API. Using cached values.");
      console.error("Decision fetch failed:", error);
    }
  };

  return {
    fetchDecisions,
  };
})();

window.buySellDecisionProvider = buySellDecisionProvider;
