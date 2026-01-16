const portfolioState = {
  startingBalance: 100000,
  cashBalance: 100000,
  holdings: [],
  lastChangePercent: 0,
  lastUpdated: null,
  lastDecisionDate: null,
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
};

const refreshButton = document.getElementById("refresh-decisions");
const simulateButton = document.getElementById("simulate-day");


const formatCurrency = (value) =>
  value.toLocaleString("en-US", {
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

const renderPortfolio = () => {
  const portfolioValue = portfolioState.cashBalance + portfolioState.holdings.reduce((sum, holding) => sum + holding.value, 0);
  elements.balance.textContent = formatCurrency(portfolioValue);
  elements.cashBalance.textContent = formatCurrency(portfolioState.cashBalance);
  elements.holdingCount.textContent = `${portfolioState.holdings.length} ETFs`;
  elements.change.textContent = formatPercent(portfolioState.lastChangePercent);
  elements.change.style.color = portfolioState.lastChangePercent >= 0 ? "var(--success)" : "var(--danger)";

  if (portfolioState.lastUpdated) {
    elements.lastUpdated.textContent = `Last updated: ${formatTimestamp(portfolioState.lastUpdated)}`;
  }
};

const renderDecisions = (decisions) => {
  const { sell = [], buy = [] } = decisions;

  elements.sellList.innerHTML = "";
  elements.buyList.innerHTML = "";

  if (sell.length === 0) {
    elements.sellList.innerHTML = "<li class=\"decision-list__empty\">No sell candidates today.</li>";
  }

  if (buy.length === 0) {
    elements.buyList.innerHTML = "<li class=\"decision-list__empty\">No buy candidates today.</li>";
  }

  sell.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${item.ticker}</span><span class=\"decision-pill decision-pill--sell\">Sell</span>`;
    elements.sellList.appendChild(li);
  });

  buy.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${item.ticker}</span><span class=\"decision-pill\">Buy</span>`;
    elements.buyList.appendChild(li);
  });
};

const updateDecisionStatus = (status, message) => {
  elements.decisionStatus.textContent = status;
  elements.decisionMessage.textContent = message;
};

const applyPortfolioUpdate = (update) => {
  if (!update) {
    return;
  }

  if (update.holdings !== null) {
    portfolioState.holdings = update.holdings;
  }

  if (update.cashBalance !== null) {
    portfolioState.cashBalance = update.cashBalance;
  }

  if (update.lastChangePercent !== null) {
    portfolioState.lastChangePercent = update.lastChangePercent;
  }

  if (update.lastDecisionDate !== null) {
    portfolioState.lastDecisionDate = update.lastDecisionDate;
  }

  portfolioState.lastUpdated = new Date();
};

const fetchDecisions = async () => {
  updateDecisionStatus("Fetching...", "Reaching out to the ML API.");

  try {
    const { decisions, portfolio } = await fetchBuySellDecisions();
    renderDecisions(decisions);
    applyPortfolioUpdate(portfolio);
    renderPortfolio();
    updateDecisionStatus("Ready", "Decisions updated for next-day execution.");
  } catch (error) {
    updateDecisionStatus("Offline", "Unable to reach the backend API. Using cached values.");
    console.error("Decision fetch failed:", error);
  }
};

const simulateTradingDay = () => {
  const change = (Math.random() * 1.4 - 0.4) / 100;
  const portfolioValue = portfolioState.cashBalance + portfolioState.holdings.reduce((sum, holding) => sum + holding.value, 0);
  const newValue = portfolioValue * (1 + change);
  const delta = newValue - portfolioValue;

  portfolioState.cashBalance += delta;
  portfolioState.lastChangePercent = change * 100;
  portfolioState.lastUpdated = new Date();

  renderPortfolio();
  updateDecisionStatus("Simulated", "Local simulation ran. Fetch decisions after market close.");
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
simulateButton.addEventListener("click", simulateTradingDay);

renderPortfolio();

if (shouldAutoFetch()) {
  fetchDecisions();
}

setInterval(() => {
  if (shouldAutoFetch()) {
    fetchDecisions();
  }
}, 5 * 60 * 1000);
