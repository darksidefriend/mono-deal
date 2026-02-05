const shuffle = require("../utils/shuffle");
const Card = require("./CardFactory");

class Deck {
  constructor() {
    this.cards = [];
    this.build();
    shuffle(this.cards);
  }

  build() {
    const add = (count, card) => {
      for (let i = 0; i < count; i++) {
        this.cards.push(card());
      }
    };

    add(2, () => Card.action("Аферист", 5));
    add(3, () => Card.action("Просто скажи Нет", 4, { isNo: true }));
    add(3, () => Card.action("Вынужденная сделка", 3));
    add(3, () => Card.action("Хитрая сделка", 3));
    add(2, () => Card.action("Красно-желтая рента", 1, { colors: ["red", "yellow"] }));
    add(2, () => Card.action("Сине-зеленая рента", 1, { colors: ["blue", "green"] }));
    add(3, () => Card.action("Универсальная рента", 3, { any: true }));
    add(2, () => Card.action("Двойная рента", 1, { double: true }));
    add(3, () => Card.action("Сегодня твой день рождения", 2, { collect: 2 }));
    add(10, () => Card.action("Пройди вперед", 1, { draw: 2 }));
    add(3, () => Card.action("Сборщик долгов", 3, { collect: 5 }));
    add(3, () => Card.action("Дом", 3, { house: true }));
    add(2, () => Card.action("Отель", 4, { hotel: true }));
    add(2, () => Card.property("Джокер", [], [], 0, { joker: true }));

    [1,1,1,1,1,1].forEach(v => add(1, () => Card.money(1)));
    [2,2,2,2,2].forEach(v => add(1, () => Card.money(2)));
    [3,3,3].forEach(v => add(1, () => Card.money(3)));
    [4,4,4].forEach(v => add(1, () => Card.money(4)));
    [5,5].forEach(v => add(1, () => Card.money(5)));
    add(1, () => Card.money(10));
  }

  draw(count = 1) {
    return this.cards.splice(0, count);
  }
}

module.exports = Deck;