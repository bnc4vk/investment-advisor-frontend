const DECISION_CONFIG = Object.freeze({
  portfolioId: null,
  modelTypes: Object.freeze({
    LOGISTIC_CLASSIFICATION: "logistic-classification",
    LINEAR_REGRESSION: "linear-regression",
    RANDOM_FOREST_REGRESSION: "random-forest-regression",
  }),
  forecastHorizons: Object.freeze({
    EOY: "EOY",
    THIRTY_DAYS: "30d",
  }),
});

const SUPABASE_CONFIG = Object.freeze({
  url: "https://upmsuqgcepaoeanexaao.supabase.co",
  anonKey: "sb_publishable_bc3sg7AAs4JWxvj8TyZKdw_69R6njVY",
  portfolioTable: "portfolios",
  portfolioIdColumn: "id",
  transactionHistoryTable: "portfolio_transaction_history",
});

const PORTFOLIO_STATE = {
  portfolioId: null,
  displayName: null,
};

const getApiBase = () => {
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return isLocalhost ? "http://localhost:3000" : "https://investment-advisor-backend-ssf6.onrender.com";
};

const getSupabaseConfig = () => {
  if (window.SUPABASE_CONFIG_OVERRIDE) {
    return {
      ...SUPABASE_CONFIG,
      ...window.SUPABASE_CONFIG_OVERRIDE,
    };
  }
  return SUPABASE_CONFIG;
};

const getActivePortfolioId = () => PORTFOLIO_STATE.portfolioId || DECISION_CONFIG.portfolioId || null;

const safeParseJson = (value, fallback) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }
  if (value == null) {
    return fallback;
  }
  return value;
};

window.DECISION_CONFIG = DECISION_CONFIG;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.PORTFOLIO_STATE = PORTFOLIO_STATE;
window.getApiBase = getApiBase;
window.getSupabaseConfig = getSupabaseConfig;
window.getActivePortfolioId = getActivePortfolioId;
window.safeParseJson = safeParseJson;
