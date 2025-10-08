/**
 * Character Selection Functionality
 * Handles character selection UI and state management
 */

// Initialize character selection when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCharacterSelection();
});

function initializeCharacterSelection() {
    // Get UI elements
    const landingPage = document.getElementById('landingPage');
    const characterSelection = document.getElementById('characterSelection');
    const gameContainer = document.getElementById('gameContainer');
    const achievementsScreen = document.getElementById('achievementsScreen');
    
    const selectCharacterBtn = document.getElementById('selectCharacterBtn');
    const backFromCharacterBtn = document.getElementById('backFromCharacter');
    const startGameBtn = document.getElementById('startGameBtn');
    const achievementsBtn = document.getElementById('achievementsBtn');
    const backFromAchievementsBtn = document.getElementById('backFromAchievements');
    const mainMenuBtn = document.getElementById('mainMenuBtn');
    
    // Get all character cards
    const characterCards = document.querySelectorAll('.character-card');
    
    // Load saved character selection if it exists
    const savedCharacter = localStorage.getItem('selectedCharacter') || 'steve';
    
    // Highlight the saved character
    characterCards.forEach(card => {
        const characterName = card.getAttribute('data-character');
        if (characterName === savedCharacter) {
            card.classList.add('selected');
        }
    });
    
    // Character selection button - show character selection screen
    if (selectCharacterBtn) {
        selectCharacterBtn.addEventListener('click', function() {
            landingPage.classList.add('hidden');
            characterSelection.classList.remove('hidden');
        });
    }
    
    // Back from character selection
    if (backFromCharacterBtn) {
        backFromCharacterBtn.addEventListener('click', function() {
            characterSelection.classList.add('hidden');
            landingPage.classList.remove('hidden');
        });
    }
    
    // Achievements button
    if (achievementsBtn) {
        achievementsBtn.addEventListener('click', function() {
            landingPage.classList.add('hidden');
            achievementsScreen.classList.remove('hidden');
        });
    }
    
    // Back from achievements
    if (backFromAchievementsBtn) {
        backFromAchievementsBtn.addEventListener('click', function() {
            achievementsScreen.classList.add('hidden');
            landingPage.classList.remove('hidden');
        });
    }
    
    // Character card click handler
    characterCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove 'selected' class from all cards
            characterCards.forEach(c => c.classList.remove('selected'));
            
            // Add 'selected' class to clicked card
            card.classList.add('selected');
            
            // Get character name from data attribute
            const characterName = card.getAttribute('data-character');
            
            // Save selection to localStorage
            localStorage.setItem('selectedCharacter', characterName);
            
            // Update game state if it exists
            if (typeof gameState !== 'undefined') {
                gameState.setCharacter(characterName);
            }
            
            // Show visual feedback
            showCharacterSelectedFeedback(card, characterName);
        });
    });
    
    // Start game button
    if (startGameBtn) {
        startGameBtn.addEventListener('click', function() {
            const selectedCharacter = localStorage.getItem('selectedCharacter') || 'steve';
            
            // Hide landing page
            landingPage.classList.add('hidden');
            
            // Show game container
            gameContainer.classList.remove('hidden');
            
            // Initialize game with selected character
            if (typeof startGame === 'function') {
                startGame(selectedCharacter);
            }
        });
    }
    
    // Main menu button (return to landing page from game)
    if (mainMenuBtn) {
        mainMenuBtn.addEventListener('click', function() {
            gameContainer.classList.add('hidden');
            landingPage.classList.remove('hidden');
            
            // Pause/reset game if needed
            if (typeof pauseGame === 'function') {
                pauseGame();
            }
        });
    }
}

function showCharacterSelectedFeedback(card, characterName) {
    // Create a temporary feedback element
    const feedback = document.createElement('div');
    feedback.className = 'character-feedback';
    feedback.textContent = `${getCharacterDisplayName(characterName)} selected!`;
    feedback.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: #4CAF50;
        padding: 1rem 2rem;
        border-radius: 10px;
        font-size: 1.2rem;
        font-weight: bold;
        z-index: 10000;
        animation: fadeInOut 2s ease-in-out;
        pointer-events: none;
    `;
    
    document.body.appendChild(feedback);
    
    // Add pulse animation to card
    card.style.animation = 'pulse 0.5s ease-in-out';
    
    // Remove feedback after animation
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
        }
        card.style.animation = '';
    }, 2000);
}

function getCharacterDisplayName(characterName) {
    const names = {
        'steve': 'Steve',
        'alex': 'Alex',
        'miner': 'Miner',
        'builder': 'Builder'
    };
    return names[characterName] || characterName;
}

function getCharacterAttributes(characterName) {
    const characters = {
        steve: {
            name: 'Steve',
            speed: 1.0,
            scoreMultiplier: 1.0,
            specialAbility: 'balanced',
            description: 'The Classic Builder - Balanced stats for all-around gameplay',
            color: '#4A90E2'
        },
        alex: {
            name: 'Alex',
            speed: 1.15,
            scoreMultiplier: 0.95,
            specialAbility: 'fast_movement',
            description: 'The Adventurer - Faster movement, slightly lower score bonus',
            color: '#E94F37'
        },
        miner: {
            name: 'Miner',
            speed: 0.9,
            scoreMultiplier: 1.2,
            specialAbility: 'bonus_points',
            description: 'The Resource Master - Slower but earns 20% more points',
            color: '#F6C667'
        },
        builder: {
            name: 'Builder',
            speed: 0.85,
            scoreMultiplier: 1.0,
            specialAbility: 'clear_bonus',
            description: 'The Architect - Slowest but gets bonuses for clearing lines',
            color: '#52B788'
        }
    };
    return characters[characterName] || characters.steve;
}

// Add CSS animation for feedback
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
    
    .character-card {
        cursor: pointer;
        transition: transform 0.2s, border-color 0.2s;
        border: 3px solid transparent;
    }
    
    .character-card:hover {
        transform: translateY(-5px);
    }
    
    .character-card.selected {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.1);
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
`;
document.head.appendChild(style);

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.getCharacterAttributes = getCharacterAttributes;
    window.initializeCharacterSelection = initializeCharacterSelection;
}
