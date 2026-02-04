class GameManager {
    constructor() {
        this.state = null;
        this.myPlayerId = localStorage.getItem('monopolyPlayerId');
        this.myPlayer = null;
        this.selectedCard = null;
        this.selectedPropertySet = null;
        this.selectedTargetPlayer = null;
        this.selectedColor = null;
        this.modalCallback = null;
        
        this.colorMap = {
            'brown': '#8B4513',
            'black': '#333',
            'red': '#DC2626',
            'green': '#059669',
            'orange': '#ED8936',
            'blue': '#2563EB',
            'purple': '#7C3AED',
            'sand': '#D69E2E',
            'yellow': '#D97706',
            'lightblue': '#0EA5E9'
        };
        
        this.colorNames = {
            'brown': 'Коричневый',
            'black': 'Чёрный (ЖД)',
            'red': 'Красный',
            'green': 'Зелёный',
            'orange': 'Оранжевый',
            'blue': 'Синий',
            'purple': 'Фиолетовый',
            'sand': 'Песочный (Коммунальные)',
            'yellow': 'Жёлтый',
            'lightblue': 'Голубой'
        };
        
        this.setupEventListeners();
        
        if (this.myPlayerId) {
            console.log('Restored player ID:', this.myPlayerId);
        }
    }
    
    setPlayerId(playerId) {
        console.log('Setting player ID to:', playerId);
        this.myPlayerId = playerId;
        localStorage.setItem('monopolyPlayerId', playerId);
    }
    
    setupEventListeners() {
        document.getElementById('createGameBtn').addEventListener('click', () => {
            const playerName = document.getElementById('playerName').value.trim();
            if (playerName) {
                socketManager.createGame(playerName);
            } else {
                alert('Введите имя игрока');
            }
        });
        
        document.getElementById('joinGameBtn').addEventListener('click', () => {
            const playerName = document.getElementById('playerName').value.trim();
            const gameCode = document.getElementById('gameCode').value.trim().toUpperCase();
            if (playerName && gameCode) {
                socketManager.joinGame(gameCode, playerName);
            } else {
                alert('Введите имя и код игры');
            }
        });
        
        document.getElementById('startGameBtn').addEventListener('click', () => {
            socketManager.startGame();
        });
        
        document.getElementById('endTurnBtn').addEventListener('click', () => {
            socketManager.endTurn();
        });
        
        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('modal-confirm').addEventListener('click', () => {
            if (this.modalCallback) {
                this.modalCallback();
            }
        });
        
        document.getElementById('say-no-btn').addEventListener('click', () => {
            socketManager.sayNo();
            this.hideSayNoPrompt();
        });
        
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('createGameBtn').click();
            }
        });
        
        document.getElementById('gameCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('joinGameBtn').click();
            }
        });

        document.getElementById('skip-say-no-btn').addEventListener('click', () => {
            this.hideSayNoPrompt();
            // После скрытия окна "Скажи Нет", если это рента, покажем окно оплаты
            if (this.state.pendingRent && this.state.waitingForResponse === this.myPlayerId) {
                this.showRentPaymentModal();
            }
            // Для других действий сервер должен автоматически обработать
        });
    }
    
     updateGameState(state) {
        console.log('=== UPDATE GAME STATE ===');
        console.log('Turn phase:', state.turnPhase);
        console.log('Current player:', state.currentPlayer);
        console.log('My player ID:', this.myPlayerId);
        console.log('Total players:', state.players.length);
        
        this.state = state;
        
        // Находим себя в списке игроков
        if (this.myPlayerId) {
        this.myPlayer = state.players.find(p => p.id === this.myPlayerId);
        if (this.myPlayer) {
            console.log('Found my player:', this.myPlayer.name);
            console.log('My hand cards:', this.myPlayer.hand ? this.myPlayer.hand.length : 0);
            if (this.myPlayer.hand) {
            console.log('Card details:', this.myPlayer.hand.map(c => ({
                name: c.name,
                type: c.type,
                value: c.value
            })));
            }
        } else {
            console.log('Could not find my player in the list');
            console.log('Available players:', state.players.map(p => ({id: p.id, name: p.name})));
        }
        } else {
        console.log('No player ID set yet');
        }
        
        this.updateGameUI();
    }
    
    updateGameUI() {
        if (!this.state) {
        console.log('No game state to update UI');
        return;
        }

        const turnIndicator = document.getElementById('your-turn-indicator');
        if (this.state.currentPlayer === this.myPlayerId && this.state.turnPhase === 'main') {
            turnIndicator.classList.remove('hidden');
        } else {
            turnIndicator.classList.add('hidden');
        }
        
        console.log('=== UPDATE GAME UI ===');
        console.log('Turn phase:', this.state.turnPhase);
        console.log('Current actions:', this.state.currentActions);
        
        // Обновляем информацию о ходе
        const currentPlayer = this.state.players.find(p => p.id === this.state.currentPlayer);
        if (currentPlayer) {
        document.getElementById('current-player').textContent = `Ходит: ${currentPlayer.name}`;
        console.log('Current player:', currentPlayer.name);
        }
        
        document.getElementById('actions-left').textContent = `Действий: ${this.state.currentActions}/${this.state.maxActions}`;
        
        // Обновляем информацию о себе
        if (this.myPlayer) {
        document.getElementById('my-name').textContent = this.myPlayer.name;
        document.getElementById('money-amount').textContent = `${this.myPlayer.totalMoney}М`;
        document.getElementById('hand-count').textContent = this.myPlayer.hand ? this.myPlayer.hand.length : 0;
        
        // Показываем сообщение, если это наш ход
        if (this.state.currentPlayer === this.myPlayerId) {
            console.log('It\'s my turn!');
            if (this.state.turnPhase === 'drawing') {
            console.log('Waiting for me to draw cards...');
            } else if (this.state.turnPhase === 'main') {
            console.log('I can play cards now! Actions:', this.state.currentActions);
            }
        }
        }
        
        // Обновляем остальные элементы UI
        this.updateOtherPlayers();
        this.updatePropertySets();
        this.updateHand();
        this.updateGameLog();
        
        // Управляем видимостью кнопки завершения хода
        const endTurnBtn = document.getElementById('endTurnBtn');
        if (this.state.currentPlayer === this.myPlayerId && 
            this.state.turnPhase === 'main' && 
            !this.state.waitingForResponse) {
        endTurnBtn.classList.remove('hidden');
        console.log('End turn button should be visible');
        } else {
        endTurnBtn.classList.add('hidden');
        }
        
        // Показываем модальные окна если нужно
        if (this.state.waitingForResponse === this.myPlayerId) {
        if (this.state.pendingRent) {
            this.showRentPaymentModal();
        } else if (this.state.pendingAction) {
            this.showActionResponseModal();
        }
        }
        
        // Показываем окно для "Скажи Нет"
        if (this.state.pendingAction || this.state.pendingRent) {
            const targetId = this.state.pendingRent ? 
                this.state.pendingRent.toPlayerId : 
                (this.state.pendingAction ? this.state.pendingAction.targetId || this.state.pendingAction.playerId : null);
            
            if (targetId === this.myPlayerId) {
                // Проверяем, есть ли у игрока карта "Нет" в руке
                const hasSayNoCard = this.myPlayer && this.myPlayer.hand && 
                    this.myPlayer.hand.some(card => card.action === 'say_no');
                
                // Если есть карта "Нет" и мы не ждем ответа в модальном окне оплаты
                if (hasSayNoCard && this.state.waitingForResponse !== this.myPlayerId) {
                    this.showSayNoPrompt();
                } else if (!hasSayNoCard && this.state.waitingForResponse === this.myPlayerId) {
                    // Если нет карты "Нет" и это рента, покажем окно оплаты
                    if (this.state.pendingRent) {
                        this.showRentPaymentModal();
                    }
                    // Для других действий, просто скрываем окно "Скажи Нет"
                    this.hideSayNoPrompt();
                } else {
                    this.hideSayNoPrompt();
                }
            } else {
                this.hideSayNoPrompt();
            }
        } else {
            this.hideSayNoPrompt();
        }
    }
    
    updateOtherPlayers() {
        const container = document.getElementById('other-players');
        container.innerHTML = '';
        
        this.state.players.forEach(player => {
            if (player.id === this.myPlayerId) return;
            
            const isCurrent = player.id === this.state.currentPlayer;
            
            const playerBox = document.createElement('div');
            playerBox.className = `player-box ${isCurrent ? 'current' : ''}`;
            
            let html = `
                <h4>${player.name} (${player.totalMoney}М)</h4>
                <div class="player-properties">
            `;
            
            player.properties.forEach(prop => {
                if (prop.cards && prop.cards.length > 0) {
                    const isComplete = prop.isComplete ? '✓' : '';
                    html += `
                        <div class="property-chip ${prop.color}" title="${this.colorNames[prop.color] || prop.color}">
                            ${prop.color.charAt(0).toUpperCase()} ${isComplete} (${prop.cards.length})
                        </div>
                    `;
                }
            });
            
            html += '</div>';
            
            if (player.hand && player.hand.length > 0) {
                html += `<div class="hand-count">Карт в руке: ${player.hand.length}</div>`;
            }
            
            playerBox.innerHTML = html;
            container.appendChild(playerBox);
        });
    }
    
    updatePropertySets() {
        const container = document.getElementById('property-sets');
        container.innerHTML = '';
        
        if (!this.myPlayer || !this.myPlayer.properties) return;
        
        console.log('Updating property sets:', this.myPlayer.properties);
        
        this.myPlayer.properties.forEach(propertySet => {
            const setElement = document.createElement('div');
            setElement.className = `property-set ${propertySet.isComplete ? 'complete' : ''}`;
            setElement.dataset.setId = propertySet.id;
            
            let buildings = '';
            if (propertySet.hasHouse) buildings += ' 🏠';
            if (propertySet.hasHotel) buildings += ' 🏨';
            
            const rent = propertySet.rent || 0;
            const matchingCards = propertySet.matchingCards || 0;
            const totalCards = propertySet.totalCards || propertySet.cards?.length || 0;
            
            const html = `
                <div class="property-set-header">
                    <div class="property-set-color ${propertySet.color}" style="background-color: ${this.colorMap[propertySet.color] || '#ccc'}">
                        ${this.colorNames[propertySet.color] || propertySet.color}
                    </div>
                    <div class="property-set-info">
                        <div class="property-set-cards-count">Карт: ${matchingCards}/${COMPLETE_SETS[propertySet.color] || '?'}</div>
                        <div class="property-set-rent">${rent}М${buildings}</div>
                    </div>
                </div>
            `;
            
            setElement.innerHTML = html;
            
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'property-set-cards';
            
            if (propertySet.cards && propertySet.cards.length > 0) {
                propertySet.cards.forEach(card => {
                    const cardElement = document.createElement('div');
                    cardElement.className = `property-card ${card.type === 'joker' ? 'joker' : ''} ${card.wild ? 'wild' : ''}`;
                    cardElement.title = card.name;
                    
                    if (card.type === 'joker') {
                        cardElement.textContent = '🤹';
                        cardElement.title = 'Джокер';
                    } else if (card.wild) {
                        const displayColor = card.selectedColor ? card.selectedColor.charAt(0).toUpperCase() : 'W';
                        cardElement.textContent = displayColor;
                        cardElement.title = `${card.name} (${card.selectedColor || 'не выбран'})`;
                    } else {
                        cardElement.textContent = card.name.charAt(0);
                        cardElement.title = `${card.name} (${this.colorNames[card.color] || card.color})`;
                    }
                    
                    cardsContainer.appendChild(cardElement);
                });
            }
            
            setElement.appendChild(cardsContainer);
            container.appendChild(setElement);
            
            setElement.addEventListener('click', () => {
                this.selectPropertySet(propertySet.id);
            });
        });
    }
    
    updateHand() {
        const container = document.getElementById('cards-container');
        container.innerHTML = '';
        
        if (!this.myPlayer || !this.myPlayer.hand) {
        console.log('No player or hand to update');
        return;
        }
        
        console.log('Updating hand with', this.myPlayer.hand.length, 'cards');
        
        if (this.myPlayer.hand.length === 0) {
        const message = document.createElement('div');
        message.className = 'empty-hand-message';
        message.textContent = 'Нет карт в руке';
        container.appendChild(message);
        return;
        }
        
        this.myPlayer.hand.forEach(card => {
        const cardElement = this.createCardElement(card);
        container.appendChild(cardElement);
        });
    }
    
    createCardElement(card) {
        const div = document.createElement('div');
        div.className = `card ${card.type}`;
        div.dataset.cardId = card.id;
        
        let colorText = '';
        if (card.color) {
            colorText = this.colorNames[card.color] || card.color;
        } else if (card.wildColors && card.wildColors.length > 0) {
            colorText = card.wildColors.map(c => this.colorNames[c] || c).join('/');
        }
        
        let valueText = '';
        if (card.value !== null && card.value !== undefined) {
            valueText = `${card.value}М`;
        }
        
        const html = `
            <div class="card-header">
                ${card.type === 'money' ? '💰' : 
                  card.type === 'property' ? '🏠' : 
                  card.type === 'action' ? '🎯' : 
                  card.type === 'rent' ? '💸' : 
                  card.type === 'house' ? '🏡' : 
                  card.type === 'hotel' ? '🏨' : 
                  card.type === 'joker' ? '🤹' : ''}
            </div>
            <div class="card-value">${valueText}</div>
            <div class="card-name">${card.name}</div>
            ${colorText ? `<div class="card-color">${colorText}</div>` : ''}
        `;
        
        div.innerHTML = html;
        
        // Исправление: используем window.gameManager для доступа к методу
        div.addEventListener('click', () => {
            window.gameManager.selectCard(card.id);
        });
        
        return div;
    }
    
    selectCard(cardId) {
        if (this.selectedCard === cardId) {
            this.selectedCard = null;
        } else {
            this.selectedCard = cardId;
        }
        
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('selected');
        });
        
        if (this.selectedCard) {
            const selectedCard = document.querySelector(`.card[data-card-id="${this.selectedCard}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }
            
            const card = this.myPlayer.hand.find(c => c.id === this.selectedCard);
            if (card) {
                this.handleCardSelection(card);
            }
        }
    }
    
    selectPropertySet(setId) {
        this.selectedPropertySet = setId;
        
        document.querySelectorAll('.property-set').forEach(set => {
            set.classList.remove('selected');
        });
        
        const selectedSet = document.querySelector(`.property-set[data-set-id="${setId}"]`);
        if (selectedSet) {
            selectedSet.classList.add('selected');
        }
    }
    
    updateGameLog() {
        const container = document.getElementById('game-log');
        container.innerHTML = '';
        
        if (!this.state.log) return;
        
        this.state.log.forEach(logEntry => {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.textContent = logEntry.message;
            container.appendChild(div);
        });
        
        container.scrollTop = container.scrollHeight;
    }
    
    handleCardSelection(card) {
        if (!this.state || this.state.currentPlayer !== this.myPlayerId) {
            alert('Не ваш ход!');
            this.selectedCard = null;
            return;
        }
        
        if (this.state.turnPhase !== 'main') {
            alert('Сначала возьмите карты!');
            this.selectedCard = null;
            return;
        }
        
        if (this.state.currentActions <= 0) {
            alert('Нет действий для хода!');
            this.selectedCard = null;
            return;
        }
        
        switch (card.type) {
            case 'money':
                this.playMoneyCard(card);
                break;
                
            case 'property':
                this.showPropertyPlacementModal(card);
                break;
                
            case 'action':
                this.showActionCardModal(card);
                break;
                
            case 'rent':
                this.showRentCardModal(card);
                break;
                
            case 'house':
            case 'hotel':
                this.showBuildingPlacementModal(card);
                break;
                
            case 'joker':
                alert('Джокер играется автоматически при нехватке карты в комплекте');
                this.selectedCard = null;
                break;
                
            default:
                alert('Неизвестный тип карты');
                this.selectedCard = null;
        }
    }
    
    playMoneyCard(card) {
        socketManager.playCard(card.id);
        this.selectedCard = null;
    }
    
    showPropertyPlacementModal(card) {
        let content = '';
        
        if (card.wild) {
            content = '<p>Выберите цвет для этой универсальной собственности:</p>';
            card.wildColors.forEach(color => {
                content += `
                    <div class="modal-option color-option" data-color="${color}">
                        <div class="color-sample" style="background-color: ${this.colorMap[color] || '#ccc'}"></div>
                        ${this.colorNames[color] || color}
                    </div>
                `;
            });
            
            this.showModal('Выложить собственность', content, () => {
                if (!this.selectedColor) {
                    alert('Выберите цвет');
                    return;
                }
                
                const propertySets = this.myPlayer.properties.filter(p => p.color === this.selectedColor);
                let propertySetId = null;
                
                if (propertySets.length > 0) {
                    propertySetId = propertySets[0].id;
                }
                
                socketManager.playCard(card.id, {
                    propertySetId: propertySetId,
                    selectedColor: this.selectedColor
                });
                
                this.hideModal();
                this.selectedCard = null;
                this.selectedColor = null;
            }, true);
            
            setTimeout(() => {
                document.querySelectorAll('.color-option').forEach(option => {
                    option.addEventListener('click', () => {
                        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                        option.classList.add('selected');
                        this.selectedColor = option.dataset.color;
                    });
                });
            }, 100);
            
        } else {
            const propertySets = this.myPlayer.properties.filter(p => p.color === card.color);
            
            if (propertySets.length === 0) {
                socketManager.playCard(card.id, {
                    propertySetId: null
                });
                this.selectedCard = null;
            } else {
                content = '<p>Выберите комплект для добавления:</p>';
                propertySets.forEach(set => {
                    const isComplete = set.isComplete ? ' (полный)' : '';
                    content += `
                        <div class="modal-option set-option" data-set-id="${set.id}">
                            ${this.colorNames[set.color] || set.color} - ${set.cards.length} карт${isComplete}
                        </div>
                    `;
                });
                
                this.showModal('Добавить в комплект', content, () => {
                    if (!this.selectedPropertySet) {
                        alert('Выберите комплект');
                        return;
                    }
                    
                    socketManager.playCard(card.id, {
                        propertySetId: this.selectedPropertySet
                    });
                    
                    this.hideModal();
                    this.selectedCard = null;
                    this.selectedPropertySet = null;
                }, true);
                
                setTimeout(() => {
                    document.querySelectorAll('.set-option').forEach(option => {
                        option.addEventListener('click', () => {
                            document.querySelectorAll('.set-option').forEach(o => o.classList.remove('selected'));
                            option.classList.add('selected');
                            this.selectedPropertySet = option.dataset.setId;
                        });
                    });
                }, 100);
            }
        }
    }
    
    showActionCardModal(card) {
        let content = '';
        
        switch (card.action) {
            case 'pass_go':
                socketManager.playCard(card.id);
                this.selectedCard = null;
                return;
                
            case 'birthday':
                socketManager.playCard(card.id);
                this.selectedCard = null;
                return;
                
            case 'debt_collector':
                content = '<p>Выберите игрока для сбора долга:</p>';
                this.state.players.forEach(player => {
                    if (player.id !== this.myPlayerId) {
                        content += `
                            <div class="modal-option player-option" data-player-id="${player.id}">
                                ${player.name} (${player.totalMoney}М)
                            </div>
                        `;
                    }
                });
                break;
                
            case 'forced_deal':
            case 'sly_deal':
            case 'deal_breaker':
                content = '<p>Выберите игрока:</p>';
                this.state.players.forEach(player => {
                    if (player.id !== this.myPlayerId) {
                        content += `
                            <div class="modal-option player-option" data-player-id="${player.id}">
                                ${player.name}
                            </div>
                        `;
                    }
                });
                
                content += '<p style="margin-top: 20px;">Выберите цвет собственности:</p>';
                const colors = ['brown', 'black', 'red', 'green', 'orange', 'blue', 'purple', 'sand', 'yellow', 'lightblue'];
                colors.forEach(color => {
                    content += `
                        <div class="modal-option color-option" data-color="${color}">
                            <div class="color-sample" style="background-color: ${this.colorMap[color] || '#ccc'}"></div>
                            ${this.colorNames[color] || color}
                        </div>
                    `;
                });
                break;
                
            case 'say_no':
                alert('Карта "Просто скажи НЕТ!" играется в ответ на действие другого игрока');
                this.selectedCard = null;
                return;
                
            default:
                alert('Неизвестное действие карты');
                this.selectedCard = null;
                return;
        }
        
        this.showModal(card.name, content, () => {
            if (!this.selectedTargetPlayer) {
                alert('Выберите игрока');
                return;
            }
            
            if ((card.action === 'forced_deal' || card.action === 'sly_deal' || card.action === 'deal_breaker') && !this.selectedColor) {
                alert('Выберите цвет');
                return;
            }
            
            socketManager.playCard(card.id, {
                targetPlayerId: this.selectedTargetPlayer,
                selectedColor: this.selectedColor
            });
            
            this.hideModal();
            this.selectedCard = null;
            this.selectedTargetPlayer = null;
            this.selectedColor = null;
        }, true);
        
        setTimeout(() => {
            document.querySelectorAll('.player-option').forEach(option => {
                option.addEventListener('click', () => {
                    document.querySelectorAll('.player-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    this.selectedTargetPlayer = option.dataset.playerId;
                });
            });
            
            if (card.action === 'forced_deal' || card.action === 'sly_deal' || card.action === 'deal_breaker') {
                document.querySelectorAll('.color-option').forEach(option => {
                    option.addEventListener('click', () => {
                        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                        option.classList.add('selected');
                        this.selectedColor = option.dataset.color;
                    });
                });
            }
        }, 100);
    }
    
    showRentCardModal(card) {
        console.log('=== SHOW RENT CARD MODAL ===');
        console.log('Full card data:', card);
        
        // Сбрасываем выбранные значения
        this.selectedColor = null;
        this.selectedTargetPlayer = null;
        
        // Простая проверка - если это двухцветная рента (имеет colors массив)
        if (card.colors && Array.isArray(card.colors) && card.colors.length >= 2) {
            console.log('This is a two-color rent card:', card.colors);
            
            let content = '<p>Выберите цвет для ренты:</p>';
            
            // Всегда показываем оба цвета, пусть сервер проверит доступность
            card.colors.forEach(color => {
                content += `
                    <div class="modal-option color-option" data-color="${color}">
                        <div class="color-sample" style="background-color: ${this.colorMap[color] || '#ccc'}"></div>
                        ${this.colorNames[color] || color}
                    </div>
                `;
            });
            
            // Для двухцветной ренты всегда target: 'all', не нужно выбирать игрока
            content += '<p style="margin-top: 20px;">Рента будет взята со всех игроков</p>';
            
            this.showModal('Сыграть ренту', content, () => {
                if (!this.selectedColor) {
                    alert('Выберите цвет');
                    return;
                }
                
                console.log(`Playing two-color rent: ${card.name}, color: ${this.selectedColor}`);
                
                // Для двухцветной ренты не нужно targetPlayerId
                socketManager.playCard(card.id, {
                    selectedColor: this.selectedColor
                });
                
                this.hideModal();
                this.selectedCard = null;
                this.selectedColor = null;
            }, true);
            
            // Добавляем обработчики для выбора цвета
            setTimeout(() => {
                const colorOptions = document.querySelectorAll('.color-option');
                console.log(`Found ${colorOptions.length} color options`);
                
                colorOptions.forEach(option => {
                    option.addEventListener('click', () => {
                        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                        option.classList.add('selected');
                        this.selectedColor = option.dataset.color;
                        console.log(`Selected color: ${this.selectedColor}`);
                    });
                });
            }, 100);
            
            return;
        }
        
        // Для универсальной ренты (wild)
        if (card.rentType === 'wild') {
            let content = '<p>Выберите цвет для ренты:</p>';
            const colors = ['brown', 'black', 'red', 'green', 'orange', 'blue', 'purple', 'sand', 'yellow', 'lightblue'];
            colors.forEach(color => {
                content += `
                    <div class="modal-option color-option" data-color="${color}">
                        <div class="color-sample" style="background-color: ${this.colorMap[color] || '#ccc'}"></div>
                        ${this.colorNames[color] || color}
                    </div>
                `;
            });
            
            content += '<p style="margin-top: 20px;">Выберите игрока для ренты:</p>';
            this.state.players.forEach(player => {
                if (player.id !== this.myPlayerId) {
                    content += `
                        <div class="modal-option player-option" data-player-id="${player.id}">
                            ${player.name} (${player.totalMoney}М)
                        </div>
                    `;
                }
            });
            
            this.showModal('Сыграть ренту', content, () => {
                if (!this.selectedColor) {
                    alert('Выберите цвет');
                    return;
                }
                
                if (!this.selectedTargetPlayer) {
                    alert('Выберите игрока');
                    return;
                }
                
                socketManager.playCard(card.id, {
                    selectedColor: this.selectedColor,
                    targetPlayerId: this.selectedTargetPlayer
                });
                
                this.hideModal();
                this.selectedCard = null;
                this.selectedColor = null;
                this.selectedTargetPlayer = null;
            }, true);
            
            // Добавляем обработчики
            setTimeout(() => {
                const colorOptions = document.querySelectorAll('.color-option');
                colorOptions.forEach(option => {
                    option.addEventListener('click', () => {
                        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                        option.classList.add('selected');
                        this.selectedColor = option.dataset.color;
                    });
                });
                
                const playerOptions = document.querySelectorAll('.player-option');
                playerOptions.forEach(option => {
                    option.addEventListener('click', () => {
                        document.querySelectorAll('.player-option').forEach(o => o.classList.remove('selected'));
                        option.classList.add('selected');
                        this.selectedTargetPlayer = option.dataset.playerId;
                    });
                });
            }, 100);
            
            return;
        }
        
        // Для обычной ренты со всех
        if (card.target === 'all') {
            // Просто играем карту
            socketManager.playCard(card.id);
            this.selectedCard = null;
            return;
        }
        
        // Для обычной ренты с выбором игрока
        let content = '<p>Выберите игрока для ренты:</p>';
        this.state.players.forEach(player => {
            if (player.id !== this.myPlayerId) {
                content += `
                    <div class="modal-option player-option" data-player-id="${player.id}">
                        ${player.name} (${player.totalMoney}М)
                    </div>
                `;
            }
        });
        
        this.showModal('Сыграть ренту', content, () => {
            if (!this.selectedTargetPlayer) {
                alert('Выберите игрока');
                return;
            }
            
            socketManager.playCard(card.id, {
                targetPlayerId: this.selectedTargetPlayer
            });
            
            this.hideModal();
            this.selectedCard = null;
            this.selectedTargetPlayer = null;
        }, true);
        
        // Добавляем обработчики для выбора игрока
        setTimeout(() => {
            const playerOptions = document.querySelectorAll('.player-option');
            playerOptions.forEach(option => {
                option.addEventListener('click', () => {
                    document.querySelectorAll('.player-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    this.selectedTargetPlayer = option.dataset.playerId;
                });
            });
        }, 100);
    }
    
    showRentPaymentModal() {
        const rentInfo = this.state.pendingRent;
        if (!rentInfo) {
            console.error('No rent info available');
            return;
        }
        
        const fromPlayer = this.state.players.find(p => p.id === rentInfo.fromPlayerId);
        if (!fromPlayer) {
            console.error('From player not found');
            return;
        }
        
        const colors = rentInfo.colors || [rentInfo.color];
        const colorNames = colors.map(c => this.colorNames[c] || c || 'неизвестного цвета');
        const colorName = colorNames.join(' и ');
        
        console.log(`Rent payment required: ${rentInfo.amount}M for ${colorName} properties`);
        
        // Собираем все доступные карты для оплаты
        const allCards = [];
        
        // Карты из банка (деньги)
        if (this.myPlayer.moneyBank) {
            this.myPlayer.moneyBank.forEach(card => {
                allCards.push({
                    id: card.id,
                    name: card.name,
                    value: card.value || 0,
                    source: 'bank',
                    type: card.type
                });
            });
        }
        
        // Карты из незавершенных комплектов собственности (с поля)
        if (this.myPlayer.properties) {
            this.myPlayer.properties.forEach(propertySet => {
                if (!propertySet.isComplete) {
                    propertySet.cards.forEach(card => {
                        allCards.push({
                            id: card.id,
                            name: card.name,
                            value: card.value || 0,
                            source: 'property',
                            propertySetId: propertySet.id,
                            type: card.type,
                            color: card.color
                        });
                    });
                }
            });
        }
        
        // Проверяем, есть ли у игрока чем платить
        if (allCards.length === 0) {
            // У игрока нет карт для оплаты - автоматически отправляем пустой массив
            console.log('Player has no cards to pay rent, automatically skipping');
            socketManager.payRent([]);
            return;
        }
        
        let content = `
            <div class="rent-info">
                <p><strong>${fromPlayer.name}</strong> требует <strong>${rentInfo.amount}М</strong> ренты за <strong>${colorName}</strong> собственность</p>
                <p>Выберите карты для оплаты (сумма должна быть не менее ${rentInfo.amount}М):</p>
                <p class="payment-note">Можно использовать только карты из банка или собственности с поля (не из руки!)</p>
            </div>
            <div id="payment-cards">
        `;
        
        // Сортируем карты по стоимости (дешевые сначала)
        allCards.sort((a, b) => (a.value || 0) - (b.value || 0));
        
        allCards.forEach(card => {
            const value = card.value || 0;
            let sourceText = '';
            if (card.source === 'property') sourceText = ' [собственность с поля]';
            
            content += `
                <div class="payment-card-option" data-card-id="${card.id}" data-value="${value}" data-source="${card.source}">
                    <div class="payment-card-info">
                        <span class="card-name">${card.name}</span>
                        <span class="card-details">${value}М${sourceText}</span>
                    </div>
                </div>
            `;
        });
        
        content += '</div>';
        content += `<div id="payment-total" class="not-enough">Выбрано: 0М (нужно: ${rentInfo.amount}М)</div>`;
        
        let selectedCards = [];
        let totalValue = 0;
        
        // Показываем модальное окно без кнопки "Отмена"
        this.showModal('Оплатить ренту', content, () => {
            if (totalValue < rentInfo.amount) {
                // Все равно отправляем выбранные карты, даже если сумма меньше
                // Сервер обработает этот случай
                console.log(`Insufficient payment: ${totalValue}M of ${rentInfo.amount}M`);
            }
            
            console.log('Paying rent with cards:', selectedCards.map(c => c.id));
            socketManager.payRent(selectedCards.map(c => c.id));
            this.hideModal();
        }, false); // showCancel = false
        
        // Автоматически выбираем карты, чтобы облегчить игроку оплату
        setTimeout(() => {
            // Автовыбор карт для оплаты (начиная с самых дешевых)
            const paymentOptions = document.querySelectorAll('.payment-card-option');
            let remainingAmount = rentInfo.amount;
            
            // Сначала пробуем набрать точную сумму
            for (const option of paymentOptions) {
                if (remainingAmount <= 0) break;
                
                const value = parseInt(option.dataset.value);
                if (value <= remainingAmount || remainingAmount > 0) {
                    const cardId = option.dataset.cardId;
                    const source = option.dataset.source;
                    
                    // Добавляем карту в выбор
                    const existingIndex = selectedCards.findIndex(c => c.id === cardId);
                    if (existingIndex === -1) {
                        selectedCards.push({id: cardId, value: value, source: source});
                        totalValue += value;
                        remainingAmount -= value;
                        option.classList.add('selected');
                    }
                }
            }
            
            // Если не набрали нужную сумму, добавляем еще карт
            if (remainingAmount > 0) {
                for (const option of paymentOptions) {
                    if (remainingAmount <= 0) break;
                    
                    const cardId = option.dataset.cardId;
                    const existingIndex = selectedCards.findIndex(c => c.id === cardId);
                    if (existingIndex === -1) {
                        const value = parseInt(option.dataset.value);
                        const source = option.dataset.source;
                        
                        selectedCards.push({id: cardId, value: value, source: source});
                        totalValue += value;
                        remainingAmount -= value;
                        option.classList.add('selected');
                    }
                }
            }
            
            // Обновляем отображение суммы
            const paymentTotal = document.getElementById('payment-total');
            paymentTotal.textContent = `Выбрано: ${totalValue}М (нужно: ${rentInfo.amount}М)`;
            
            if (totalValue >= rentInfo.amount) {
                paymentTotal.classList.remove('not-enough');
                paymentTotal.classList.add('enough');
            } else {
                paymentTotal.classList.remove('enough');
                paymentTotal.classList.add('not-enough');
            }
            
            // Добавляем обработчики кликов для изменения выбора
            document.querySelectorAll('.payment-card-option').forEach(option => {
                option.addEventListener('click', () => {
                    const cardId = option.dataset.cardId;
                    const value = parseInt(option.dataset.value);
                    const source = option.dataset.source;
                    
                    const existingIndex = selectedCards.findIndex(c => c.id === cardId);
                    
                    if (existingIndex >= 0) {
                        // Remove from selection
                        selectedCards.splice(existingIndex, 1);
                        totalValue -= value;
                        option.classList.remove('selected');
                    } else {
                        // Add to selection
                        selectedCards.push({id: cardId, value: value, source: source});
                        totalValue += value;
                        option.classList.add('selected');
                    }
                    
                    const paymentTotal = document.getElementById('payment-total');
                    paymentTotal.textContent = `Выбрано: ${totalValue}М (нужно: ${rentInfo.amount}М)`;
                    
                    // Update visual feedback
                    if (totalValue >= rentInfo.amount) {
                        paymentTotal.classList.remove('not-enough');
                        paymentTotal.classList.add('enough');
                    } else {
                        paymentTotal.classList.remove('enough');
                        paymentTotal.classList.add('not-enough');
                    }
                });
            });
        }, 100);
    }
    
    showActionResponseModal() {
        console.log('Action response needed');
    }
    
    showSayNoPrompt() {
        let message = '';
        
        if (this.state.pendingRent) {
            const fromPlayer = this.state.players.find(p => p.id === this.state.pendingRent.fromPlayerId);
            message = `${fromPlayer.name} требует ренту ${this.state.pendingRent.amount}М`;
        } else if (this.state.pendingAction) {
            const fromPlayer = this.state.players.find(p => p.id === this.state.pendingAction.playerId);
            const actionNames = {
                'debt_collector': 'Сборщик долгов',
                'forced_deal': 'Вынужденная сделка',
                'sly_deal': 'Хитрая сделка',
                'deal_breaker': 'Аферист'
            };
            const actionName = actionNames[this.state.pendingAction.type] || 'действие';
            message = `${fromPlayer.name} играет "${actionName}"`;
        }
        
        document.getElementById('say-no-message').textContent = message;
        
        // Показываем/скрываем кнопку "Скажи Нет" в зависимости от наличия карты
        const hasSayNoCard = this.myPlayer && this.myPlayer.hand && 
            this.myPlayer.hand.some(card => card.action === 'say_no');
        
        if (hasSayNoCard) {
            document.getElementById('say-no-btn').classList.remove('hidden');
            document.getElementById('say-no-btn').disabled = false;
        } else {
            document.getElementById('say-no-btn').classList.add('hidden');
            document.getElementById('say-no-btn').disabled = true;
        }
        
        document.getElementById('say-no-overlay').classList.remove('hidden');
    }
    
    hideSayNoPrompt() {
        document.getElementById('say-no-overlay').classList.add('hidden');
    }

    showRentResponseModal(rentInfo) {
        const modal = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');
        const modalTitle = document.getElementById('modal-title');
        const modalCancel = document.getElementById('modal-cancel');
        const modalConfirm = document.getElementById('modal-confirm');
        
        modalContent.innerHTML = '';
        modalCancel.style.display = 'inline-block';
        modalConfirm.style.display = 'inline-block';
        
        const fromPlayer = this.getPlayerById(rentInfo.fromPlayerId);
        const myPlayer = this.getMyPlayer();
        const hasSayNoCard = myPlayer && myPlayer.hand && 
            myPlayer.hand.some(card => card.action === 'say_no');
        
        modalTitle.textContent = 'Требуется оплата ренты';
        
        let message = `Игрок <strong>${fromPlayer.name}</strong> требует с вас ренту`;
        if (rentInfo.color) {
            message += ` за <strong>${this.getColorName(rentInfo.color)}</strong> собственности`;
        }
        message += ` в размере <strong>${rentInfo.amount}M</strong>`;
        if (rentInfo.isDouble) {
            message += ' (двойная рента!)';
        }
        
        // Создаем единое окно с двумя разделами
        modalContent.innerHTML = `
            <div class="rent-prompt">
                <div class="rent-info">
                    <p>${message}</p>
                </div>
                
                <div class="tabs">
                    <button class="tab-btn active" data-tab="pay">💳 Оплатить ренту</button>
                    ${hasSayNoCard ? 
                        `<button class="tab-btn" data-tab="sayno">🚫 Сказать НЕТ (есть карта)</button>` : 
                        `<button class="tab-btn disabled" data-tab="sayno" disabled>🚫 Сказать НЕТ (нет карты)</button>`
                    }
                </div>
                
                <div class="tab-content active" id="pay-tab">
                    <div class="payment-section">
                        <h4>Выберите карты для оплаты:</h4>
                        <div class="cards-instruction">
                            <small>Кликайте по картам для выбора. Сумма должна быть не менее ${rentInfo.amount}M</small>
                        </div>
                        <div id="payment-cards" class="cards-selection">
                            <!-- Карты для оплаты будут добавлены динамически -->
                        </div>
                        <div class="payment-summary">
                            <p>Выбрано: <span id="selected-sum">0</span>M / ${rentInfo.amount}M</p>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="sayno-tab">
                    <div class="sayno-section">
                        <div class="sayno-info">
                            <h4>🗑️ Использовать карту "Просто скажи НЕТ"</h4>
                            <p>Вы можете отменить действие ренты, сыграв карту "Просто скажи НЕТ".</p>
                            <div class="sayno-card-preview">
                                <div class="card-preview action">
                                    <span class="card-name">Просто скажи Нет</span>
                                    <span class="card-value">4M</span>
                                </div>
                            </div>
                            <p class="warning">⚠️ Карта будет сброшена после использования!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Загружаем доступные карты для оплаты
        this.renderPaymentCards(rentInfo.amount);
        
        // Настройка вкладок
        const tabButtons = modalContent.querySelectorAll('.tab-btn');
        const tabContents = modalContent.querySelectorAll('.tab-content');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('disabled')) return;
                
                // Убираем активный класс у всех
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Добавляем активный класс текущему
                btn.classList.add('active');
                const tabId = btn.dataset.tab + '-tab';
                modalContent.querySelector(`#${tabId}`).classList.add('active');
                
                // Обновляем кнопки модального окна
                if (btn.dataset.tab === 'pay') {
                    modalConfirm.textContent = 'Оплатить';
                    modalConfirm.disabled = true;
                } else if (btn.dataset.tab === 'sayno') {
                    modalConfirm.textContent = 'Сказать НЕТ';
                    modalConfirm.disabled = false;
                }
            });
        });
        
        // Настройка кнопок модального окна
        modalConfirm.textContent = 'Оплатить';
        modalConfirm.disabled = true;
        
        modalCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        modalConfirm.addEventListener('click', () => {
            const activeTab = modalContent.querySelector('.tab-btn.active').dataset.tab;
            
            if (activeTab === 'pay') {
                const selectedCards = Array.from(modalContent.querySelectorAll('.payment-card.selected'))
                    .map(card => card.dataset.cardId);
                
                if (selectedCards.length === 0) {
                    alert('Выберите карты для оплаты!');
                    return;
                }
                
                this.socket.emit('respondToRent', {
                    type: 'pay',
                    cards: selectedCards
                });
            } else if (activeTab === 'sayno') {
                this.socket.emit('respondToRent', {
                    type: 'say_no'
                });
            }
            
            modal.classList.add('hidden');
        });
        
        modal.classList.remove('hidden');
    }

    hasSayNoCard() {
        const myPlayer = this.getMyPlayer();
        if (!myPlayer) return false;
        
        return myPlayer.hand.some(card => card.action === 'say_no');
    }

    handleGameUpdate(state) {
        this.gameState = state;
        
        // Проверяем, не требуется ли от нас ответ на ренту
        if (state.waitingForResponse === this.playerId && 
            state.pendingRent && 
            state.turnPhase === 'rent_response') {
            
            this.showRentResponseModal(state.pendingRent);
        }
        
        this.renderGame(state);
    }

    renderPaymentCards(requiredAmount) {
        const container = document.getElementById('payment-cards');
        if (!container) return;
        
        container.innerHTML = '';
        
        const myPlayer = this.getMyPlayer();
        if (!myPlayer) return;
        
        // Сортируем карты по типу и стоимости
        const allCards = [
            ...myPlayer.moneyBank.map(card => ({...card, source: 'bank'})),
            ...myPlayer.hand
                .filter(card => card.type === 'money' || card.value > 0)
                .map(card => ({...card, source: 'hand'}))
        ].sort((a, b) => (a.value || 0) - (b.value || 0));
        
        if (allCards.length === 0) {
            container.innerHTML = '<p class="no-cards">Нет карт для оплаты</p>';
            return;
        }
        
        allCards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'payment-card';
            cardDiv.dataset.cardId = card.id;
            cardDiv.dataset.value = card.value || 0;
            cardDiv.dataset.source = card.source;
            
            cardDiv.innerHTML = `
                <div class="card-preview ${card.type}">
                    <span class="card-name">${card.name}</span>
                    <span class="card-value">${card.value || 0}M</span>
                    ${card.source === 'bank' ? '<span class="card-source">🏦</span>' : ''}
                </div>
            `;
            
            cardDiv.addEventListener('click', () => {
                cardDiv.classList.toggle('selected');
                this.updatePaymentSummary(requiredAmount);
            });
            
            container.appendChild(cardDiv);
        });
    }
    
    showModal(title, content, callback, showCancel = false) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-content').innerHTML = content;
        document.getElementById('modal-overlay').classList.remove('hidden');
        this.modalCallback = callback;
        
        // Управляем видимостью кнопки "Отмена"
        const cancelBtn = document.getElementById('modal-cancel');
        if (showCancel) {
            cancelBtn.classList.remove('hidden');
        } else {
            cancelBtn.classList.add('hidden');
        }
    }

    updatePaymentSummary(requiredAmount) {
        const selectedCards = document.querySelectorAll('.payment-card.selected');
        const total = Array.from(selectedCards).reduce((sum, card) => {
            return sum + parseInt(card.dataset.value);
        }, 0);
        
        const modalConfirm = document.getElementById('modal-confirm');
        const selectedSum = document.getElementById('selected-sum');
        
        if (selectedSum) {
            selectedSum.textContent = total;
        }
        
        // Обновляем кнопку оплаты только если активна вкладка оплаты
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.dataset.tab === 'pay') {
            if (total >= requiredAmount) {
                modalConfirm.disabled = false;
                modalConfirm.textContent = `Оплатить ${total}M`;
            } else {
                modalConfirm.disabled = true;
                modalConfirm.textContent = `Недостаточно (${total}M)`;
            }
        }
    }
    
    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        this.modalCallback = null;
    }

    getColorName(color) {
        const colorNames = {
            'brown': 'Коричневый',
            'black': 'Чёрный',
            'red': 'Красный',
            'green': 'Зелёный',
            'orange': 'Оранжевый',
            'blue': 'Синий',
            'purple': 'Фиолетовый',
            'sand': 'Песочный',
            'yellow': 'Жёлтый',
            'lightblue': 'Голубой'
        };
        return colorNames[color] || color;
    }
}

const COMPLETE_SETS = {
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
};

const gameManager = new GameManager();
window.gameManager = gameManager;