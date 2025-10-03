// Configuration
const CONFIG = {
  password: "wordle123", // Change this to your desired password
  players: ["raehan", "omar", "mahir", "hadi", "fawaz"],
  apiUrl:
    window.location.hostname === "localhost" ? "http://localhost:3000" : "",
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
  hadi: 0,
  fawaz: 0,
};

// Fixed: Properly declare all variables
let isUpdating = false;
let lastUpdateTime = 0;
let lastActivity = Date.now();
let autoRefreshInterval;

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  loadScores();
  displayRandomFunFact();
  startAutoRefresh();
});

// Load scores from API
async function loadScores() {
  console.log("🔄 [LOAD] Starting loadScores...");
  try {
    showLoadingState(true);

    const response = await fetch(
      `${CONFIG.apiUrl}/api/scores?t=${Date.now()}`,
      {
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📥 [LOAD] Server response:", data);

    if (data.success) {
      console.log(
        "📊 [LOAD] Before update - Current scores:",
        JSON.stringify(scores)
      );
      scores = { ...data.scores }; // Create new object to avoid reference issues
      console.log(
        "📊 [LOAD] After update - New scores:",
        JSON.stringify(scores)
      );

      // Update the display
      updateScoreDisplays();

      // Update last updated time
      if (data.lastUpdated) {
        updateLastUpdatedDisplay(data.lastUpdated);
      }

      updateLeaderboard();
    } else {
      throw new Error(data.error || "Failed to load scores");
    }
  } catch (error) {
    console.error("❌ [LOAD] Error:", error);
    showModal("🔌 Offline Mode", "Cannot connect to server. Using local data.");
    loadScoresFromLocalStorage();
  } finally {
    showLoadingState(false);
  }
}

// Update all score displays
function updateScoreDisplays() {
  CONFIG.players.forEach((player) => {
    const element = document.getElementById(`${player}-score`);
    if (element) {
      element.textContent = scores[player] || 0;
    }
  });
}

// Fallback function for offline mode
function loadScoresFromLocalStorage() {
  const savedScores = localStorage.getItem("wordleSquadScores");
  if (savedScores) {
    try {
      scores = JSON.parse(savedScores);
      updateScoreDisplays();
    } catch (e) {
      console.error("Error parsing saved scores:", e);
    }
  }

  const lastUpdated = localStorage.getItem("wordleSquadLastUpdated");
  if (lastUpdated) {
    updateLastUpdatedDisplay(lastUpdated);
  }

  updateLeaderboard();
}

// Save scores to localStorage (backup)
function saveScoresToLocalStorage() {
  try {
    localStorage.setItem("wordleSquadScores", JSON.stringify(scores));
    localStorage.setItem("wordleSquadLastUpdated", new Date().toISOString());
  } catch (e) {
    console.error("Error saving to localStorage:", e);
  }
}

// Simplified and fixed update function
async function updateScore(player, change) {
  console.log(
    `🎯 [UPDATE] Starting update for ${player} with change ${change}`
  );

  // Simple debouncing - prevent rapid clicks
  const now = Date.now();
  if (now - lastUpdateTime < 500) {
    showModal("⚡ Too Fast", "Please wait a moment between updates...");
    return;
  }

  // Prevent concurrent updates
  if (isUpdating) {
    showModal("⏳ Please Wait", "Another update is in progress...");
    return;
  }

  isUpdating = true;
  lastUpdateTime = now;

  // Stop auto-refresh during update
  clearInterval(autoRefreshInterval);

  const originalScore = scores[player] || 0;
  const newScore = Math.max(0, originalScore + change);

  console.log(
    `📊 [UPDATE] Player: ${player}, Old: ${originalScore}, Change: ${change}, New: ${newScore}`
  );

  try {
    showLoadingState(true);

    console.log("📤 [UPDATE] Sending API request...");
    const response = await fetch(`${CONFIG.apiUrl}/api/scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({ player, change }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📥 [UPDATE] API Response:", data);

    if (data.success) {
      // Update with server response to ensure consistency
      scores = { ...data.scores };
      updateScoreDisplays();

      // Add visual feedback
      const scoreElement = document.getElementById(`${player}-score`);
      if (scoreElement) {
        scoreElement.classList.add("score-updated");
        setTimeout(() => scoreElement.classList.remove("score-updated"), 600);
      }

      updateLeaderboard();

      if (data.lastUpdated) {
        updateLastUpdatedDisplay(data.lastUpdated);
      }

      saveScoresToLocalStorage();

      const action = change > 0 ? "increased" : "decreased";
      const playerName = player.charAt(0).toUpperCase() + player.slice(1);
      showModal(
        "✅ Score Updated!",
        `${playerName}'s score ${action} successfully!`
      );
    } else {
      throw new Error(data.error || "Server returned error");
    }
  } catch (error) {
    console.error("❌ [UPDATE] Error:", error);

    // Fallback to local update for offline functionality
    scores[player] = newScore;
    updateScoreDisplays();
    updateLeaderboard();
    saveScoresToLocalStorage();

    showModal(
      "🔌 Offline Update",
      "Score updated locally. Changes will sync when online."
    );
  } finally {
    showLoadingState(false);
    isUpdating = false;
    updateActivity();

    // Restart auto-refresh with small delay
    setTimeout(() => startAutoRefresh(), 1000);
  }
}

// Update leaderboard
function updateLeaderboard() {
  const leaderboardList = document.getElementById("leaderboard-list");
  if (!leaderboardList) return;

  // Create array of players with scores and sort
  const playerData = CONFIG.players
    .map((player) => ({
      name: player.charAt(0).toUpperCase() + player.slice(1),
      score: scores[player] || 0,
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

// Modal functions
function showModal(title, message) {
  const modal = document.getElementById("update-modal");
  const titleEl = modal?.querySelector("h3");
  const messageEl = document.getElementById("update-message");

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (modal) modal.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("update-modal");
  if (modal) modal.classList.add("hidden");
}

// Update last updated timestamp
function updateLastUpdatedDisplay(timestamp) {
  const element = document.getElementById("last-updated");
  if (!element || !timestamp) return;

  try {
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

    element.textContent = timeAgo;
  } catch (e) {
    console.error("Error updating timestamp:", e);
  }
}

// Show/hide loading state
function showLoadingState(isLoading) {
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach((btn) => {
    if (isLoading) {
      btn.style.opacity = "0.6";
      btn.style.pointerEvents = "none";
    } else {
      btn.style.opacity = "";
      btn.style.pointerEvents = "";
    }
  });

  if (isLoading) {
    document.body.style.cursor = "wait";
  } else {
    document.body.style.cursor = "";
  }
}

// Display random fun fact
function displayRandomFunFact() {
  const factElement = document.getElementById("fun-fact");
  if (factElement) {
    const randomFact =
      CONFIG.funFacts[Math.floor(Math.random() * CONFIG.funFacts.length)];
    factElement.textContent = `💡 Fun fact: ${randomFact}`;
  }
}

// Close modal when clicking outside
const modal = document.getElementById("update-modal");
if (modal) {
  modal.addEventListener("click", function (e) {
    if (e.target === this) {
      closeModal();
    }
  });
}

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeModal();
  }
});

// Add CSS animation for score updates
const style = document.createElement("style");
style.textContent = `
  @keyframes scoreUpdate {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); background-color: #22c55e; }
    100% { transform: scale(1); }
  }
  .score-updated {
    animation: scoreUpdate 0.6s ease-in-out;
  }
`;
document.head.appendChild(style);

// Update fun fact every 30 seconds
setInterval(displayRandomFunFact, 30000);

// Simplified auto-refresh management
function startAutoRefresh() {
  console.log("🔄 [REFRESH] Starting auto-refresh");
  clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    const timeSinceActivity = Date.now() - lastActivity;

    // Only refresh if not updating and inactive for 60 seconds
    if (!isUpdating && timeSinceActivity > 60000) {
      console.log("🔄 [REFRESH] Auto-refresh triggered");
      loadScores();
    }
  }, 30000); // Check every 30 seconds
}

// Track user activity
function updateActivity() {
  lastActivity = Date.now();
  console.log("👆 [ACTIVITY] User activity detected");
}

// Add activity tracking to user interactions
document.addEventListener("click", updateActivity);
document.addEventListener("keypress", updateActivity);

// Start auto-refresh initially
startAutoRefresh();
