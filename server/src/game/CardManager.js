const { cards, propertyCards, CARD_TYPES, PROPERTY_COLORS } = require('../utils/cardConfig');

class CardManager {
  constructor() {
    this.deck = [];
    this.discardPile = [];
    this.initializeDeck();
  }

  initializeDeck() {
    this.deck = [];
    
    // Добавляем обычные карты
    cards.forEach(cardConfig => {
      for (let i = 0; i < cardConfig.quantity; i++) {
        this.deck.push({
          id: `${cardConfig.id}_${i}`,
          type: cardConfig.type,
          name: cardConfig.name,
          value: cardConfig.value,
          colors: cardConfig.colors || [],
          metadata: cardConfig
        });
      }
    });

    // Добавляем карты собственности
    propertyCards.forEach(propertyConfig => {
      for (let i = 0; i < propertyConfig.quantity; i++) {
        this.deck.push({
          id: `${propertyConfig.id}_${i}`,
          type: CARD_TYPES.PROPERTY,
          name: propertyConfig.name,
          color: propertyConfig.color,
          value: propertyConfig.value,
          rent: propertyConfig.rent,
          isWild: propertyConfig.colors && propertyConfig.colors.length > 1,
          wildColors: propertyConfig.colors || [],
          metadata: propertyConfig
        });
      }
    });

    this.shuffleDeck();
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  drawCard() {
    if (this.deck.length === 0) {
      this.reshuffleDiscardPile();
    }
    return this.deck.pop();
  }

  drawCards(count) {
    const drawnCards = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawCard();
      if (card) drawnCards.push(card);
    }
    return drawnCards;
  }

  reshuffleDiscardPile() {
    this.deck = [...this.discardPile];
    this.discardPile = [];
    this.shuffleDeck();
  }

  discardCard(card) {
    this.discardPile.push(card);
  }

  discardCards(cards) {
    cards.forEach(card => this.discardCard(card));
  }

  getDeckSize() {
    return this.deck.length;
  }

  getDiscardPileSize() {
    return this.discardPile.length;
  }
}

module.exports = CardManager;