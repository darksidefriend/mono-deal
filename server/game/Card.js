const { CARD_TYPES } = require('../utils/constants');

class Card {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.value = data.value;
    this.color = data.color;
    this.action = data.action;
    this.rentType = data.rentType;
    this.target = data.target;
    this.wild = data.wild || false;
    this.wildColors = data.wildColors || [];
    this.selectedColor = null;
    this.colors = data.colors || []; // Добавляем свойство colors
  }
}

module.exports = Card;