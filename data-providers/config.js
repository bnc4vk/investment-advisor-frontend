const DECISION_CONFIG = Object.freeze({
  portfolioId: "00000000-0000-0000-0000-000000000001",
  modelTypes: Object.freeze({
    LOGISTIC_CLASSIFICATION: "logistic-classification",
    LINEAR_REGRESSION: "linear-regression",
    RANDOM_FOREST_REGRESSION: "random-forest-regression",
  }),
});

window.DECISION_CONFIG = DECISION_CONFIG;
