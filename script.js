// Configuration
const CONFIG = {
  password: "wordle123", // Change this to your desired password
  players: ["raehan", "omar", "mahir"],
  apiUrl: window.location.hostname === 'localhost' ? 'http://localhost:3000' : '',
  funFacts: [
    "The original Wordle was created by Josh Wardle for his partner!",
    "Wordle has only 2,315 possible solutions in its database!",
    "The best starting word statistically is 'CRANE' or 'SLATE'!",
    "Wordle was sold to The New York Times for over $1 million!",
    "Green squares are called 'correct', yellow are 'present'!",
    "Wordle's color scheme is inspired by classic games!",
    "Only 12,972 five-letter words are accepted as valid guesses!",
    "The game resets at midnight in your local time zone!",
  ],
};

// State management
let scores = {
  raehan: 0,
  omar: 0,
  mahir: 0,
};

let isUnlocked = false;

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  loadScores();
  displayRandomFunFact();

  // Add enter key support for password
  document
    .getElementById("admin-password")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        unlockControls();
      }
    });
});

// Load scores from API
async function loadScores() {
  try {
    showLoadingState(true);
    
    const response = await fetch(`${CONFIG.apiUrl}/api/scores`);
    const data = await response.json();

    if (data.success) {
      scores = data.scores;
      
      // Update the display
      CONFIG.players.forEach((player) => {
        document.getElementById(`${player}-score`).textContent = scores[player] || 0;
      });

      // Update last updated time
      if (data.lastUpdated) {
        updateLastUpdatedDisplay(data.lastUpdated);
      }

      updateLeaderboard();
    } else {
      console.error('Failed to load scores:', data.error);
      showModal('❌ Error', 'Failed to load scores. Using offline mode.');
      loadScoresFromLocalStorage(); // Fallback to localStorage
    }
  } catch (error) {
    console.error('Network error:', error);
    showModal('🔌 Offline Mode', 'Cannot connect to server. Using local data.');
    loadScoresFromLocalStorage(); // Fallback to localStorage
  } finally {
    showLoadingState(false);
  }
}

// Fallback function for offline mode
function loadScoresFromLocalStorage() {
  const savedScores = localStorage.getItem("wordleSquadScores");
  if (savedScores) {
    scores = JSON.parse(savedScores);
    CONFIG.players.forEach((player) => {
      document.getElementById(`${player}-score`).textContent = scores[player] || 0;
    });
  }
  
  const lastUpdated = localStorage.getItem("wordleSquadLastUpdated");
  if (lastUpdated) {
    updateLastUpdatedDisplay(lastUpdated);
  }
  
  updateLeaderboard();
}

// Save scores to localStorage (backup)
function saveScoresToLocalStorage() {
  localStorage.setItem("wordleSquadScores", JSON.stringify(scores));
  localStorage.setItem("wordleSquadLastUpdated", new Date().toISOString());
}

// Update a player's score
async function updateScore(player, change) {
  if (!isUnlocked) {
    showModal("🔒 Access Denied", "Please unlock the admin panel first!");
    return;
  }

  const oldScore = scores[player] || 0;
  
  try {
    showLoadingState(true);
    
    const response = await fetch(`${CONFIG.apiUrl}/api/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player,
        change,
        password: CONFIG.password
      })
    });

    const data = await response.json();

    if (data.success) {
      // Update local scores with server response
      scores = data.scores;
      
      // Update display with animation
      const scoreElement = document.getElementById(`${player}-score`);
      scoreElement.textContent = scores[player];
      scoreElement.classList.add("score-updated");

      // Remove animation class after animation completes
      setTimeout(() => {
        scoreElement.classList.remove("score-updated");
      }, 600);

      // Update leaderboard
      updateLeaderboard();
      
      // Update last updated time
      updateLastUpdatedDisplay(data.lastUpdated);

      // Save to localStorage as backup
      saveScoresToLocalStorage();

      // Show success message
      const action = change > 0 ? "increased" : "decreased";
      const playerName = player.charAt(0).toUpperCase() + player.slice(1);
      showModal("✨ Score Updated!", data.message || `${playerName}'s score ${action}!`);

    } else {
      showModal("❌ Update Failed", data.error || "Failed to update score");
    }
    
  } catch (error) {
    console.error('Network error:', error);
    
    // Fallback to local update
    scores[player] = Math.max(0, oldScore + change);
    document.getElementById(`${player}-score`).textContent = scores[player];
    updateLeaderboard();
    saveScoresToLocalStorage();
    
    showModal("🔌 Offline Update", "Score updated locally. Changes will sync when online.");
  } finally {
    showLoadingState(false);
  }

  // Auto-lock after 30 seconds of inactivity
  resetAutoLockTimer();
}

// Update leaderboard
function updateLeaderboard() {
  const leaderboardList = document.getElementById("leaderboard-list");

  // Create array of players with scores and sort
  const playerData = CONFIG.players
    .map((player) => ({
      name: player.charAt(0).toUpperCase() + player.slice(1),
      score: scores[player],
      player: player,
    }))
    .sort((a, b) => b.score - a.score);

  // Generate leaderboard HTML
  let html = "";
  playerData.forEach((player, index) => {
    const rankClass = `rank-${index + 1}`;
    const rankEmoji =
      index === 0
        ? "🥇"
        : index === 1
        ? "🥈"
        : index === 2
        ? "🥉"
        : `${index + 1}.`;

    html += `
            <div class="leaderboard-item ${rankClass}">
                <span class="leaderboard-rank">${rankEmoji}</span>
                <span class="leaderboard-name">${player.name}</span>
                <span class="leaderboard-score">${player.score}</span>
            </div>
        `;
  });

  leaderboardList.innerHTML = html;
}

// Toggle admin panel
function toggleAdminPanel() {
  const panel = document.getElementById("admin-panel");
  panel.classList.toggle("hidden");

  if (!panel.classList.contains("hidden")) {
    document.getElementById("admin-password").focus();
  }
}

// Unlock controls with password
async function unlockControls() {
  const passwordInput = document.getElementById("admin-password");
  const enteredPassword = passwordInput.value;

  if (!enteredPassword) {
    showModal("❌ Password Required", "Please enter a password.");
    return;
  }

  try {
    showLoadingState(true);
    
    const response = await fetch(`${CONFIG.apiUrl}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: enteredPassword
      })
    });

    const data = await response.json();

    if (data.success) {
      isUnlocked = true;

      // Show all controls
      document.querySelectorAll(".controls").forEach((control) => {
        control.classList.add("unlocked");
      });

      // Hide admin panel
      document.getElementById("admin-panel").classList.add("hidden");

      // Clear password
      passwordInput.value = "";

      // Show success message
      showModal(
        "🔓 Unlocked!",
        "You can now update scores. Controls will auto-lock after 2 minutes of inactivity."
      );

      // Auto-lock after 2 minutes
      startAutoLockTimer();

      // Visual feedback
      document.body.style.background =
        "linear-gradient(135deg, #10b981 0%, #059669 100%)";
      setTimeout(() => {
        document.body.style.background =
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)";
      }, 2000);

    } else {
      // Wrong password
      passwordInput.style.borderColor = "#ef4444";
      passwordInput.style.animation = "shake 0.5s ease-in-out";

      setTimeout(() => {
        passwordInput.style.borderColor = "#475569";
        passwordInput.style.animation = "";
      }, 500);

      showModal("❌ Wrong Password", data.error || "Please check your password and try again.");
    }
    
  } catch (error) {
    console.error('Network error:', error);
    
    // Fallback to local password check
    if (enteredPassword === CONFIG.password) {
      isUnlocked = true;
      document.querySelectorAll(".controls").forEach((control) => {
        control.classList.add("unlocked");
      });
      document.getElementById("admin-panel").classList.add("hidden");
      passwordInput.value = "";
      showModal("🔓 Unlocked (Offline)", "Controls unlocked in offline mode.");
      startAutoLockTimer();
    } else {
      showModal("❌ Wrong Password", "Please check your password and try again.");
    }
  } finally {
    showLoadingState(false);
  }
}

// Auto-lock functionality
let autoLockTimer;

function startAutoLockTimer() {
  clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(() => {
    lockControls();
    showModal("🔒 Auto-locked", "Controls have been locked due to inactivity.");
  }, 120000); // 2 minutes
}

function resetAutoLockTimer() {
  if (isUnlocked) {
    startAutoLockTimer();
  }
}

function lockControls() {
  isUnlocked = false;
  document.querySelectorAll(".controls").forEach((control) => {
    control.classList.remove("unlocked");
  });
  clearTimeout(autoLockTimer);
}

// Modal functions
function showModal(title, message) {
  document.getElementById("update-modal").querySelector("h3").textContent =
    title;
  document.getElementById("update-message").textContent = message;
  document.getElementById("update-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("update-modal").classList.add("hidden");
}

// Update last updated timestamp
function updateLastUpdatedDisplay(timestamp) {
  if (timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo;
    if (diffMins < 1) {
      timeAgo = "Just now";
    } else if (diffMins < 60) {
      timeAgo = `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      timeAgo = `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else {
      timeAgo = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    }

    document.getElementById("last-updated").textContent = timeAgo;
  }
}

// Show/hide loading state
function showLoadingState(isLoading) {
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    if (isLoading) {
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
    } else {
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
    }
  });
  
  if (isLoading) {
    document.body.style.cursor = 'wait';
  } else {
    document.body.style.cursor = '';
  }
}

// Display random fun fact
function displayRandomFunFact() {
  const randomFact =
    CONFIG.funFacts[Math.floor(Math.random() * CONFIG.funFacts.length)];
  document.getElementById(
    "fun-fact"
  ).textContent = `💡 Fun fact: ${randomFact}`;
}

// Close modal when clicking outside
document.getElementById("update-modal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeModal();
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  // ESC to close modal
  if (e.key === "Escape") {
    closeModal();
    document.getElementById("admin-panel").classList.add("hidden");
  }

  // Ctrl/Cmd + U to toggle admin panel
  if ((e.ctrlKey || e.metaKey) && e.key === "u") {
    e.preventDefault();
    toggleAdminPanel();
  }
});

// Add shake animation to CSS dynamically
const style = document.createElement("style");
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
        20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// Update fun fact every 30 seconds
setInterval(displayRandomFunFact, 30000);

// Refresh scores every 30 seconds to stay in sync
setInterval(() => {
  if (!isUnlocked) { // Only refresh when not actively editing
    loadScores();
  }
}, 30000);

// Reset auto-lock timer on any user interaction
document.addEventListener("click", resetAutoLockTimer);
document.addEventListener("keypress", resetAutoLockTimer);
