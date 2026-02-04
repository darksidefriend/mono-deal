const CardTypes = {
    // Деньги
    MONEY_1: { type: 'money', value: 1, count: 6 },
    MONEY_2: { type: 'money', value: 2, count: 5 },
    MONEY_3: { type: 'money', value: 3, count: 3 },
    MONEY_4: { type: 'money', value: 4, count: 3 },
    MONEY_5: { type: 'money', value: 5, count: 2 },
    MONEY_10: { type: 'money', value: 10, count: 1 },
    
    // Собственность
    BROWN_PROPERTY: { type: 'property', color: 'brown', value: 1, rent: [1, 2], count: 2 },
    BLACK_RAILROAD: { type: 'property', color: 'black', value: 2, rent: [1, 2, 3, 4], count: 4 },
    RED_PROPERTY: { type: 'property', color: 'red', value: 3, rent: [2, 3, 6], count: 3 },
    GREEN_PROPERTY: { type: 'property', color: 'green', value: 4, rent: [2, 4, 7], count: 3 },
    ORANGE_PROPERTY: { type: 'property', color: 'orange', value: 2, rent: [1, 3, 5], count: 3 },
    BLUE_PROPERTY: { type: 'property', color: 'blue', value: 3, rent: [3, 8], count: 2 },
    PURPLE_PROPERTY: { type: 'property', color: 'purple', value: 2, rent: [1, 2, 4], count: 3 },
    SAND_UTILITY: { type: 'property', color: 'sand', value: 2, rent: [1, 2], count: 2 },
    YELLOW_PROPERTY: { type: 'property', color: 'yellow', value: 3, rent: [2, 4, 6], count: 3 },
    LIGHT_BLUE_PROPERTY: { type: 'property', color: 'lightblue', value: 1, rent: [1, 2, 3], count: 3 },
    
    // Универсальная собственность
    WILD_PURPLE_ORANGE: { type: 'wildProperty', colors: ['purple', 'orange'], value: 2, count: 2 },
    WILD_RED_YELLOW: { type: 'wildProperty', colors: ['red', 'yellow'], value: 3, count: 2 },
    WILD_LIGHTBLUE_BLACK: { type: 'wildProperty', colors: ['lightblue', 'black'], value: 4, count: 1 },
    WILD_LIGHTBLUE_BROWN: { type: 'wildProperty', colors: ['lightblue', 'brown'], value: 1, count: 1 },
    WILD_BLACK_GREEN: { type: 'wildProperty', colors: ['black', 'green'], value: 4, count: 1 },
    WILD_BLUE_GREEN: { type: 'wildProperty', colors: ['blue', 'green'], value: 4, count: 1 },
    WILD_BLACK_SAND: { type: 'wildProperty', colors: ['black', 'sand'], value: 2, count: 1 },
    
    // Рента
    RENT_RED_YELLOW: { type: 'rent', colors: ['red', 'yellow'], value: 1, count: 2 },
    RENT_BLUE_GREEN: { type: 'rent', colors: ['blue', 'green'], value: 1, count: 2 },
    RENT_LIGHTBLUE_BROWN: { type: 'rent', colors: ['lightblue', 'brown'], value: 1, count: 2 },
    RENT_ORANGE_PURPLE: { type: 'rent', colors: ['orange', 'purple'], value: 1, count: 2 },
    RENT_BLACK_SAND: { type: 'rent', colors: ['black', 'sand'], value: 1, count: 2 },
    RENT_ANY: { type: 'rent', colors: ['any'], value: 3, count: 3 },
    
    // Действия
    ACTION_DEAL_BREAKER: { type: 'action', name: 'Аферист', value: 5, count: 2 },
    ACTION_JUST_SAY_NO: { type: 'action', name: 'Просто скажи Нет', value: 4, count: 3 },
    ACTION_FORCED_DEAL: { type: 'action', name: 'Вынужденная сделка', value: 3, count: 3 },
    ACTION_SLY_DEAL: { type: 'action', name: 'Хитрая сделка', value: 3, count: 3 },
    ACTION_DOUBLE_RENT: { type: 'action', name: 'Двойная рента', value: 1, count: 2 },
    ACTION_BIRTHDAY: { type: 'action', name: 'Сегодня твой день рождения!', value: 2, count: 3 },
    ACTION_PASS_GO: { type: 'action', name: 'Пройди клетку Вперед', value: 1, count: 10 },
    ACTION_DEBT_COLLECTOR: { type: 'action', name: 'Сборщик долгов', value: 3, count: 3 },
    ACTION_HOUSE: { type: 'action', name: 'Дом', value: 3, count: 3 },
    ACTION_HOTEL: { type: 'action', name: 'Отель', value: 4, count: 2 },
    ACTION_JOKER: { type: 'action', name: 'Джокер', value: 0, count: 2 }
};

module.exports = CardTypes;