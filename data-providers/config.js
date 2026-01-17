const DECISION_CONFIG = Object.freeze({
  portfolioId: "00000000-0000-0000-0000-000000000001",
  modelTypes: Object.freeze({
    LOGISTIC_CLASSIFICATION: "logistic-classification",
    LINEAR_REGRESSION: "linear-regression",
    RANDOM_FOREST_REGRESSION: "random-forest-regression",
  }),
});

const getApiBase = () => {
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return isLocalhost ? "http://localhost:3000" : "https://investment-advisor-backend-ssf6.onrender.com";
};

window.DECISION_CONFIG = DECISION_CONFIG;
window.getApiBase = getApiBase;
