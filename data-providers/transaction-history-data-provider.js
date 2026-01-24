const buildEntries = (items = [], startDatetime) => {
  const parsedStart = startDatetime ? new Date(startDatetime) : null;
  return items
    .filter((item) => Array.isArray(item) && item.length >= 3)
    .map((item) => ({
      ticker: String(item[0]).toUpperCase(),
      shareCount: Number(item[1] ?? 0),
      transactionTime: item[2] ?? null,
    }))
    .filter((entry) => {
      if (!parsedStart || Number.isNaN(parsedStart.getTime())) {
        return true;
      }
      const entryTime = new Date(entry.transactionTime ?? "");
      if (Number.isNaN(entryTime.getTime())) {
        return true;
      }
      return entryTime >= parsedStart;
    })
    .sort((a, b) => new Date(a.transactionTime ?? 0) - new Date(b.transactionTime ?? 0));
};

const fetchTransactionHistory = async ({ startDatetime } = {}) => {
  const supabaseConfig = typeof window.getSupabaseConfig === "function" ? window.getSupabaseConfig() : null;
  const portfolioId = typeof window.getActivePortfolioId === "function"
    ? window.getActivePortfolioId()
    : window.DECISION_CONFIG?.portfolioId ?? null;
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey || !portfolioId) {
    throw new Error("Supabase is not configured.");
  }

  const tableName = supabaseConfig.transactionHistoryTable || "portfolio_transaction_history";
  const endpoint = `${supabaseConfig.url}/rest/v1/${tableName}?select=portfolio_id,sale_transaction,purchase_transaction&portfolio_id=eq.${encodeURIComponent(portfolioId)}`;
  console.info("[transactions] Supabase GET request", { endpoint, portfolioId });
  const response = await fetch(endpoint, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) {
    console.error("[transactions] API error response", {
      endpoint,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    throw new Error("No transaction history row returned.");
  }

  const parseJson = typeof window.safeParseJson === "function" ? window.safeParseJson : (value, fallback) => fallback;
  const salesRaw = parseJson(row.sale_transaction, []);
  const purchasesRaw = parseJson(row.purchase_transaction, []);
  const sales = buildEntries(Array.isArray(salesRaw) ? salesRaw : [], startDatetime);
  const purchases = buildEntries(Array.isArray(purchasesRaw) ? purchasesRaw : [], startDatetime);

  console.info("[transactions] Supabase response received", {
    portfolioId: row.portfolio_id ?? null,
    salesCount: sales.length,
    purchasesCount: purchases.length,
  });
  return {
    portfolioId: row.portfolio_id ?? null,
    sales,
    purchases,
  };
};

window.fetchTransactionHistory = fetchTransactionHistory;
