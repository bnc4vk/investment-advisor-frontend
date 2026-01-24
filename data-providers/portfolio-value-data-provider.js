const buildHoldings = (tickers = [], counts = []) =>
  tickers
    .map((ticker, index) => ({
      ticker,
      shareCount: Number(counts[index] ?? 0),
      value: 0,
    }))
    .filter((holding) => holding.ticker)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

const buildDecisionSummary = (items = [], mode) =>
  items
    .filter((entry) => entry?.ticker)
    .map((entry) => ({
      ticker: entry.ticker,
      [mode]: typeof entry.share_count === "number" ? entry.share_count : Number(entry.shares ?? entry.shares_to_sell ?? entry.shares_to_buy ?? 0),
    }));

const fetchPortfolioValue = async () => {
  const supabaseConfig = typeof window.getSupabaseConfig === "function" ? window.getSupabaseConfig() : null;
  const portfolioId = typeof window.getActivePortfolioId === "function"
    ? window.getActivePortfolioId()
    : window.DECISION_CONFIG?.portfolioId ?? null;
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey || !portfolioId) {
    throw new Error("Supabase is not configured.");
  }

  const tableName = supabaseConfig.portfolioTable || "portfolios";
  const idColumn = supabaseConfig.portfolioIdColumn || "id";
  const endpoint = `${supabaseConfig.url}/rest/v1/${tableName}?select=${idColumn},balance,capital,etfs,etf_share_counts,last_sale,last_purchase,last_update_date&${idColumn}=eq.${encodeURIComponent(portfolioId)}`;
  console.info("[valuation] Supabase GET request", { endpoint, portfolioId });
  const response = await fetch(endpoint, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) {
    console.error("[valuation] API error response", {
      endpoint,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    throw new Error("No portfolio row returned.");
  }

  const parseJson = typeof window.safeParseJson === "function" ? window.safeParseJson : (value, fallback) => fallback;
  const tickers = parseJson(row.etfs, []);
  const counts = parseJson(row.etf_share_counts, []);
  const lastSale = parseJson(row.last_sale, []);
  const lastPurchase = parseJson(row.last_purchase, []);

  const holdings = buildHoldings(Array.isArray(tickers) ? tickers : [], Array.isArray(counts) ? counts : []);

  const balanceValue = typeof row.balance === "number" ? row.balance : Number(row.balance ?? NaN);

  return {
    estimatedValue: Number.isFinite(balanceValue) ? balanceValue : null,
    capitalBalance: typeof row.capital === "number" ? row.capital : Number(row.capital ?? 0),
    holdings,
    latestSellDecisions: buildDecisionSummary(Array.isArray(lastSale) ? lastSale : [], "sharesToSell"),
    latestBuyDecisions: buildDecisionSummary(Array.isArray(lastPurchase) ? lastPurchase : [], "sharesToBuy"),
  };
};

window.fetchPortfolioValue = fetchPortfolioValue;
