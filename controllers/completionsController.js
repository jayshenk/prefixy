const path = require('path');
const Prefixy = require(path.resolve(path.dirname(__dirname), 'prefixy'));
const _ = require('lodash');
const jwt = require("jsonwebtoken");

const formatCompletionsWithScores = completions => {
  return _.chunk(completions, 2).map(completion => (
    {
      completion: completion[0],
      score: completion[1]
    }
  ));
};

const findTenant = token => {
  return jwt.verify(token, process.env.SECRET).tenant;
};

module.exports = {
  get: async function(req, res, next) {
    let tenant;
    try {
      tenant = findTenant(req.query.token);
    } catch(error) {
      error.status = 401;
      return next(error);
    }

    const prefix = req.query.prefix;
    const opts = {
      limit: req.query.limit || Prefixy.suggestionCount,
      withScores: req.query.scores || false,
    };
    let completions;

    try {
      completions = await Prefixy.invoke(() => Prefixy.search(prefix, tenant, opts));
    } catch(error) {
      return next(error);
    }

    if (opts.withScores) {
      completions = formatCompletionsWithScores(completions);
    }

    res.json(completions);
  },

  post: function(req, res, next) {
    let tenant;
    try {
      tenant = findTenant(req.body.token);
    } catch(error) {
      error.status = 401;
      return next(error);
    }

    const completions = req.body.completions;

    Prefixy.invoke(() => Prefixy.insertCompletions(completions, tenant));

    res.sendStatus(202);
  },

  delete: function(req, res, next) {
    let tenant;
    try {
      tenant = findTenant(req.body.token);
    } catch(error) {
      error.status = 401;
      return next(error);
    }

    const completions = req.body.completions;

    Prefixy.invoke(() => Prefixy.deleteCompletions(completions, tenant));

    res.sendStatus(202);
  },
}
