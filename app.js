const portfolioState = {
  startingBalance: 100000,
  cashBalance: 100000,
  holdings: [],
  lastChangePercent: 0,
  lastUpdated: null,
  lastDecisionDate: null,
  estimatedValue: null,
};

const elements = {
  balance: document.getElementById("portfolio-balance"),
  change: document.getElementById("portfolio-change"),
  holdingCount: document.getElementById("holding-count"),
  cashBalance: document.getElementById("cash-balance"),
  lastUpdated: document.getElementById("last-updated"),
  decisionStatus: document.getElementById("decision-status"),
  sellList: document.getElementById("sell-list"),
  buyList: document.getElementById("buy-list"),
  decisionMessage: document.getElementById("decision-message"),
  portfolioList: document.getElementById("portfolio-list"),
};

const refreshButton = document.getElementById("refresh-decisions");
const valuationButton = document.getElementById("refresh-valuation");


const formatCurrency = (value) =>
  (Number.isFinite(value) ? value : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

const formatPercent = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}% today`;

const formatTimestamp = (date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const buildPortfolioHoldings = (unchangedHoldings = [], buyDecisions = []) => {
  const holdingsByTicker = new Map();

  unchangedHoldings.forEach((holding) => {
    if (!holding?.ticker) {
      return;
    }
    holdingsByTicker.set(holding.ticker, {
      ticker: holding.ticker,
      shareCount: holding.shareCount ?? 0,
      value: 0,
    });
  });

  buyDecisions.forEach((buy) => {
    if (!buy?.ticker) {
      return;
    }
    const existing = holdingsByTicker.get(buy.ticker);
    const sharesToBuy = buy.sharesToBuy ?? 0;
    if (existing) {
      existing.shareCount += sharesToBuy;
    } else {
      holdingsByTicker.set(buy.ticker, {
        ticker: buy.ticker,
        shareCount: sharesToBuy,
        value: 0,
      });
    }
  });

  return Array.from(holdingsByTicker.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
};

const renderPortfolio = () => {
  const portfolioValue = portfolioState.cashBalance + portfolioState.holdings.reduce((sum, holding) => sum + holding.value, 0);
  const displayValue = Number.isFinite(portfolioState.estimatedValue) ? portfolioState.estimatedValue : portfolioValue;
  elements.balance.textContent = formatCurrency(displayValue);
  elements.cashBalance.textContent = formatCurrency(portfolioState.cashBalance);
  elements.holdingCount.textContent = `${portfolioState.holdings.length} ETFs`;
  elements.change.textContent = formatPercent(portfolioState.lastChangePercent);
  elements.change.style.color = portfolioState.lastChangePercent >= 0 ? "var(--success)" : "var(--danger)";

  if (portfolioState.lastUpdated) {
    elements.lastUpdated.textContent = `Last updated: ${formatTimestamp(portfolioState.lastUpdated)}`;
  }
};

const renderList = (listElement, items, emptyMessage, renderItem) => {
  listElement.innerHTML = "";

  if (!items.length) {
    listElement.innerHTML = `<li class="decision-list__empty">${emptyMessage}</li>`;
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = renderItem(item);
    listElement.appendChild(li);
  });
};

const renderPortfolioHoldings = () => {
  renderList(
    elements.portfolioList,
    portfolioState.holdings,
    "No holdings loaded yet.",
    (holding) => `<span>${holding.ticker} <span class="decision-subtext">(${holding.shareCount} shares)</span></span><span class="decision-pill">Holding</span>`,
  );
};

const renderDecisions = (decisions) => {
  const { sell = [], buy = [] } = decisions;

  renderList(
    elements.sellList,
    sell,
    "No sell candidates today.",
    (item) => `<span>${item.ticker} <span class="decision-subtext">(${item.sharesToSell} shares)</span></span><span class="decision-pill decision-pill--sell">Sell</span>`,
  );

  renderList(
    elements.buyList,
    buy,
    "No buy candidates today.",
    (item) => `<span>${item.ticker} <span class="decision-subtext">(${item.sharesToBuy} shares)</span></span><span class="decision-pill">Buy</span>`,
  );
};

const updateDecisionStatus = (status, message) => {
  elements.decisionStatus.textContent = status;
  elements.decisionMessage.textContent = message;
};

const applyPortfolioUpdate = (update) => {
  if (!update) {
    return;
  }

  if (Array.isArray(update.holdings)) {
    portfolioState.holdings = update.holdings;
  }

  if (typeof update.cashBalance === "number") {
    portfolioState.cashBalance = update.cashBalance;
  }

  if (typeof update.lastChangePercent === "number") {
    portfolioState.lastChangePercent = update.lastChangePercent;
  }

  if (typeof update.lastDecisionDate === "string") {
    portfolioState.lastDecisionDate = update.lastDecisionDate;
  }

  portfolioState.lastUpdated = new Date();
};

const fetchDecisions = async () => {
  updateDecisionStatus("Fetching...", "Reaching out to the ML API.");

  try {
    const { decisions, meta } = await fetchBuySellDecisions();
    renderDecisions(decisions);
    const fullHoldings = buildPortfolioHoldings(meta.unchangedHoldings ?? [], decisions.buy ?? []);
    applyPortfolioUpdate({
      holdings: fullHoldings.length ? fullHoldings : null,
      lastDecisionDate: meta.decisionDate ?? null,
    });
    renderPortfolio();
    renderPortfolioHoldings();
    if (meta.skipped) {
      updateDecisionStatus("Skipped", meta.reason ?? "Decisions skipped by backend.");
    } else {
      updateDecisionStatus("Ready", "Decisions updated for next-day execution.");
    }
  } catch (error) {
    updateDecisionStatus("Offline", "Unable to reach the backend API. Using cached values.");
    console.error("[decisions] Fetch failed", error);
  }
};

const applyPortfolioValuation = (valuation) => {
  if (!valuation) {
    return;
  }

  if (typeof valuation.estimatedValue === "number") {
    portfolioState.estimatedValue = valuation.estimatedValue;
    portfolioState.lastChangePercent = ((valuation.estimatedValue - portfolioState.startingBalance) / portfolioState.startingBalance) * 100;
  }

  portfolioState.lastUpdated = new Date();
};

const fetchPortfolioValuation = async () => {
  if (typeof fetchPortfolioValue !== "function") {
    console.error("[valuation] Data provider not loaded. Ensure portfolio-value-data-provider.js is included before app.js.");
    return;
  }

  try {
    const valuation = await fetchPortfolioValue();
    applyPortfolioValuation(valuation);
    renderPortfolio();
  } catch (error) {
    console.error("[valuation] Fetch failed", {
      time: new Date().toISOString(),
      message: error?.message ?? String(error),
    });
  }
};

const shouldAutoFetch = () => {
  const now = new Date();
  const newYorkTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hours = Number(newYorkTime.find((part) => part.type === "hour").value);
  const minutes = Number(newYorkTime.find((part) => part.type === "minute").value);
  const afterClose = hours > 16 || (hours === 16 && minutes >= 5);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const alreadyFetchedToday = portfolioState.lastDecisionDate === today;

  return afterClose && !alreadyFetchedToday;
};

refreshButton.addEventListener("click", fetchDecisions);
valuationButton.addEventListener("click", fetchPortfolioValuation);

renderPortfolio();
renderPortfolioHoldings();
fetchPortfolioValuation();

if (shouldAutoFetch()) {
  fetchDecisions();
}

setInterval(() => {
  if (shouldAutoFetch()) {
    fetchDecisions();
  }
}, 5 * 60 * 1000);
