module.exports = {
  CARD_TYPES: {
    MONEY: 'money',
    PROPERTY: 'property',
    ACTION: 'action',
    RENT: 'rent',
    HOUSE: 'house',
    HOTEL: 'hotel',
    JOKER: 'joker'
  },

  PROPERTY_COLORS: {
    BROWN: 'brown',
    BLACK: 'black',
    RED: 'red',
    GREEN: 'green',
    ORANGE: 'orange',
    BLUE: 'blue',
    PURPLE: 'purple',
    SAND: 'sand',
    YELLOW: 'yellow',
    LIGHTBLUE: 'lightblue'
  },

  COMPLETE_SETS: {
    brown: 2,
    black: 4,
    red: 3,
    green: 3,
    orange: 3,
    blue: 2,
    purple: 3,
    sand: 2,
    yellow: 3,
    lightblue: 3
  },

  CARD_DATA: [
    // Action cards
    { name: 'Аферист', type: 'action', value: 5, action: 'deal_breaker', count: 2 },
    { name: 'Просто скажи Нет', type: 'action', value: 4, action: 'say_no', count: 3 },
    { name: 'Вынужденная сделка', type: 'action', value: 3, action: 'forced_deal', count: 3 },
    { name: 'Хитрая сделка', type: 'action', value: 3, action: 'sly_deal', count: 3 },
    { name: 'Сегодня твой день рождения!', type: 'action', value: 2, action: 'birthday', count: 3 },
    { name: 'Пройди клетку Вперед', type: 'action', value: 1, action: 'pass_go', count: 10 },
    { name: 'Сборщик долгов', type: 'action', value: 3, action: 'debt_collector', count: 3 },
    
    // Rent cards - УБЕДИТЕСЬ ЧТО colors УКАЗАН ВМЕСТО ИЛИ В ДОПОЛНЕНИЕ К wildColors
    { name: 'Красно-желтая Рента', type: 'rent', value: 1, rentType: 'color', target: 'all', colors: ['red', 'yellow'], count: 2 },
    { name: 'Сине-зеленая Рента', type: 'rent', value: 1, rentType: 'color', target: 'all', colors: ['blue', 'green'], count: 2 },
    { name: 'Голубо-коричневая Рента', type: 'rent', value: 1, rentType: 'color', target: 'all', colors: ['lightblue', 'brown'], count: 2 },
    { name: 'Оранжево-фиолетовая Рента', type: 'rent', value: 1, rentType: 'color', target: 'all', colors: ['orange', 'purple'], count: 2 },
    { name: 'Черно-песочная Рента', type: 'rent', value: 1, rentType: 'color', target: 'all', colors: ['black', 'sand'], count: 2 },
    { name: 'Универсальная рента', type: 'rent', value: 3, rentType: 'wild', target: 'single', count: 3 },
    { name: 'Двойная рента', type: 'rent', value: 1, rentType: 'double', count: 2 },
    
    // Buildings
    { name: 'Дом', type: 'house', value: 3, count: 3 },
    { name: 'Отель', type: 'hotel', value: 4, count: 2 },
    { name: 'Джокер', type: 'joker', value: null, count: 2 },
    
    // Money
    { name: '1М', type: 'money', value: 1, count: 6 },
    { name: '2М', type: 'money', value: 2, count: 5 },
    { name: '3М', type: 'money', value: 3, count: 3 },
    { name: '4М', type: 'money', value: 4, count: 3 },
    { name: '5М', type: 'money', value: 5, count: 2 },
    { name: '10М', type: 'money', value: 10, count: 1 },
    
    // Properties
    { name: 'Житная ул.', type: 'property', value: 1, color: 'brown', count: 1 },
    { name: 'Нагатинская ул.', type: 'property', value: 1, color: 'brown', count: 1 },
    
    { name: 'Ленинградская ЖД', type: 'property', value: 4, color: 'black', count: 1 },
    { name: 'Рижская ЖД', type: 'property', value: 4, color: 'black', count: 1 },
    { name: 'Курская ЖД', type: 'property', value: 4, color: 'black', count: 1 },
    { name: 'Казанская ЖД', type: 'property', value: 4, color: 'black', count: 1 },
    
    { name: 'Тверская ул.', type: 'property', value: 3, color: 'red', count: 1 },
    { name: 'Площадь Маяковского', type: 'property', value: 3, color: 'red', count: 1 },
    { name: 'Пушкинская ул.', type: 'property', value: 3, color: 'red', count: 1 },
    
    { name: 'Кутузовский проспект', type: 'property', value: 4, color: 'green', count: 1 },
    { name: 'Гоголевский бульвар', type: 'property', value: 4, color: 'green', count: 1 },
    { name: 'ул. Щусева', type: 'property', value: 4, color: 'green', count: 1 },
    
    { name: 'Рублевское шоссе', type: 'property', value: 2, color: 'orange', count: 1 },
    { name: 'ул. Вавилова', type: 'property', value: 2, color: 'orange', count: 1 },
    { name: 'Рязанский проспект', type: 'property', value: 2, color: 'orange', count: 1 },
    
    { name: 'ул. Арбат', type: 'property', value: 8, color: 'blue', count: 1 },
    { name: 'Малая Бронная', type: 'property', value: 8, color: 'blue', count: 1 },
    
    { name: 'ул. Сретенка', type: 'property', value: 2, color: 'purple', count: 1 },
    { name: 'Ростовская наб.', type: 'property', value: 2, color: 'purple', count: 1 },
    { name: 'ул. Полянка', type: 'property', value: 2, color: 'purple', count: 1 },
    
    { name: 'Водопровод', type: 'property', value: 2, color: 'sand', count: 1 },
    { name: 'Электростанция', type: 'property', value: 2, color: 'sand', count: 1 },
    
    { name: 'ул. Грузинский Вал', type: 'property', value: 3, color: 'yellow', count: 1 },
    { name: 'ул. Чайковского', type: 'property', value: 3, color: 'yellow', count: 1 },
    { name: 'Смоленская площадь', type: 'property', value: 3, color: 'yellow', count: 1 },
    
    { name: 'Первая Парковая ул.', type: 'property', value: 1, color: 'lightblue', count: 1 },
    { name: 'Варшавское шоссе', type: 'property', value: 1, color: 'lightblue', count: 1 },
    { name: 'ул. Огарева', type: 'property', value: 1, color: 'lightblue', count: 1 },
    
    // Wild properties
    { name: 'Универсальная собственность Фиолетово-оранжевая', type: 'property', value: 2, wild: true, wildColors: ['purple', 'orange'], count: 2 },
    { name: 'Универсальная собственность Красно-желтая', type: 'property', value: 3, wild: true, wildColors: ['red', 'yellow'], count: 2 },
    { name: 'Универсальная собственность Голубо-черная', type: 'property', value: 4, wild: true, wildColors: ['lightblue', 'black'], count: 1 },
    { name: 'Универсальная собственность Голубо-коричневая', type: 'property', value: 1, wild: true, wildColors: ['lightblue', 'brown'], count: 1 },
    { name: 'Универсальная собственность Черно-зеленая', type: 'property', value: 4, wild: true, wildColors: ['black', 'green'], count: 1 },
    { name: 'Универсальная собственность Сине-зеленая', type: 'property', value: 4, wild: true, wildColors: ['blue', 'green'], count: 1 },
    { name: 'Универсальная собственность Черно-песочная', type: 'property', value: 2, wild: true, wildColors: ['black', 'sand'], count: 1 }
  ]
};

module.exports = {
    CARD_TYPES,
    PROPERTY_COLORS,
    COMPLETE_SETS,
    CARD_DATA
};