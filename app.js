const portfolioState = {
  startingBalance: 100000,
  cashBalance: 100000,
  holdings: [],
  lastChangePercent: 0,
  lastUpdated: null,
  lastDecisionDate: null,
  estimatedValue: null,
  portfolioInView: null,
  portfolioDisplayName: null,
  portfolioDirectory: [],
  portfolioDirectoryMap: new Map(),
  portfolioDirectoryMessage: "Select a portfolio to begin.",
  transactionHistory: {
    sales: [],
    purchases: [],
  },
};

const elements = {
  balance: document.getElementById("portfolio-balance"),
  change: document.getElementById("portfolio-change"),
  holdingCount: document.getElementById("holding-count"),
  cashBalance: document.getElementById("cash-balance"),
  lastUpdated: document.getElementById("last-updated"),
  portfolioTile: document.getElementById("portfolio-tile"),
  portfolioSelectorButton: document.getElementById("portfolio-selector-button"),
  portfolioSelectorLabel: document.getElementById("portfolio-selector-label"),
  portfolioSelectorMenu: document.getElementById("portfolio-selector-menu"),
  decisionStatus: document.getElementById("decision-status"),
  sellList: document.getElementById("sell-list"),
  buyList: document.getElementById("buy-list"),
  decisionMessage: document.getElementById("decision-message"),
  portfolioList: document.getElementById("portfolio-list"),
  transactionSalesList: document.getElementById("transaction-sales-list"),
  transactionPurchasesList: document.getElementById("transaction-purchases-list"),
  transactionStatus: document.getElementById("transaction-status"),
  transactionMessage: document.getElementById("transaction-message"),
  loadingOverlay: document.getElementById("loading-overlay"),
};

// Hidden by default in the UI; kept for possible reintroduction/deprecation cleanup later.
const latestTradesButton = document.getElementById("latest-trades");
const portfolioRefreshButton = document.getElementById("refresh-portfolio");
const transactionHistoryButton = document.getElementById("transaction-history");

if (elements.portfolioSelectorButton) {
  elements.portfolioSelectorButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = elements.portfolioTile?.classList.contains("is-open");
    setPortfolioTileOpen(!isOpen);
  });
}

document.addEventListener("click", (event) => {
  if (!elements.portfolioTile) {
    return;
  }
  if (!elements.portfolioTile.contains(event.target)) {
    setPortfolioTileOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setPortfolioTileOpen(false);
  }
});

const setPageLoading = (isLoading) => {
  document.body.classList.toggle("is-loading", isLoading);
  if (elements.loadingOverlay) {
    elements.loadingOverlay.setAttribute("aria-busy", String(isLoading));
  }
};

const setButtonLoading = (button, isLoading) => {
  if (!button) {
    return;
  }

  button.classList.toggle("button--loading", isLoading);
  button.toggleAttribute("disabled", isLoading);
  button.setAttribute("aria-busy", String(isLoading));
};

const triggerButtonPress = (button) => {
  if (!button) {
    return;
  }

  button.classList.add("button--pressed");
  window.setTimeout(() => button.classList.remove("button--pressed"), 150);
};

const PORTFOLIO_PLACEHOLDER = "Select portfolio";

const setPortfolioTileOpen = (isOpen) => {
  if (!elements.portfolioTile || !elements.portfolioSelectorButton) {
    return;
  }
  elements.portfolioTile.classList.toggle("is-open", isOpen);
  elements.portfolioSelectorButton.setAttribute("aria-expanded", String(isOpen));
};

const setPortfolioInView = ({ id, displayName }) => {
  if (!id) {
    return;
  }
  portfolioState.portfolioInView = id;
  portfolioState.portfolioDisplayName = displayName ?? id;
  if (window.PORTFOLIO_STATE) {
    window.PORTFOLIO_STATE.portfolioId = id;
    window.PORTFOLIO_STATE.displayName = displayName ?? null;
  }
  window.portfolio_in_view = id;
  if (elements.portfolioSelectorLabel) {
    elements.portfolioSelectorLabel.textContent = displayName ?? id;
  }
  updateTransactionStatus("Awaiting fetch", "Select 'Fetch Transaction History' to load transactions.");
  renderPortfolioDirectory();
};

const renderPortfolioDirectory = () => {
  if (!elements.portfolioSelectorMenu) {
    return;
  }
  const entries = portfolioState.portfolioDirectory;
  elements.portfolioSelectorMenu.innerHTML = "";
  const shouldScroll = entries.length > 6;
  elements.portfolioSelectorMenu.classList.toggle("portfolio-tile__menu--scroll", shouldScroll);

  if (!entries.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "portfolio-tile__empty";
    emptyItem.textContent = portfolioState.portfolioDirectoryMessage;
    elements.portfolioSelectorMenu.appendChild(emptyItem);
    return;
  }

  entries.forEach((entry) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "portfolio-tile__option";
    if (entry.id === portfolioState.portfolioInView) {
      button.classList.add("is-selected");
      button.setAttribute("aria-selected", "true");
    }
    button.textContent = entry.displayName;
    button.addEventListener("click", () => {
      setPortfolioInView(entry);
      setPortfolioTileOpen(false);
      fetchPortfolioValuation({ showOverlay: false });
    });
    li.appendChild(button);
    elements.portfolioSelectorMenu.appendChild(li);
  });
};

const normalizePortfolioEntries = (rows = [], idColumn = "id") =>
  rows
    .map((entry) => {
      const id = entry?.[idColumn] ?? entry?.id ?? entry?.uuid ?? entry?.portfolio_id ?? null;
      if (!id) {
        return null;
      }
      const displayName = entry?.display_name ?? entry?.displayName ?? entry?.name ?? `Portfolio ${id.slice(-4)}`;
      return {
        id,
        displayName,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

const fetchPortfolioDirectory = async ({ showOverlay = false } = {}) => {
  if (showOverlay) {
    setPageLoading(true);
  }

  portfolioState.portfolioDirectoryMessage = "Loading portfolios...";
  renderPortfolioDirectory();

  const supabaseConfig = typeof window.getSupabaseConfig === "function" ? window.getSupabaseConfig() : null;
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey) {
    portfolioState.portfolioDirectory = [];
    portfolioState.portfolioDirectoryMap = new Map();
    portfolioState.portfolioDirectoryMessage = "Supabase is not configured.";
    renderPortfolioDirectory();
    if (showOverlay) {
      setPageLoading(false);
    }
    return;
  }

  const tableName = supabaseConfig.portfolioTable || "portfolio";
  const idColumn = supabaseConfig.portfolioIdColumn || "id";
  const endpoint = `${supabaseConfig.url}/rest/v1/${tableName}?select=${idColumn},display_name&order=display_name.asc`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}`);
    }

    const data = await response.json();
    const normalized = normalizePortfolioEntries(Array.isArray(data) ? data : [], idColumn);
    portfolioState.portfolioDirectory = normalized;
    portfolioState.portfolioDirectoryMap = new Map(normalized.map((entry) => [entry.id, entry]));
    portfolioState.portfolioDirectoryMessage = normalized.length ? "" : "No portfolios found.";
  } catch (error) {
    console.error("[supabase] Portfolio fetch failed", error);
    portfolioState.portfolioDirectory = [];
    portfolioState.portfolioDirectoryMap = new Map();
    portfolioState.portfolioDirectoryMessage = "Unable to load portfolios.";
  } finally {
    renderPortfolioDirectory();
    if (showOverlay) {
      setPageLoading(false);
    }
  }
};

const formatCurrency = (value) =>
  (Number.isFinite(value) ? value : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

const formatPercent = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}% since Jan 20th`;

const formatTimestamp = (date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);

const formatTransactionTime = (value) => {
  if (!value) {
    return "Unknown time";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }
  return formatTimestamp(parsed);
};

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
  } else {
    elements.lastUpdated.textContent = "Last updated: --";
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

const renderTransactionHistory = () => {
  renderList(
    elements.transactionSalesList,
    portfolioState.transactionHistory.sales,
    "No sales loaded yet.",
    (entry) => `<span>${entry.ticker} <span class="decision-subtext">(${entry.shareCount} shares • ${formatTransactionTime(entry.transactionTime)})</span></span><span class="decision-pill decision-pill--sell">Sale</span>`,
  );

  renderList(
    elements.transactionPurchasesList,
    portfolioState.transactionHistory.purchases,
    "No purchases loaded yet.",
    (entry) => `<span>${entry.ticker} <span class="decision-subtext">(${entry.shareCount} shares • ${formatTransactionTime(entry.transactionTime)})</span></span><span class="decision-pill">Purchase</span>`,
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

const updateTransactionStatus = (status, message) => {
  elements.transactionStatus.textContent = status;
  elements.transactionMessage.textContent = message;
};

const ensurePortfolioSelected = (context) => {
  const portfolioId = typeof window.getActivePortfolioId === "function" ? window.getActivePortfolioId() : null;
  if (portfolioId) {
    return portfolioId;
  }
  const message = "Select a portfolio to continue.";
  if (context === "decisions") {
    updateDecisionStatus("Select portfolio", message);
  }
  if (context === "transactions") {
    updateTransactionStatus("Select portfolio", message);
  }
  if (context === "valuation") {
    elements.lastUpdated.textContent = "Last updated: --";
  }
  return null;
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

const applyTransactionHistory = (history) => {
  if (!history) {
    return;
  }

  if (Array.isArray(history.sales)) {
    portfolioState.transactionHistory.sales = history.sales;
  }

  if (Array.isArray(history.purchases)) {
    portfolioState.transactionHistory.purchases = history.purchases;
  }
};

const fetchDecisions = async ({ showButtonLoading = false } = {}) => {
  if (!ensurePortfolioSelected("decisions")) {
    return;
  }
  updateDecisionStatus("Fetching...", "Reaching out to the ML API.");

  if (showButtonLoading) {
    setButtonLoading(latestTradesButton
    , true);
  }

  try {
    const { decisions, meta } = await fetchBuySellDecisions();
    renderDecisions(decisions);
    const fullHoldings = buildPortfolioHoldings(meta.unchangedHoldings ?? [], decisions.buy ?? []);
    applyPortfolioUpdate({
      holdings: fullHoldings.length ? fullHoldings : null,
      cashBalance: meta.capitalBalance ?? null,
      lastDecisionDate: meta.decisionDate ?? null,
    });
    renderPortfolio();
    renderPortfolioHoldings();
    if (meta.skipped) {
      updateDecisionStatus("Skipped", meta.reason ?? "Decisions skipped by backend.");
    } else {
      updateDecisionStatus("Ready", "Most recent trade decisions are now available.");
    }
  } catch (error) {
    updateDecisionStatus("Offline", "Unable to reach the backend API. Using cached values.");
    console.error("[decisions] Fetch failed", error);
  } finally {
    if (showButtonLoading) {
      setButtonLoading(latestTradesButton
      , false);
    }
  }
};

const fetchTransactionHistoryData = async ({ showButtonLoading = false } = {}) => {
  if (!ensurePortfolioSelected("transactions")) {
    return;
  }
  updateTransactionStatus("Fetching...", "Reaching out for transaction history.");

  if (showButtonLoading) {
    setButtonLoading(transactionHistoryButton, true);
  }

  if (typeof window.fetchTransactionHistory !== "function") {
    console.error("[transactions] Data provider not loaded. Ensure transaction-history-data-provider.js is included before app.js.");
    updateTransactionStatus("Offline", "Transaction history provider unavailable.");
    if (showButtonLoading) {
      setButtonLoading(transactionHistoryButton, false);
    }
    return;
  }

  try {
    const history = await window.fetchTransactionHistory();
    applyTransactionHistory(history);
    renderTransactionHistory();
    updateTransactionStatus("Ready", "Transaction history is up to date.");
  } catch (error) {
    updateTransactionStatus("Offline", "Unable to reach the backend API.");
    console.error("[transactions] Fetch failed", error);
  } finally {
    if (showButtonLoading) {
      setButtonLoading(transactionHistoryButton, false);
    }
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

  if (typeof valuation.capitalBalance === "number") {
    portfolioState.cashBalance = valuation.capitalBalance;
  }

  if (Array.isArray(valuation.holdings)) {
    portfolioState.holdings = valuation.holdings;
  }

  if (Array.isArray(valuation.latestSellDecisions) || Array.isArray(valuation.latestBuyDecisions)) {
    renderDecisions({
      sell: valuation.latestSellDecisions ?? [],
      buy: valuation.latestBuyDecisions ?? [],
    });
  }

  portfolioState.lastUpdated = new Date();
};

const fetchPortfolioValuation = async ({ showOverlay = false, showButtonLoading = false } = {}) => {
  if (showOverlay) {
    setPageLoading(true);
  }

  if (showButtonLoading) {
    setButtonLoading(portfolioRefreshButton, true);
  }

  if (!ensurePortfolioSelected("valuation")) {
    if (showButtonLoading) {
      setButtonLoading(portfolioRefreshButton, false);
    }
    if (showOverlay) {
      setPageLoading(false);
    }
    return;
  }

  if (typeof window.fetchPortfolioValue !== "function") {
    console.error("[valuation] Data provider not loaded. Ensure portfolio-value-data-provider.js is included before app.js.");
    if (showButtonLoading) {
      setButtonLoading(portfolioRefreshButton, false);
    }
    if (showOverlay) {
      setPageLoading(false);
    }
    return;
  }

  try {
    const valuation = await window.fetchPortfolioValue();
    applyPortfolioValuation(valuation);
    renderPortfolio();
    renderPortfolioHoldings();
  } catch (error) {
    console.error("[valuation] Fetch failed", {
      time: new Date().toISOString(),
      message: error?.message ?? String(error),
    });
  } finally {
    if (showButtonLoading) {
      setButtonLoading(portfolioRefreshButton, false);
    }

    if (showOverlay) {
      setPageLoading(false);
    }
  }
};

const shouldAutoFetch = () => {
  if (typeof window.getActivePortfolioId === "function" ? !window.getActivePortfolioId() : true) {
    return false;
  }
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

latestTradesButton.addEventListener("click", () => {
  triggerButtonPress(latestTradesButton
  );
  fetchDecisions({ showButtonLoading: true });
});
portfolioRefreshButton.addEventListener("click", () => {
  triggerButtonPress(portfolioRefreshButton);
  fetchPortfolioValuation({ showButtonLoading: true });
});
transactionHistoryButton.addEventListener("click", () => {
  triggerButtonPress(transactionHistoryButton);
  fetchTransactionHistoryData({ showButtonLoading: true });
});

renderPortfolio();
renderPortfolioHoldings();
renderTransactionHistory();
updateDecisionStatus("Awaiting fetch", "Select a portfolio to view decisions.");
updateTransactionStatus("Awaiting fetch", "Select a portfolio to view transaction history.");
if (elements.portfolioSelectorLabel) {
  elements.portfolioSelectorLabel.textContent = PORTFOLIO_PLACEHOLDER;
}
fetchPortfolioDirectory({ showOverlay: true });

if (shouldAutoFetch()) {
  fetchDecisions();
}

setInterval(() => {
  if (shouldAutoFetch()) {
    fetchDecisions();
  }
}, 5 * 60 * 1000);
