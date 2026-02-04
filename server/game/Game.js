const Deck = require('./Deck');
const Player = require('./Player');
const { CARD_TYPES, PROPERTY_COLORS, COMPLETE_SETS } = require('./utils/constants');

class Game {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.deck = null; // Инициализируем позже
        this.discardPile = [];
        this.currentPlayer = null;
        this.currentActions = 0;
        this.maxActions = 3;
        this.turnPhase = 'waiting';
        this.waitingForResponse = null;
        this.pendingAction = null;
        this.pendingRent = null;
        this.justSaidNo = false;
        this.log = [];
        this.rentAllProcess = null;
        this.currentRentRequest = null;
        
        // Инициализируем колоду
        this.initDeck();
  }

  addPlayer(socketId, name) {
    const player = new Player(socketId, name, this.players.length);
    this.players.push(player);
    return player;
  }

  initDeck() {
        const Deck = require('./Deck');
        this.deck = new Deck();
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      const player = this.players[index];
      
      // Return player's cards to deck
      player.hand.forEach(card => this.deck.returnCard(card));
      player.properties.forEach(property => {
        property.cards.forEach(card => this.deck.returnCard(card));
      });
      player.moneyBank.forEach(card => this.deck.returnCard(card));
      
      this.players.splice(index, 1);
      
      // Reassign indexes
      this.players.forEach((p, i) => p.index = i);
      
      // If game in progress and player was current player
      if (this.turnPhase !== 'waiting' && this.currentPlayer === playerId) {
        this.nextPlayer();
      }
    }
  }

   startGame() {
        if (this.players.length < 2) {
            throw new Error('Need at least 2 players to start');
        }
        
        // Убедимся, что колода существует
        if (!this.deck) {
            this.initDeck();
        }
        
        // Раздаем начальные карты
        this.players.forEach(player => {
            for (let i = 0; i < 5; i++) {
                const card = this.deck.draw();
                if (card) {
                    player.drawCard(card);
                }
            }
        });
        
        this.currentPlayer = this.players[0].id;
        this.currentActions = this.maxActions;
        this.turnPhase = 'drawing';
        this.addLog('Game started!');
        
        // Автоматически разыгрываем фазу взятия карт для первого игрока
        this.drawPhaseForCurrentPlayer();
  }

  drawPhaseForCurrentPlayer() {
        const player = this.getPlayer(this.currentPlayer);
        if (!player) return;
        
        // Игрок берет 2 карты
        for (let i = 0; i < 2; i++) {
            const card = this.deck.draw();
            if (card) {
                player.drawCard(card);
            }
        }
        
        this.turnPhase = 'main';
        this.addLog(`${player.name} взял 2 карты`);
  }

  playCard(playerId, cardId, options = {}) {
    const player = this.getPlayer(playerId);
    const card = player.getCardFromHand(cardId);
    
    if (!card) throw new Error('Card not found in hand');
    if (this.currentPlayer !== playerId) throw new Error('Not your turn');
    if (this.turnPhase !== 'main') throw new Error('Not in main phase');
    if (this.currentActions <= 0) throw new Error('No actions left');
    
    let actionUsed = true;
    
    switch (card.type) {
      case CARD_TYPES.MONEY:
        this.playMoneyCard(player, card);
        break;
        
      case CARD_TYPES.PROPERTY:
        this.playPropertyCard(player, card, options.propertySetId);
        break;
        
      case CARD_TYPES.ACTION:
        actionUsed = this.playActionCard(player, card, options);
        break;
        
      case CARD_TYPES.RENT:
        this.playRentCard(player, card, options);
        break;
        
      case CARD_TYPES.HOUSE:
      case CARD_TYPES.HOTEL:
        this.playBuildingCard(player, card, options.propertySetId);
        break;
        
      default:
        throw new Error('Unknown card type');
    }
    
    if (actionUsed) {
      this.currentActions--;
      player.removeCardFromHand(cardId);
      this.discardPile.push(card);
    }
    
    this.checkJokerAutoPlacement(player);
    this.checkWinner();
  }

  playMoneyCard(player, card) {
    player.addMoney(card);
    this.addLog(`${player.name} added ${card.value}M to bank`);
  }

  playPropertyCard(player, card, propertySetId) {
    if (card.wild) {
      if (!card.wildColors.includes(card.selectedColor)) {
        throw new Error('Invalid color selected for wild property');
      }
      card.color = card.selectedColor;
    }
    
    let propertySet = player.getPropertySet(propertySetId);
    if (!propertySet) {
      propertySet = player.createPropertySet(card.color);
    }
    
    if (propertySet.color !== card.color) {
      throw new Error('Card color does not match property set');
    }
    
    if (propertySet.isComplete()) {
      throw new Error('Property set is already complete');
    }
    
    propertySet.addCard(card);
    this.addLog(`${player.name} played ${card.name} to ${propertySet.color} set`);
  }

  playActionCard(player, card, options) {
    switch (card.action) {
      case 'pass_go':
        this.playPassGo(player);
        return true;
        
      case 'birthday':
        this.playBirthday(player);
        return true;
        
      case 'debt_collector':
        this.startDebtCollection(player, options.targetPlayerId);
        return false; // Action not used until payment is completed
        
      case 'forced_deal':
        this.startForcedDeal(player, options.targetPlayerId, options.selectedColor);
        return false;
        
      case 'sly_deal':
        this.startSlyDeal(player, options.targetPlayerId, options.selectedColor);
        return false;
        
      case 'deal_breaker':
        this.startDealBreaker(player, options.targetPlayerId, options.selectedColor);
        return false;
        
      default:
        throw new Error('Unknown action card');
    }
  }

  playPassGo(player) {
    player.drawCard(this.deck.draw());
    player.drawCard(this.deck.draw());
    this.addLog(`${player.name} played Pass Go and drew 2 cards`);
  }

  playBirthday(player) {
    this.players.forEach(p => {
      if (p.id !== player.id) {
        const moneyCards = p.getMoneyCards(2);
        if (moneyCards.length > 0) {
          moneyCards.forEach(card => {
            p.removeCardFromBank(card.id);
            player.addMoney(card);
          });
        }
      }
    });
    this.addLog(`${player.name} had a birthday! Everyone gave 2M`);
  }

  startDebtCollection(player, targetPlayerId) {
    const target = this.getPlayer(targetPlayerId);
    this.waitingForResponse = target.id;
    this.pendingAction = {
      type: 'debt_collector',
      playerId: player.id,
      amount: 5
    };
    this.turnPhase = 'paying';
    this.addLog(`${player.name} demands 5M from ${target.name}`);
  }

  startForcedDeal(player, targetPlayerId, color) {
    const target = this.getPlayer(targetPlayerId);
    
    // Check if player has property of that color
    const playerProperty = player.getIncompletePropertySet(color);
    if (!playerProperty) throw new Error('No incomplete property of selected color');
    
    // Check if target has property of that color
    const targetProperty = target.getIncompletePropertySet(color);
    if (!targetProperty) throw new Error('Target has no incomplete property of selected color');
    
    this.waitingForResponse = target.id;
    this.pendingAction = {
      type: 'forced_deal',
      playerId: player.id,
      targetId: target.id,
      color: color,
      playerPropertyId: playerProperty.id,
      targetPropertyId: targetProperty.id
    };
    this.addLog(`${player.name} wants to swap ${color} properties with ${target.name}`);
  }

  startSlyDeal(player, targetPlayerId, color) {
    const target = this.getPlayer(targetPlayerId);
    const targetProperty = target.getIncompletePropertySet(color);
    
    if (!targetProperty) throw new Error('Target has no incomplete property of selected color');
    
    this.waitingForResponse = target.id;
    this.pendingAction = {
      type: 'sly_deal',
      playerId: player.id,
      targetId: target.id,
      color: color,
      propertyId: targetProperty.id
    };
    this.addLog(`${player.name} wants to steal ${color} property from ${target.name}`);
  }

  startDealBreaker(player, targetPlayerId, color) {
    const target = this.getPlayer(targetPlayerId);
    const targetPropertySet = target.getCompletePropertySet(color);
    
    if (!targetPropertySet) throw new Error('Target has no complete property set of selected color');
    
    this.waitingForResponse = target.id;
    this.pendingAction = {
      type: 'deal_breaker',
      playerId: player.id,
      targetId: target.id,
      color: color,
      propertySetId: targetPropertySet.id
    };
    this.addLog(`${player.name} wants to steal complete ${color} set from ${target.name}`);
  }

    playRentCard(player, card, options = {}) {
      // Проверяем, wild ли рента и выбран ли цвет
      if (card.rentType === 'wild') {
          if (!options.selectedColor) {
              throw new Error('Color must be selected for wild rent');
          }
      }
      
      // Определяем цвет для расчета ренты
      let rentColor;
      if (options.selectedColor) {
          rentColor = options.selectedColor;
      } else if (Array.isArray(card.propertyColor)) {
          // Если цвет массив, берем первый (игрок должен был выбрать)
          rentColor = card.propertyColor[0];
      } else {
          rentColor = card.propertyColor;
      }
      
      // Рассчитываем сумму ренты
      const rentAmount = this.calculateRent(player, rentColor);
      
      // Учитываем двойную ренту
      const isDouble = options.isDouble || (card.actionType === 'double_rent');
      const finalAmount = isDouble ? rentAmount * 2 : rentAmount;
      
      const rentInfo = {
          fromPlayerId: player.id,
          color: rentColor,
          rentCardId: card.id,
          target: card.target || 'single',
          amount: finalAmount,
          isDouble: isDouble,
          cardType: card.rentType || 'standard'
      };
      
      // Сбрасываем карту ренты
      player.removeCardFromHand(card.id);
      this.discardPile.push(card);
      this.currentActions--;
      
      if (card.target === 'all' || card.target === 'all_players') {
          // Рента на всех
          this.rentAllProcess = {
              ...rentInfo,
              remainingPlayers: this.players
                  .filter(p => p.id !== player.id)
                  .map(p => ({
                      playerId: p.id,
                      hasResponded: false,
                      hasPaid: false,
                      saidNo: false
                  })),
              currentPlayerIndex: 0,
              totalPlayers: this.players.length - 1
          };
          
          // Начинаем обработку с первого игрока
          this.startRentPaymentForCurrentPlayer();
      } else {
          // Рента на одного игрока
          if (!options.targetPlayerId) {
              throw new Error('Target player is required for single rent');
          }
          this.startRentPaymentForSinglePlayer(this.getPlayer(options.targetPlayerId), rentInfo);
      }
  }

    startRentPaymentForSinglePlayer(targetPlayer, rentInfo) {
      this.waitingForResponse = targetPlayer.id;
      this.currentRentRequest = rentInfo;
      this.turnPhase = 'rent_response';
      
      this.addLog(`${this.getPlayer(rentInfo.fromPlayerId).name} требует ренту ${rentInfo.amount}M от ${targetPlayer.name}`);
      
      // НЕ вызываем this.emitGameState() - сервер сам отправит обновление
  }

    calculateRentForPlayer(player, color) {
      return this.calculateRent(player, color);
  }

    handleRentResponse(playerId, response) {
      if (this.turnPhase !== 'rent_response' || this.waitingForResponse !== playerId) {
          throw new Error('Not waiting for rent response');
      }
      
      const player = this.getPlayer(playerId);
      
      if (this.currentRentRequest) {
          // Это одиночная рента
          this.handleSingleRentResponse(playerId, response);
      } else if (this.rentAllProcess) {
          // Это рента на всех
          this.handleRentAllResponse(playerId, response);
      }
  }

      // Обработка одиночной ренты
    handleSingleRentResponse(playerId, response) {
        const fromPlayer = this.getPlayer(this.currentRentRequest.fromPlayerId);
        
        if (response.type === 'pay') {
            const totalValue = response.cards.reduce((sum, cardId) => {
                const card = this.getPlayer(playerId).getCardFromAnywhere(cardId);
                return sum + (card.value || 0);
            }, 0);
            
            if (totalValue < this.currentRentRequest.amount) {
                throw new Error('Insufficient payment');
            }
            
            response.cards.forEach(cardId => {
                const card = this.getPlayer(playerId).removeCardFromAnywhere(cardId);
                fromPlayer.addMoney(card);
            });
            
            this.addLog(`${this.getPlayer(playerId).name} оплатил ренту ${this.currentRentRequest.amount}M`);
            
        } else if (response.type === 'say_no') {
            const sayNoCard = this.getPlayer(playerId).hand.find(c => c.action === 'say_no');
            if (!sayNoCard) throw new Error('No "Just Say No" card');
            
            this.getPlayer(playerId).removeCardFromHand(sayNoCard.id);
            this.discardPile.push(sayNoCard);
            
            this.addLog(`${this.getPlayer(playerId).name} сказал НЕТ ренте!`);
            
            if (this.currentPlayer === playerId) {
                this.currentActions--;
            }
        }
        
        // Очищаем состояние
        this.waitingForResponse = null;
        this.currentRentRequest = null;
        this.turnPhase = 'main';
        
        this.emitGameState();
    }


    handleRentAllResponse(playerId, response) {
      const playerInfo = this.rentAllProcess.remainingPlayers.find(p => p.playerId === playerId);
      if (!playerInfo) return;
      
      const fromPlayer = this.getPlayer(this.rentAllProcess.fromPlayerId);
      
      if (response.type === 'pay') {
          // Игрок оплачивает
          const totalValue = response.cards.reduce((sum, cardId) => {
              const card = this.getPlayer(playerId).getCardFromAnywhere(cardId);
              return sum + (card.value || 0);
          }, 0);
          
          if (totalValue < this.rentAllProcess.amount) {
              throw new Error('Insufficient payment');
          }
          
          response.cards.forEach(cardId => {
              const card = this.getPlayer(playerId).removeCardFromAnywhere(cardId);
              fromPlayer.addMoney(card);
          });
          
          playerInfo.hasResponded = true;
          playerInfo.hasPaid = true;
          this.addLog(`${this.getPlayer(playerId).name} оплатил ренту ${this.rentAllProcess.amount}M`);
          
      } else if (response.type === 'say_no') {
          // Игрок говорит "Нет"
          const sayNoCard = this.getPlayer(playerId).hand.find(c => c.action === 'say_no');
          if (!sayNoCard) throw new Error('No "Just Say No" card');
          
          this.getPlayer(playerId).removeCardFromHand(sayNoCard.id);
          this.discardPile.push(sayNoCard);
          
          playerInfo.hasResponded = true;
          playerInfo.saidNo = true;
          this.addLog(`${this.getPlayer(playerId).name} сказал НЕТ ренте!`);
          
          // Карта "Нет" использует действие только если это ход игрока
          if (this.currentPlayer === playerId) {
              this.currentActions--;
          }
      }
      
      // Отмечаем игрока как обработанного и переходим к следующему
      playerInfo.hasResponded = true;
      this.rentAllProcess.currentPlayerIndex++;
      
      // Сбрасываем текущий запрос
      this.waitingForResponse = null;
      this.currentRentRequest = null;
      
      // Переходим к следующему игроку или завершаем
      if (this.rentAllProcess.currentPlayerIndex < this.rentAllProcess.remainingPlayers.length) {
          this.startRentPaymentForCurrentPlayer();
      } else {
          this.completeRentAllProcess();
      }
  }

    startRentPaymentForCurrentPlayer() {
      if (!this.rentAllProcess) return;
      
      const { remainingPlayers, currentPlayerIndex } = this.rentAllProcess;
      
      if (currentPlayerIndex >= remainingPlayers.length) {
          // Все игроки обработаны
          this.completeRentAllProcess();
          return;
      }
      
      const currentPlayerInfo = remainingPlayers[currentPlayerIndex];
      const player = this.getPlayer(currentPlayerInfo.playerId);
      
      this.waitingForResponse = player.id;
      this.currentRentRequest = {
          ...this.rentAllProcess,
          targetPlayerId: player.id
      };
      
      this.turnPhase = 'rent_response';
      
      // Логируем начало ренты для этого игрока
      this.addLog(`${this.getPlayer(this.rentAllProcess.fromPlayerId).name} требует ренту ${this.rentAllProcess.amount}M от ${player.name}`);
      
      // НЕ вызываем this.emitGameState() - сервер сам отправит обновление
  }

    completeRentAllProcess() {
      if (!this.rentAllProcess) return;
      
      const fromPlayer = this.getPlayer(this.rentAllProcess.fromPlayerId);
      const paidPlayers = this.rentAllProcess.remainingPlayers.filter(p => p.hasPaid);
      const saidNoPlayers = this.rentAllProcess.remainingPlayers.filter(p => p.saidNo);
      
      if (paidPlayers.length > 0) {
          this.addLog(`${fromPlayer.name} получил ренту от ${paidPlayers.length} игроков`);
      }
      
      if (saidNoPlayers.length > 0) {
          this.addLog(`${saidNoPlayers.length} игроков отказались платить ренту`);
      }
      
      // Очищаем состояние
      this.rentAllProcess = null;
      this.waitingForResponse = null;
      this.currentRentRequest = null;
      this.turnPhase = 'main';
      
      // НЕ вызываем this.emitGameState() - сервер сам отправит обновление
  }

    hasPropertyOfColor(player, color) {
      console.log(`Checking if player ${player.name} has property of color ${color}`);
      
      // Просто проверяем все карты собственности игрока (во всех комплектах)
      for (const propertySet of player.properties) {
          console.log(`Checking property set ${propertySet.color} with ${propertySet.cards.length} cards`);
          
          for (const card of propertySet.cards) {
              console.log(`  Card: ${card.name}, type: ${card.type}, color: ${card.color}, wild: ${card.wild}, selectedColor: ${card.selectedColor}`);
              
              if (card.type === 'joker') continue; // Джокеры не считаются
              
              let cardColor = card.color;
              
              // Если это wild карта и у нее выбран цвет, используем выбранный цвет
              if (card.wild && card.selectedColor) {
                  cardColor = card.selectedColor;
              }
              
              console.log(`  Card effective color: ${cardColor}, looking for: ${color}`);
              
              if (cardColor === color) {
                  console.log(`  Found matching card!`);
                  return true;
              }
          }
      }
      
      console.log(`No matching card found for color ${color}`);
      return false;
  }

    calculateRent(player, color) {
      const propertySet = player.getPropertySetByColor(color);
      if (!propertySet) return 0;
      
      const cardCount = propertySet.cards.filter(c => c.type !== CARD_TYPES.JOKER).length;
      let rent = 0;
      
      // Базовые значения ренты по цветам
      const rentValues = {
          brown: [1, 2],
          black: [1, 2, 3, 4],
          red: [2, 3, 6],
          green: [2, 4, 7],
          orange: [1, 3, 5],
          blue: [3, 8],
          purple: [1, 2, 4],
          sand: [1, 2],
          yellow: [2, 4, 6],
          lightblue: [1, 2, 3]
      };
      
      if (rentValues[color] && cardCount > 0) {
          rent = rentValues[color][Math.min(cardCount, rentValues[color].length) - 1];
      }
      
      // Добавляем бонусы от домов и отелей
      if (propertySet.hasHouse) rent += 3;
      if (propertySet.hasHotel) rent += 4;
      
      return rent;
  }

  startRentPayment(fromPlayer, toPlayer, amount, colors) {
    this.waitingForResponse = toPlayer.id;
    this.pendingRent = {
      fromPlayerId: fromPlayer.id,
      toPlayerId: toPlayer.id,
      amount: amount,
      colors: colors,
      isAllRent: false
    };
    this.turnPhase = 'paying';
    
    const colorNames = colors.map(c => this.getColorName(c)).join(' и ');
    this.addLog(`${fromPlayer.name} требует ${amount}М ренты за ${colorNames} у ${toPlayer.name}`);
  }

  payRent(playerId, cards) {
        if (this.turnPhase !== 'paying' || this.waitingForResponse !== playerId) {
            throw new Error('Не ждем оплаты ренты от этого игрока');
        }
        
        const rentInfo = this.pendingRent;
        const player = this.getPlayer(playerId);
        const fromPlayer = this.getPlayer(rentInfo.fromPlayerId);
        
        if (!rentInfo || !player || !fromPlayer) {
            throw new Error('Ошибка при оплате ренты');
        }
        
        // Если игрок прислал пустой массив карт (нечем платить)
        if (cards.length === 0) {
            this.addLog(`${player.name} не может оплатить ренту - нет карт для оплаты`);
            
            // Переходим к следующему игроку или завершаем ренту
            this.completeRentPayment();
            return;
        }
        
        // Рассчитываем общую стоимость выбранных карт
        let totalValue = 0;
        const cardsToTransfer = [];
        
        for (const cardId of cards) {
            // Ищем карту везде (в банке, в собственности на поле, но НЕ в руке)
            const card = player.getCardFromAnywhere(cardId);
            if (!card) {
                throw new Error(`Карта с ID ${cardId} не найдена`);
            }
            
            // Карты из руки нельзя использовать для оплаты ренты
            const cardInHand = player.hand.find(c => c.id === cardId);
            if (cardInHand) {
                throw new Error('Нельзя использовать карты из руки для оплаты ренты');
            }
            
            // Проверяем, что карта из банка или собственности
            const cardInBank = player.moneyBank.find(c => c.id === cardId);
            let cardInProperty = null;
            let propertySet = null;
            
            for (const prop of player.properties) {
                const foundCard = prop.cards.find(c => c.id === cardId);
                if (foundCard) {
                    cardInProperty = foundCard;
                    propertySet = prop;
                    break;
                }
            }
            
            if (!cardInBank && !cardInProperty) {
                throw new Error('Карта не может быть использована для оплаты ренты');
            }
            
            totalValue += card.value || 0;
            cardsToTransfer.push({ 
                card, 
                source: cardInBank ? 'bank' : 'property',
                propertySet: propertySet 
            });
        }
        
        // Если сумма меньше требуемой, все равно принимаем оплату
        // (игрок отдает все, что может)
        this.addLog(`${player.name} оплачивает ренту: ${totalValue}М из ${rentInfo.amount}М`);
        
        // Передаем карты
        for (const { card, source, propertySet } of cardsToTransfer) {
            // Удаляем карту у игрока
            if (source === 'bank') {
                player.removeCardFromBank(card.id);
            } else if (source === 'property') {
                // Удаляем карту из комплекта собственности
                propertySet.removeCard(card.id);
                
                // Если комплект стал пустым, удаляем его
                if (propertySet.cards.length === 0) {
                    const index = player.properties.findIndex(p => p.id === propertySet.id);
                    if (index !== -1) {
                        player.properties.splice(index, 1);
                    }
                }
            }
            
            // Добавляем карту игроку, который получает ренту
            if (card.type === 'property') {
                // Карта собственности добавляется к собственностям получателя
                this.addPropertyCardToPlayer(fromPlayer, card);
            } else {
                // Деньги идут в банк получателя
                fromPlayer.addMoney(card);
            }
        }
        
        // Завершаем оплату ренты для этого игрока
        this.completeRentPayment();
    }

   completeRentPayment() {
        const rentInfo = this.pendingRent;
        
        if (rentInfo.isAllRent && rentInfo.remainingPlayers && rentInfo.remainingPlayers.length > 0) {
            // Переходим к следующему игроку
            const nextPlayerId = rentInfo.remainingPlayers[0];
            const nextPlayer = this.getPlayer(nextPlayerId);
            
            if (nextPlayer) {
                this.waitingForResponse = nextPlayer.id;
                this.pendingRent.remainingPlayers = rentInfo.remainingPlayers.slice(1);
                this.turnPhase = 'paying';
                this.addLog(`${nextPlayer.name} должен оплатить ренту`);
                return;
            }
        }
        
        // Если больше никого нет, завершаем ренту
        this.pendingRent = null;
        this.waitingForResponse = null;
        this.turnPhase = 'main';
        this.addLog('Рента оплачена всеми игроками');
    }
    
    // Обновляем метод startRentFromAll для лучшей обработки
    startRentFromAll(player, amount, colors) {
        console.log(`Starting rent from all: ${player.name} wants ${amount}M for colors ${colors.join(', ')}`);
        
        // Создаем список игроков, которые должны платить ренту
        const playersToPay = this.players.filter(p => p.id !== player.id);
        
        if (playersToPay.length === 0) {
            this.addLog(`${player.name} хотел взять ренту со всех, но не с кого брать`);
            return;
        }
        
        // Проверяем первого игрока на наличие карт для оплаты
        const firstPlayer = playersToPay[0];
        
        // Проверяем, есть ли у игрока карты для оплаты
        if (this.canPlayerPayRent(firstPlayer)) {
            // Запускаем ренту для первого игрока
            this.waitingForResponse = firstPlayer.id;
            this.pendingRent = {
                fromPlayerId: player.id,
                toPlayerId: firstPlayer.id,
                amount: amount,
                colors: colors,
                remainingPlayers: playersToPay.slice(1).map(p => p.id),
                isAllRent: true
            };
            this.turnPhase = 'paying';
            
            const colorNames = colors.map(c => this.getColorName(c)).join(' и ');
            this.addLog(`${player.name} требует ${amount}М ренты за ${colorNames} со всех игроков`);
            this.addLog(`${firstPlayer.name} должен оплатить ренту`);
        } else {
            // У игрока нет карт для оплаты - пропускаем его
            this.addLog(`${firstPlayer.name} не может оплатить ренту - нет карт для оплаты`);
            
            // Пытаемся перейти к следующему игроку
            this.skipPlayerWithoutCards(player, amount, colors, playersToPay.slice(1));
        }
    }

  skipPlayerWithoutCards(fromPlayer, amount, colors, remainingPlayers) {
        if (remainingPlayers.length === 0) {
            // Больше нет игроков
            this.pendingRent = null;
            this.waitingForResponse = null;
            this.turnPhase = 'main';
            this.addLog('Рента завершена (некоторые игроки не смогли оплатить)');
            return;
        }
        
        // Проверяем следующего игрока
        const nextPlayer = remainingPlayers[0];
        
        if (this.canPlayerPayRent(nextPlayer)) {
            // Следующий игрок может платить
            this.waitingForResponse = nextPlayer.id;
            this.pendingRent = {
                fromPlayerId: fromPlayer.id,
                toPlayerId: nextPlayer.id,
                amount: amount,
                colors: colors,
                remainingPlayers: remainingPlayers.slice(1),
                isAllRent: true
            };
            this.turnPhase = 'paying';
            
            this.addLog(`${nextPlayer.name} должен оплатить ренту`);
        } else {
            // Следующий игрок тоже не может платить - пропускаем его
            this.addLog(`${nextPlayer.name} не может оплатить ренту - нет карт для оплаты`);
            this.skipPlayerWithoutCards(fromPlayer, amount, colors, remainingPlayers.slice(1));
        }
  }

  addPropertyCardToPlayer(player, card) {
    console.log(`Adding property card to player ${player.name}:`, card);
    
    // Ищем комплект собственности подходящего цвета
    let propertySet = null;
    
    // Если карта wild и имеет selectedColor, используем его
    const targetColor = card.wild && card.selectedColor ? card.selectedColor : card.color;
    
    propertySet = player.getPropertySetByColor(targetColor);
    
    if (!propertySet) {
      // Создаем новый комплект
      const PropertySet = require('./PropertySet');
      propertySet = new PropertySet(targetColor);
      player.properties.push(propertySet);
    }
    
    // Если карта wild, устанавливаем selectedColor для соответствия
    if (card.wild && !card.selectedColor) {
      card.selectedColor = targetColor;
    }
    
    propertySet.addCard(card);
    
    console.log(`Card added to property set ${propertySet.color}, now has ${propertySet.cards.length} cards`);
  }

  canPlayerPayRent(player) {
        // Проверяем, есть ли у игрока карты в банке
        if (player.moneyBank.length > 0) {
            return true;
        }
        
        // Проверяем, есть ли у игрока незавершенные комплекты собственности
        for (const propertySet of player.properties) {
            if (!propertySet.isComplete() && propertySet.cards.length > 0) {
                return true;
            }
        }
        
        return false;
  }


  handleSayNoChain(playerId, actionType) {
      const player = this.getPlayer(playerId);
      const sayNoCard = player.hand.find(c => c.action === 'say_no');
      
      if (!sayNoCard) {
          throw new Error('No "Just Say No" card available');
      }
      
      // Удаляем карту из руки
      player.removeCardFromHand(sayNoCard.id);
      this.discardPile.push(sayNoCard);
      
      // Если игрок не текущий, карта "Нет" не тратит его действие
      if (this.currentPlayer === playerId) {
          this.currentActions--;
      }
      
      // Для ренты на всех, "Нет" применяется только к текущему игроку
      if (actionType === 'rent' && this.pendingRentAll) {
          // Игрок сказал "Нет" на свою ренту
          this.addLog(`${player.name} сказал НЕТ ренте!`);
          
          // Удаляем этого игрока из списка ожидающих оплаты
          this.pendingRentAll.players = this.pendingRentAll.players
              .filter(p => p.id !== playerId);
          
          // Переходим к следующему игроку или завершаем
          if (this.pendingRentAll.players.length > 0) {
              this.startRentPaymentForPlayer(this.pendingRentAll.players[0]);
          } else {
              this.pendingRentAll = null;
              this.turnPhase = 'main';
          }
          
          return true;
      }
      
      return false;
  }

  playSayNo(playerId) {
    const player = this.getPlayer(playerId);
    
    if (!this.pendingAction && !this.pendingRent) {
      throw new Error('Нет действия для отмены');
    }
    
    // Проверяем, является ли игрок целью действия
    let isTarget = false;
    if (this.pendingRent) {
      if (this.pendingRent.isAllRent) {
        // Для ренты со всех, цель - текущий платящий игрок
        isTarget = this.pendingRent.toPlayerId === playerId;
      } else {
        isTarget = this.pendingRent.toPlayerId === playerId;
      }
    } else if (this.pendingAction) {
      isTarget = this.pendingAction.targetId === playerId || 
                this.pendingAction.playerId === playerId;
    }
    
    if (!isTarget) {
      throw new Error('Вы не являетесь целью этого действия');
    }
    
    // Проверяем, есть ли у игрока карта "Просто скажи Нет"
    const sayNoCardIndex = player.hand.findIndex(c => c.action === 'say_no');
    if (sayNoCardIndex === -1) {
      throw new Error('У вас нет карты "Просто скажи Нет"');
    }
    
    // Удаляем карту из руки игрока
    const sayNoCard = player.hand.splice(sayNoCardIndex, 1)[0];
    this.discardPile.push(sayNoCard);
    
    this.addLog(`${player.name} сказал НЕТ!`);
    
    if (this.pendingRent) {
      if (this.pendingRent.isAllRent) {
        // Для ренты со всех, отменяем только для этого игрока
        this.addLog(`${player.name} отменил ренту только для себя`);
        
        // Переходим к следующему игроку, если есть
        this.completeRentPayment();
      } else {
        // Для ренты с одного игрока, полностью отменяем
        this.pendingRent = null;
        this.waitingForResponse = null;
        this.turnPhase = 'main';
        this.addLog(`${player.name} отменил ренту`);
      }
    } else if (this.pendingAction) {
      // Отменяем действие
      this.pendingAction = null;
      this.waitingForResponse = null;
      this.turnPhase = 'main';
    }
    
    this.justSaidNo = true;
  }

  completeActionWithoutSayNo() {
        if (this.pendingAction) {
            // Автоматически выполняем действие, если игрок не сказал "Нет"
            this.completePendingAction();
        } else if (this.pendingRent) {
            // Для ренты нужно дождаться оплаты
            // Ничего не делаем, ждем оплаты
        }
  }

  completePendingAction() {
    const action = this.pendingAction;
    const player = this.getPlayer(action.playerId);
    const target = action.targetId ? this.getPlayer(action.targetId) : null;
    
    switch (action.type) {
      case 'debt_collector':
        // Already handled by payRent
        break;
        
      case 'forced_deal':
        this.executeForcedDeal(player, target, action);
        break;
        
      case 'sly_deal':
        this.executeSlyDeal(player, target, action);
        break;
        
      case 'deal_breaker':
        this.executeDealBreaker(player, target, action);
        break;
    }
    
    this.pendingAction = null;
    this.currentActions--;
  }

  executeForcedDeal(player, target, action) {
    const playerProp = player.getPropertySet(action.playerPropertyId);
    const targetProp = target.getPropertySet(action.targetPropertyId);
    
    // Swap one card from each property set
    if (playerProp.cards.length > 0 && targetProp.cards.length > 0) {
      const playerCard = playerProp.cards.pop();
      const targetCard = targetProp.cards.pop();
      
      playerProp.addCard(targetCard);
      targetProp.addCard(playerCard);
      
      this.addLog(`${player.name} swapped ${action.color} property with ${target.name}`);
    }
  }

  executeSlyDeal(player, target, action) {
    const targetProp = target.getPropertySet(action.propertyId);
    
    if (targetProp.cards.length > 0) {
      const stolenCard = targetProp.cards.pop();
      
      let playerProp = player.getPropertySetByColor(action.color);
      if (!playerProp) {
        playerProp = player.createPropertySet(action.color);
      }
      
      playerProp.addCard(stolenCard);
      
      this.addLog(`${player.name} stole ${action.color} property from ${target.name}`);
    }
  }

  executeDealBreaker(player, target, action) {
    const targetProp = target.getPropertySet(action.propertySetId);
    
    // Check if player can pay 5M
    const playerMoney = player.getTotalMoney();
    if (playerMoney < 5) {
      throw new Error('Need 5M to play Deal Breaker');
    }
    
    // Take 5M from player
    const moneyCards = player.getMoneyCards(5);
    moneyCards.forEach(card => {
      player.removeCardFromBank(card.id);
      this.discardPile.push(card);
    });
    
    // Transfer complete property set
    target.removePropertySet(action.propertySetId);
    
    let playerProp = player.getPropertySetByColor(action.color);
    if (!playerProp) {
      playerProp = player.createPropertySet(action.color);
    }
    
    targetProp.cards.forEach(card => {
      playerProp.addCard(card);
    });
    
    // Transfer buildings if any
    if (targetProp.hasHouse) playerProp.hasHouse = true;
    if (targetProp.hasHotel) playerProp.hasHotel = true;
    
    this.addLog(`${player.name} stole complete ${action.color} set from ${target.name} for 5M`);
  }

  playBuildingCard(player, card, propertySetId) {
    const propertySet = player.getPropertySet(propertySetId);
    
    if (!propertySet) throw new Error('Property set not found');
    if (!propertySet.isComplete()) throw new Error('Property set must be complete');
    if (propertySet.color === 'black' || propertySet.color === 'sand') {
      throw new Error('Cannot build on railroads or utilities');
    }
    
    if (card.type === CARD_TYPES.HOUSE) {
      if (propertySet.hasHouse) throw new Error('Already has a house');
      propertySet.hasHouse = true;
      this.addLog(`${player.name} built a house on ${propertySet.color} set`);
    } else if (card.type === CARD_TYPES.HOTEL) {
      if (!propertySet.hasHouse) throw new Error('Need a house first');
      if (propertySet.hasHotel) throw new Error('Already has a hotel');
      propertySet.hasHotel = true;
      this.addLog(`${player.name} built a hotel on ${propertySet.color} set`);
    }
  }

  checkJokerAutoPlacement(player) {
    const jokerCards = player.hand.filter(c => c.type === CARD_TYPES.JOKER);
    
    jokerCards.forEach(joker => {
      // Check for incomplete property sets missing exactly one card
      const incompleteSets = player.properties.filter(p => 
        !p.isComplete() && p.cards.length === COMPLETE_SETS[p.color] - 1
      );
      
      if (incompleteSets.length > 0) {
        // Auto-place joker in first incomplete set
        const targetSet = incompleteSets[0];
        player.removeCardFromHand(joker.id);
        targetSet.addCard(joker);
        this.addLog(`${player.name}'s Joker automatically placed in ${targetSet.color} set`);
      }
    });
    
    // Also check for jokers on table (not in any set)
    const tableJokers = player.properties.flatMap(p => 
      p.cards.filter(c => c.type === CARD_TYPES.JOKER && !p.isComplete())
    );
    
    tableJokers.forEach(joker => {
      const propertySet = player.properties.find(p => p.cards.includes(joker));
      if (propertySet && propertySet.isComplete()) {
        // Move joker to another incomplete set if possible
        const incompleteSet = player.properties.find(p => 
          !p.isComplete() && p.cards.length === COMPLETE_SETS[p.color] - 1
        );
        
        if (incompleteSet) {
          propertySet.removeCard(joker.id);
          incompleteSet.addCard(joker);
          this.addLog(`Joker moved to ${incompleteSet.color} set`);
        }
      }
    });
  }

  endTurn() {
        const player = this.getPlayer(this.currentPlayer);
        if (!player) return;
        
        // Сбрасываем лишние карты (если больше 7)
        const handSize = player.hand.length;
        if (handSize > 7) {
            const toDiscard = handSize - 7;
            // В реальной игре игрок должен выбирать, какие карты сбросить
            // Здесь сбрасываем случайные
            for (let i = 0; i < toDiscard; i++) {
                if (player.hand.length > 0) {
                    const cardIndex = Math.floor(Math.random() * player.hand.length);
                    const card = player.hand.splice(cardIndex, 1)[0];
                    this.discardPile.push(card);
                }
            }
            this.addLog(`${player.name} сбросил ${toDiscard} карт`);
        }
        
        // Переход к следующему игроку
        const currentIndex = this.players.findIndex(p => p.id === this.currentPlayer);
        const nextIndex = (currentIndex + 1) % this.players.length;
        this.currentPlayer = this.players[nextIndex].id;
        this.currentActions = this.maxActions;
        this.turnPhase = 'drawing';
        this.justSaidNo = false;
        
        this.addLog(`Ход переходит к ${this.players[nextIndex].name}`);
        
        // Автоматически разыгрываем фазу взятия карт для нового игрока
        this.drawPhaseForCurrentPlayer();
    }

  drawCardsForCurrentPlayer() {
    const player = this.getPlayer(this.currentPlayer);
    if (!player) return;
    
    // Берем 2 карты из колоды
    for (let i = 0; i < 2; i++) {
      if (this.deck.cards.length > 0) {
        const card = this.deck.draw();
        if (card) {
          player.drawCard(card);
          this.addLog(`${player.name} взял карту`);
        }
      } else {
        // Если колода пуста, перемешиваем сброс
        this.reshuffleDiscardPile();
        if (this.deck.cards.length > 0) {
          const card = this.deck.draw();
          if (card) {
            player.drawCard(card);
          }
        }
      }
    }
  }

  startRentFromAll(player, amount, colors) {
    console.log(`Starting rent from all: ${player.name} wants ${amount}M for colors ${colors.join(', ')}`);
    
    // Создаем список игроков, которые должны платить ренту
    const playersToPay = this.players.filter(p => p.id !== player.id);
    
    if (playersToPay.length === 0) {
      this.addLog(`${player.name} хотел взять ренту со всех, но не с кого брать`);
      return;
    }
    
    // Запускаем ренту для первого игрока в списке
    const firstPlayer = playersToPay[0];
    this.waitingForResponse = firstPlayer.id;
    this.pendingRent = {
      fromPlayerId: player.id,
      toPlayerId: firstPlayer.id,
      amount: amount,
      colors: colors,
      remainingPlayers: playersToPay.slice(1).map(p => p.id), // Остальные игроки
      isAllRent: true
    };
    this.turnPhase = 'paying';
    
    const colorNames = colors.map(c => this.getColorName(c)).join(' и ');
    this.addLog(`${player.name} требует ${amount}М ренты за ${colorNames} со всех игроков`);
    this.addLog(`${firstPlayer.name} должен оплатить ренту`);
  }

  nextPlayer() {
    const currentIndex = this.players.findIndex(p => p.id === this.currentPlayer);
    const nextIndex = (currentIndex + 1) % this.players.length;
    
    this.currentPlayer = this.players[nextIndex].id;
    this.currentActions = this.maxActions;
    this.turnPhase = 'drawing';
    this.justSaidNo = false;
    
    // Новый игрок берет 2 карты
    this.drawCardsForCurrentPlayer();
    
    this.turnPhase = 'main';
    this.addLog(`Ход игрока ${this.players[nextIndex].name}`);
  }

  checkWinner() {
    for (const player of this.players) {
      const completeSets = player.properties.filter(p => p.isComplete()).length;
      if (completeSets >= 3) {
        return player;
      }
    }
    return null;
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  addLog(message) {
    this.log.push({
      timestamp: new Date().toISOString(),
      message
    });
    
    // Keep only last 50 messages
    if (this.log.length > 50) {
      this.log.shift();
    }
  }

  getPropertyCard(cardId) {
      for (const propertySet of this.properties) {
          const card = propertySet.cards.find(c => c.id === cardId);
          if (card) {
              return { card, propertySet };
          }
      }
      return null;
  }

  reshuffleDiscardPile() {
    if (this.discardPile.length > 0) {
      this.addLog('Колода пуста, перемешиваем сброс');
      this.deck.cards = [...this.discardPile];
      this.deck.shuffle();
      this.discardPile = [];
    }
  }

  getState() {
        return {
            id: this.id,
            players: this.players.map(p => p.getState()),
            currentPlayer: this.currentPlayer,
            currentActions: this.currentActions,
            maxActions: this.maxActions,
            turnPhase: this.turnPhase,
            waitingForResponse: this.waitingForResponse,
            pendingAction: this.pendingAction,
            pendingRent: this.currentRentRequest,
            rentAllProcess: this.rentAllProcess,
            log: this.log.slice(-10),
            deckCount: this.deck ? this.deck.getCount() : 0,
            discardPileCount: this.discardPile.length
        };
  }

  getColorName(color) {
    const colorNames = {
      'brown': 'коричневую',
      'black': 'черную (ЖД)',
      'red': 'красную',
      'green': 'зеленую',
      'orange': 'оранжевую',
      'blue': 'синюю',
      'purple': 'фиолетовую',
      'sand': 'песочную (Коммунальные)',
      'yellow': 'желтую',
      'lightblue': 'голубую'
    };
    return colorNames[color] || color;
  }
}

module.exports = Game;