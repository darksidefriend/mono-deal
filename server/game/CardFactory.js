const uuid = require("../utils/uuid");

exports.action = (name, value, meta = {}) => ({
  id: uuid(),
  type: "action",
  name,
  value,
  meta
});

exports.money = value => ({
  id: uuid(),
  type: "money",
  name: `${value}М`,
  value
});

exports.property = (name, colors, rent, value, meta = {}) => ({
  id: uuid(),
  type: "property",
  name,
  value,
  meta: {
    colors,
    rent,
    ...meta
  }
});