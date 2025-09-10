// Configuration
const CONFIG = {
  password: "wordle123", // Change this to your desired password
  players: ["raehan", "omar", "mahir"],
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
};

let isUpdating = false; // Prevent concurrent updates
let autoRefreshInterval;
let updateQueue = []; // Queue for pending updates
let lastUpdateTime = 0; // Track last update time for debouncing

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  loadScores();
  displayRandomFunFact();
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
    const data = await response.json();
    console.log("📥 [LOAD] Server response:", data);

    if (data.success) {
      console.log(
        "📊 [LOAD] Before update - Current scores:",
        JSON.stringify(scores)
      );
      scores = data.scores;
      console.log(
        "📊 [LOAD] After update - New scores:",
        JSON.stringify(scores)
      );

      // Update the display
      CONFIG.players.forEach((player) => {
        document.getElementById(`${player}-score`).textContent =
          scores[player] || 0;
      });

      // Update last updated time
      if (data.lastUpdated) {
        updateLastUpdatedDisplay(data.lastUpdated);
      }

      updateLeaderboard();
    } else {
      console.error("Failed to load scores:", data.error);
      showModal("❌ Error", "Failed to load scores. Using offline mode.");
      loadScoresFromLocalStorage(); // Fallback to localStorage
    }
  } catch (error) {
    console.error("Network error:", error);
    showModal("🔌 Offline Mode", "Cannot connect to server. Using local data.");
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
      document.getElementById(`${player}-score`).textContent =
        scores[player] || 0;
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
  console.log(
    `🎯 [UPDATE] Starting update for ${player} with change ${change}`
  );

  // Debounce rapid clicks (minimum 500ms between updates)
  const now = Date.now();
  if (now - lastUpdateTime < 500) {
    console.log("⚡ [UPDATE] Debouncing rapid click");
    showModal("⚡ Too Fast", "Please wait a moment between updates...");
    return;
  }
  lastUpdateTime = now;

  // Prevent concurrent updates - queue the request if one is in progress
  if (isUpdating) {
    console.log("⏳ [UPDATE] Already updating, queueing request");
    updateQueue.push({ player, change });
    showModal("⏳ Please Wait", "Update queued. Processing...");
    return;
  }

  isUpdating = true;

  // Stop auto-refresh during update to prevent interference
  clearInterval(autoRefreshInterval);
  console.log("⏸️ [UPDATE] Auto-refresh stopped");

  // Get fresh scores from server before updating to avoid stale local state
  console.log("📥 [UPDATE] Getting fresh scores from server first...");
  try {
    const freshResponse = await fetch(
      `${CONFIG.apiUrl}/api/scores?t=${Date.now()}`,
      {
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
    const freshData = await freshResponse.json();
    if (freshData.success) {
      scores = freshData.scores; // Update local state with server state
      console.log(
        "📊 [UPDATE] Updated local scores with server state:",
        JSON.stringify(scores)
      );
      // Update display with fresh scores before making changes
      CONFIG.players.forEach((p) => {
        document.getElementById(`${p}-score`).textContent = scores[p] || 0;
      });
    }
  } catch (error) {
    console.log("⚠️ [UPDATE] Could not get fresh scores, using local state");
  }

  const oldScore = scores[player] || 0;
  const expectedNewScore = Math.max(0, oldScore + change);
  console.log(
    `📊 [UPDATE] Player: ${player}, Old: ${oldScore}, Change: ${change}, Expected: ${expectedNewScore}`
  );
  console.log(
    `📊 [UPDATE] Current scores before API call:`,
    JSON.stringify(scores)
  );

  try {
    showLoadingState(true);

    console.log(
      `📤 [UPDATE] Sending API request to update ${player} by ${change}`
    );
    const response = await fetch(
      `${CONFIG.apiUrl}/api/scores?t=${Date.now()}`,
      {
        method: "POST",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        body: JSON.stringify({
          player,
          change,
        }),
      }
    );

    const data = await response.json();
    console.log(`📥 [UPDATE] API Response:`, data);

    if (data.success) {
      console.log(
        `📊 [UPDATE] Server returned scores:`,
        JSON.stringify(data.scores)
      );
      console.log(
        `📊 [UPDATE] Before applying server response - local scores:`,
        JSON.stringify(scores)
      );

      // Verify the update was applied correctly
      const serverScore = data.scores[player];
      if (serverScore !== expectedNewScore) {
        console.warn(
          `⚠️ [UPDATE] Score mismatch! Expected: ${expectedNewScore}, Got: ${serverScore}`
        );
        // Show warning to user about potential sync issue
        showModal(
          "⚠️ Sync Warning", 
          `Score updated but there may be a sync issue. Expected: ${expectedNewScore}, Got: ${serverScore}`
        );
      }

      // Update local scores with server response
      scores = data.scores;
      console.log(
        `📊 [UPDATE] After applying server response - local scores:`,
        JSON.stringify(scores)
      );

      // Update ALL player displays to ensure consistency
      CONFIG.players.forEach((p) => {
        const displayValue = scores[p] || 0;
        document.getElementById(`${p}-score`).textContent = displayValue;
        console.log(`🖥️ [UPDATE] Updated display for ${p}: ${displayValue}`);
      });

      // Add animation to the updated player
      const scoreElement = document.getElementById(`${player}-score`);
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
      showModal(
        "✨ Score Updated!",
        data.message || `${playerName}'s score ${action}!`
      );
    } else {
      console.error(`❌ [UPDATE] Server returned error:`, data.error);
      showModal("❌ Update Failed", data.error || "Failed to update score");
    }
  } catch (error) {
    console.error(`🔌 [UPDATE] Network error:`, error);

    // Fallback to local update
    scores[player] = Math.max(0, oldScore + change);
    document.getElementById(`${player}-score`).textContent = scores[player];
    console.log(
      `🔌 [UPDATE] Fallback - updated ${player} locally to ${scores[player]}`
    );
    updateLeaderboard();
    saveScoresToLocalStorage();

    showModal(
      "🔌 Offline Update",
      "Score updated locally. Changes will sync when online."
    );
  } finally {
    console.log(`🔚 [UPDATE] Finishing update process for ${player}`);
    showLoadingState(false);
    isUpdating = false;
    console.log(`🔓 [UPDATE] isUpdating set to false`);

    // Update activity timestamp and restart auto-refresh
    updateActivity();
    startAutoRefresh();
    console.log("🔄 [UPDATE] Auto-refresh restarted");

    // Process any queued updates
    if (updateQueue.length > 0) {
      console.log(`📋 [UPDATE] Processing ${updateQueue.length} queued updates`);
      const nextUpdate = updateQueue.shift();
      setTimeout(() => updateScore(nextUpdate.player, nextUpdate.change), 100);
    }
  }
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

// Auto-refresh management - only when inactive
let lastActivity = Date.now();

function startAutoRefresh() {
  console.log("🔄 [REFRESH] Starting auto-refresh");
  clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    const timeSinceActivity = Date.now() - lastActivity;
    const timeSinceLastUpdate = Date.now() - lastUpdateTime;
    
    // Only refresh if:
    // 1. Not currently updating
    // 2. Inactive for 30 seconds
    // 3. At least 5 seconds since last update
    // 4. No pending updates in queue
    if (!isUpdating && 
        timeSinceActivity > 30000 && 
        timeSinceLastUpdate > 5000 && 
        updateQueue.length === 0) {
      console.log("🔄 [REFRESH] Auto-refresh triggered (safe conditions met)");
      loadScores();
    } else {
      const reason = isUpdating ? "update in progress" :
                   timeSinceActivity <= 30000 ? "recent activity" :
                   timeSinceLastUpdate <= 5000 ? "recent update" :
                   updateQueue.length > 0 ? "pending updates" : "unknown";
      console.log(`⏸️ [REFRESH] Skipping auto-refresh - ${reason}`);
    }
  }, 60000); // Check every 60 seconds
}

// Track user activity
function updateActivity() {
  lastActivity = Date.now();
  console.log("👆 [ACTIVITY] User activity detected");
}

// Add activity tracking to button clicks
document.addEventListener("click", updateActivity);

// Start auto-refresh initially
startAutoRefresh();
