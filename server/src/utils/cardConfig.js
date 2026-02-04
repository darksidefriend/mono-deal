const CARD_TYPES = {
  PROPERTY: 'property',
  MONEY: 'money',
  ACTION: 'action',
  RENT: 'rent',
  BUILDING: 'building',
  WILD: 'wild'
};

const PROPERTY_COLORS = {
  BROWN: 'brown',
  RAILROAD: 'black',
  RED: 'red',
  GREEN: 'green',
  ORANGE: 'orange',
  BLUE: 'blue',
  PURPLE: 'purple',
  UTILITY: 'sand',
  YELLOW: 'yellow',
  LIGHT_BLUE: 'light-blue'
};

const cards = [
  // Action cards
  { id: 'swindler', name: 'Аферист', type: CARD_TYPES.ACTION, value: 5, quantity: 2 },
  { id: 'just_say_no', name: 'Просто скажи Нет', type: CARD_TYPES.ACTION, value: 4, quantity: 3 },
  { id: 'forced_deal', name: 'Вынужденная сделка', type: CARD_TYPES.ACTION, value: 3, quantity: 3 },
  { id: 'sneaky_deal', name: 'Хитрая сделка', type: CARD_TYPES.ACTION, value: 3, quantity: 3 },
  
  // Rent cards
  { id: 'rent_red_yellow', name: 'Красно-желтая Рента', type: CARD_TYPES.RENT, value: 1, quantity: 2, colors: [PROPERTY_COLORS.RED, PROPERTY_COLORS.YELLOW] },
  { id: 'rent_blue_green', name: 'Сине-зеленая Рента', type: CARD_TYPES.RENT, value: 1, quantity: 2, colors: [PROPERTY_COLORS.BLUE, PROPERTY_COLORS.GREEN] },
  { id: 'rent_light_blue_brown', name: 'Голубо-коричневая Рента', type: CARD_TYPES.RENT, value: 1, quantity: 2, colors: [PROPERTY_COLORS.LIGHT_BLUE, PROPERTY_COLORS.BROWN] },
  { id: 'rent_orange_purple', name: 'Оранжево-фиолетовая Рента', type: CARD_TYPES.RENT, value: 1, quantity: 2, colors: [PROPERTY_COLORS.ORANGE, PROPERTY_COLORS.PURPLE] },
  { id: 'rent_railroad_utility', name: 'Черно-песочная Рента', type: CARD_TYPES.RENT, value: 1, quantity: 2, colors: [PROPERTY_COLORS.RAILROAD, PROPERTY_COLORS.UTILITY] },
  { id: 'rent_any', name: 'Универсальная рента', type: CARD_TYPES.RENT, value: 3, quantity: 3 },
  { id: 'double_rent', name: 'Двойная рента', type: CARD_TYPES.ACTION, value: 1, quantity: 2 },
  
  // Money cards
  { id: 'money_1', name: '1М', type: CARD_TYPES.MONEY, value: 1, quantity: 6 },
  { id: 'money_2', name: '2М', type: CARD_TYPES.MONEY, value: 2, quantity: 5 },
  { id: 'money_3', name: '3М', type: CARD_TYPES.MONEY, value: 3, quantity: 3 },
  { id: 'money_4', name: '4М', type: CARD_TYPES.MONEY, value: 4, quantity: 3 },
  { id: 'money_5', name: '5М', type: CARD_TYPES.MONEY, value: 5, quantity: 2 },
  { id: 'money_10', name: '10М', type: CARD_TYPES.MONEY, value: 10, quantity: 1 },
  
  // Special action cards
  { id: 'birthday', name: 'Сегодня твой день рождения!', type: CARD_TYPES.ACTION, value: 2, quantity: 3 },
  { id: 'pass_go', name: 'Пройди клетку Вперед', type: CARD_TYPES.ACTION, value: 1, quantity: 10 },
  { id: 'debt_collector', name: 'Сборщик долгов', type: CARD_TYPES.ACTION, value: 3, quantity: 3 },
  
  // Buildings
  { id: 'house', name: 'Дом', type: CARD_TYPES.BUILDING, value: 3, quantity: 3 },
  { id: 'hotel', name: 'Отель', type: CARD_TYPES.BUILDING, value: 4, quantity: 2 },
  
  // Wild cards
  { id: 'joker', name: 'Джокер', type: CARD_TYPES.WILD, value: 0, quantity: 2 },
  
  // Properties will be defined separately due to complexity
];

const propertyCards = [
  // Brown properties
  { id: 'property_brown_1', name: 'Житная ул.', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.BROWN, value: 1, rent: [1, 2], quantity: 1 },
  { id: 'property_brown_2', name: 'Нагатинская ул.', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.BROWN, value: 1, rent: [1, 2], quantity: 1 },
  
  // Railroad properties
  { id: 'property_railroad_1', name: 'Ленинградская ЖД', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.RAILROAD, value: 4, rent: [1, 2, 3, 4], quantity: 1 },
  { id: 'property_railroad_2', name: 'Рижская ЖД', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.RAILROAD, value: 4, rent: [1, 2, 3, 4], quantity: 1 },
  { id: 'property_railroad_3', name: 'Курская ЖД', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.RAILROAD, value: 4, rent: [1, 2, 3, 4], quantity: 1 },
  { id: 'property_railroad_4', name: 'Казанская ЖД', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.RAILROAD, value: 4, rent: [1, 2, 3, 4], quantity: 1 },

  // Red properties
  { id: 'property_red_1', name: 'Тверская ул.', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.RED, value: 3, rent: [2, 3, 6], quantity: 1},
  { id: 'property_red_2', name: 'Площадь Маяковского', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.RED, value: 3, rent: [2, 3, 6], quantity: 1},
  { id: 'property_red_3', name: 'Пушкинская ул.', type:  CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.RED, value: 3, rent: [2, 3, 6], quantity: 1},

  // Green properties
  { id: 'property_green_1', name: 'Кутузовский проспект', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.GREEN, value: 4, rent: [2, 4, 7], quantity: 1},
  { id: 'property_green_2', name: 'Гоголевский бульвар', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.GREEN, value: 4, rent: [2, 4, 7], quantity: 1},
  { id: 'property_green_3', name: 'ул. Щусева', type:  CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.GREEN, value: 4, rent: [2, 4, 7], quantity: 1},

  // Orange properties
  { id: 'property_orange_1', name: 'Рублевское шоссе', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.ORANGE, value: 2, rent: [1, 3, 5], quantity: 1},
  { id: 'property_orange_2', name: 'ул. Вавилова', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.ORANGE, value: 2, rent: [1, 3, 5], quantity: 1},
  { id: 'property_orange_3', name: 'Рязанский проспект', type:  CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.ORANGE, value: 2, rent: [1, 3, 5], quantity: 1},

  // Purple properties
  { id: 'property_purple_1', name: 'ул. Сретенка', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.PURPLE, value: 2, rent: [1, 2, 4], quantity: 1},
  { id: 'property_purple_2', name: 'Ростовская наб.', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.PURPLE, value: 2, rent: [1, 2, 4], quantity: 1},
  { id: 'property_purple_3', name: 'ул. Полянка', type:  CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.PURPLE, value: 2, rent: [1, 2, 4], quantity: 1},

  // Blue properties
  { id: 'property_blue_1', name: 'ул. Арбат', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.BLUE, value: 4, rent: [3, 8], quantity: 1 },
  { id: 'property_blue_2', name: 'Малая Бронная', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.BLUE, value: 4, rent: [3, 8], quantity: 1 },

  // Utility properties
  { id: 'property_utility_1', name: 'Водопровод', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.UTILITY, value: 2, rent: [1, 2], quantity: 1 },
  { id: 'property_utility_2', name: 'Электростанция', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.UTILITY, value: 2, rent: [1, 2], quantity: 1 },

  // Yellow properties
  { id: 'property_yellow_1', name: 'ул. Грузинский Вал', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.YELLOW, value: 3, rent: [2, 4, 6], quantity: 1},
  { id: 'property_yellow_2', name: 'ул. Чайковского', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.YELLOW, value: 3, rent: [2, 4, 6], quantity: 1},
  { id: 'property_yellow_3', name: 'Смоленская площадь', type:  CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.YELLOW, value: 3, rent: [2, 4, 6], quantity: 1},

  // Light blue properties
  { id: 'property_lightblue_1', name: 'Первая Парковая ул.', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.LIGHT_BLUE, value: 1, rent: [1, 2, 3], quantity: 1},
  { id: 'property_lightblue_2', name: 'Варшавское шоссе', type: CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.LIGHT_BLUE, value: 1, rent: [1, 2, 3], quantity: 1},
  { id: 'property_lightblue_3', name: 'ул. Огарева', type:  CARD_TYPES.PROPERTY, color: PROPERTY_COLORS.LIGHT_BLUE, value: 1, rent: [1, 2, 3], quantity: 1},

  
  // ... остальные свойства по аналогии
  
  // Wild properties
  { id: 'wild_purple_orange', name: 'Универсальная собственность Фиолетово-оранжевая', type: CARD_TYPES.PROPERTY, color: 'wild', value: 2, colors: [PROPERTY_COLORS.PURPLE, PROPERTY_COLORS.ORANGE], quantity: 2 },
  { id: 'wild_red_yellow', name: 'Универсальная собственность Красно-желтая', type: CARD_TYPES.PROPERTY, color: 'wild', value: 3, colors: [PROPERTY_COLORS.RED, PROPERTY_COLORS.YELLOW], quantity: 2 },
  { id: 'wild_lightblue_railroad', name: 'Универсальная собственность Голубо-черная', type: CARD_TYPES.PROPERTY, color: 'wild', value: 4, colors: [PROPERTY_COLORS.LIGHT_BLUE, PROPERTY_COLORS.RAILROAD], quantity: 1 },
  { id: 'wild_lightblue_brown', name: 'Универсальная собственность Голубо-коричневая', type: CARD_TYPES.PROPERTY, color: 'wild', value: 1, colors: [PROPERTY_COLORS.LIGHT_BLUE, PROPERTY_COLORS.BROWN], quantity: 1 },
  { id: 'wild_railroad_green', name: 'Универсальная собственность Черно-зеленая', type: CARD_TYPES.PROPERTY, color: 'wild', value: 4, colors: [PROPERTY_COLORS.RAILROAD, PROPERTY_COLORS.GREEN], quantity: 1 },
  { id: 'wild_blue_green', name: 'Универсальная собственность Сине-зеленая', type: CARD_TYPES.PROPERTY, color: 'wild', value: 4, colors: [PROPERTY_COLORS.BLUE, PROPERTY_COLORS.GREEN], quantity: 1 },
  { id: 'wild_railroad_utility', name: 'Универсальная собственность Черно-песочная', type: CARD_TYPES.PROPERTY, color: 'wild', value: 2, colors: [PROPERTY_COLORS.RAILROAD, PROPERTY_COLORS.UTILITY], quantity: 1 }
  
  // ... остальные универсальные свойства
];

module.exports = {
  CARD_TYPES,
  PROPERTY_COLORS,
  cards,
  propertyCards
};