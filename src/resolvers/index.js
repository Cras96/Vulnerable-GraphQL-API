const Query = require('./query');
const Mutation = require('./mutation');
const relations = require('./relations');

module.exports = {
  Query,
  Mutation,
  ...relations
};
