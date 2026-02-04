// Update lobby screen
function updateLobby(data) {
    document.getElementById('displayGameCode').textContent = data.gameId;
    document.getElementById('playerCount').textContent = '1';
    document.getElementById('gameInfo').classList.remove('hidden');
    
    // Устанавливаем playerId в gameManager
    if (gameManager && data.playerId) {
        gameManager.setPlayerId(data.playerId);
    }
    
    // Hide the join/create form
    document.querySelector('.buttons').classList.add('hidden');
    document.querySelectorAll('.form-group').forEach(el => el.classList.add('hidden'));
    document.querySelector('.divider').classList.add('hidden');
}

// Update lobby with game state
function updateLobbyState(state) {
    if (!state) return;
    
    document.getElementById('displayGameCode').textContent = state.id;
    document.getElementById('playerCount').textContent = state.players.length;
    
    // Update players list
    const playersList = document.getElementById('playersListItems');
    if (playersList) {
        playersList.innerHTML = '';
        
        state.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            playersList.appendChild(li);
        });
    }
    
    // Show start button if enough players
    const startBtn = document.getElementById('startGameBtn');
    if (state.players.length >= 2) {
        startBtn.classList.remove('hidden');
    } else {
        startBtn.classList.add('hidden');
    }
}

// Switch to game screen
function switchToGameScreen() {
    console.log('Switching to game screen');
    document.getElementById('lobby').classList.remove('active');
    document.getElementById('game').classList.remove('hidden');
    document.getElementById('game').classList.add('active');
}

// Update game UI from socket manager
function updateGameUI(state) {
    console.log('updateGameUI called with state:', state);
    if (gameManager) {
        gameManager.updateGameState(state);
    } else {
        console.error('gameManager is not defined');
    }
}

// Show game over screen
function showGameOver(winner) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header" style="background-color: #48bb78;">
                <h3>🎉 Игра окончена! 🎉</h3>
            </div>
            <div class="modal-body" style="text-align: center; padding: 30px;">
                <h2>Победитель: ${winner.name}</h2>
                <p>Поздравляем!</p>
                <button id="newGameBtn" class="btn btn-primary" style="margin-top: 20px;">
                    Новая игра
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('newGameBtn').addEventListener('click', () => {
        location.reload();
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for selected items and players list
    const style = document.createElement('style');
    style.textContent = `
        .card.selected {
            border: 3px solid #667eea;
            transform: translateY(-10px);
        }
        
        .property-set.selected {
            border: 3px solid #667eea;
        }
        
        .modal-option {
            padding: 10px 15px;
            margin: 5px 0;
            background: #edf2f7;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .modal-option:hover {
            background: #e2e8f0;
        }
        
        .modal-option.selected {
            background: #667eea;
            color: white;
        }
        
        .color-option {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .color-sample {
            width: 20px;
            height: 20px;
            border-radius: 3px;
        }
        
        .payment-card-option {
            padding: 8px 12px;
            margin: 5px 0;
            background: #edf2f7;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .payment-card-option:hover {
            background: #e2e8f0;
        }
        
        .payment-card-option.selected {
            background: #48bb78;
            color: white;
        }
        
        .payment-card-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .card-source {
            font-size: 12px;
            color: #666;
            margin-left: 10px;
        }
        
        .payment-card-option.selected .card-source {
            color: rgba(255,255,255,0.8);
        }
        
        #payment-total {
            margin-top: 15px;
            padding: 10px;
            background: #f7fafc;
            border-radius: 5px;
            text-align: center;
            font-weight: bold;
        }
        
        .hand-count {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        
        .log-entry {
            padding: 5px 0;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }
        
        .log-entry:last-child {
            border-bottom: none;
        }
        
        #playersList {
            margin: 20px 0;
            padding: 15px;
            background: #f7fafc;
            border-radius: 8px;
        }
        
        #playersList h3 {
            margin-bottom: 10px;
            color: #333;
        }
        
        #playersListItems {
            list-style: none;
            padding: 0;
        }
        
        #playersListItems li {
            padding: 8px 12px;
            margin: 5px 0;
            background: white;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }
    `;
    document.head.appendChild(style);
});

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <h3>Ошибка</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">OK</button>
        </div>
    `;
    
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
    `;
    
    errorDiv.querySelector('.error-content').style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 400px;
        text-align: center;
    `;
    
    document.body.appendChild(errorDiv);
}

// Экспортируем функцию для использования в socket.js
window.showError = showError;