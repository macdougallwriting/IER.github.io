
document.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");
  const menuInput = document.getElementById("commandInput");

  const AI_ENDPOINT =
    "https://ai-terminal-backend.zander0506.workers.dev";

  // =========================
  // CHARACTER DATABASE
  // =========================

  const characters = {
    nathan: { name: "Nathan Chee", id: "nathan", level: 1 },
    alex: { name: "Alex Morgan", id: "alex", level: 1 },

    character01: { name: "Character 01", id: "character01", level: 1 },
    character02: { name: "Character 02", id: "character02", level: 1 },
    character03: { name: "Character 03", id: "character03", level: 1 },
    character04: { name: "Character 04", id: "character04", level: 1 },
    character05: { name: "Character 05", id: "character05", level: 1 },
    character06: { name: "Character 06", id: "character06", level: 1 },

    // Level 1 key holder: unlocks Level 2
    alex: {
      name: "Alex Morgan",
      id: "alex",
      level: 1,
      keyHolderFor: 2
    },

    character08: { name: "Character 08", id: "character08", level: 1 },
    character09: { name: "Character 09", id: "character09", level: 1 },
    character10: { name: "Character 10", id: "character10", level: 1 },
    character11: { name: "Character 11", id: "character11", level: 1 },
    character12: { name: "Character 12", id: "character12", level: 1 },

    // Level 2
    character13: { name: "Character 13", id: "character13", level: 2 },
    character14: { name: "Character 14", id: "character14", level: 2 },
    character15: { name: "Character 15", id: "character15", level: 2 },

    // Level 2 key holder: unlocks Level 3
    character16: {
      name: "Character 16",
      id: "character16",
      level: 2,
      keyHolderFor: 3
    },

    character17: { name: "Character 17", id: "character17", level: 2 },
    character18: { name: "Character 18", id: "character18", level: 2 },

    // Level 3
    character19: { name: "Character 19", id: "character19", level: 3 },

    // Level 3 key holder: unlocks Level 4
    character20: {
      name: "Character 20",
      id: "character20",
      level: 3,
      keyHolderFor: 4
    },

    character21: { name: "Character 21", id: "character21", level: 3 },

    // Level 4
    character22: { name: "Character 22", id: "character22", level: 4 }
  };

  let currentMode = "menu";
  let selectedCharacter = null;

  let typingTimeout = null;
  let waitingForAI = false;
  let requestId = 0;

  // =========================
  // STORAGE
  // =========================

  const STORAGE_KEY = "essence_repository_conversations";
  const PROGRESS_KEY = "essence_repository_progress";

  const MAX_MESSAGES = 100;

  function getUnlockedLevel() {
    try {
      const saved = Number(localStorage.getItem(PROGRESS_KEY) || 1);
      return Math.min(4, Math.max(1, saved));
    } catch {
      return 1;
    }
  }

  let unlockedLevel = getUnlockedLevel();

  function saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, String(unlockedLevel));
    } catch (error) {
      console.warn("Could not save progression:", error);
    }
  }

  // =========================
  // PERSISTENT CONVERSATIONS
  // =========================

  function loadConversations() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      const loaded = {};

      Object.keys(characters).forEach(id => {
        const history = Array.isArray(saved[id])
          ? saved[id]
          : [];

        loaded[id] = history
          .filter(message =>
            message &&
            ["user", "assistant"].includes(message.role) &&
            typeof message.content === "string"
          )
          .slice(-MAX_MESSAGES);
      });

      return loaded;

    } catch (error) {
      console.warn("Could not load saved conversations:", error);

      const empty = {};

      Object.keys(characters).forEach(id => {
        empty[id] = [];
      });

      return empty;
    }
  }

  let conversations = loadConversations();

  function saveConversations() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(conversations)
      );
    } catch (error) {
      console.warn("Could not save conversations:", error);
    }
  }

  // =========================
  // TYPING SYSTEM
  // =========================

  function typeText(text, speed = 10) {
    if (typingTimeout) clearTimeout(typingTimeout);

    output.textContent = "";

    let i = 0;

    function type() {
      if (i < text.length) {
        output.textContent += text.charAt(i);
        i++;

        typingTimeout = setTimeout(type, speed);
      }
    }

    type();
  }

  // =========================
  // MAIN MENU
  // =========================

  function showMenu() {
    requestId++;

    currentMode = "menu";
    selectedCharacter = null;
    waitingForAI = false;

    menuInput.disabled = false;
    menuInput.placeholder = "Type command + ENTER";

    typeText(`
INTERNAL ESSENCE REPOSITORY
RRJ INDUSTRIES

Available commands:

main repository

back
`);

    menuInput.focus();
  }

  // =========================
  // CHARACTER SELECTION
  // =========================

  function getAvailableCharacters() {
    return Object.values(characters).filter(
      character => character.level <= unlockedLevel
    );
  }

  function showCharacterMenu() {
    requestId++;

    currentMode = "characterSelect";
    selectedCharacter = null;
    waitingForAI = false;

    menuInput.disabled = false;
    menuInput.placeholder = "Enter instance name or password + ENTER";

    const characterList = getAvailableCharacters()
      .map(character => `- ${character.name}`)
      .join("\n");

    typeText(`
STORAGE

ACCESS LEVEL: ${unlockedLevel}

Available:

${characterList}

Enter name to establish connection.

Type 'back' to return.
`);

    menuInput.focus();
  }

  // =========================
  // CONNECT TO CHARACTER
  // =========================

  function connectCharacter(character) {
    if (character.level > unlockedLevel) {
      typeText("ACCESS DENIED.");
      return;
    }

    selectedCharacter = character;
    currentMode = "chat";

    menuInput.placeholder = "Enter message + ENTER";

    const history = conversations[character.id] || [];

    typeText(`
Establishing connection...
Instance identified: ${character.name}
Connection established.

${history.length > 0
  ? `Previous conversation restored (${history.length} messages).`
  : "No previous conversation found."}

You are now communicating with ${character.name}.

Type 'back' to disconnect.
`);

    menuInput.focus();
  }

  // =========================
  // PASSWORD VERIFICATION
  // =========================

  async function unlockAccess(password) {
    if (waitingForAI) return;

    if (!password.trim()) return;

    waitingForAI = true;
    menuInput.disabled = true;

    const thisRequest = ++requestId;

    output.textContent =
      "Verifying credentials...\n";

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "unlock",
          password: password.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Invalid password.");
      }

      if (thisRequest !== requestId) return;

      const newLevel = Number(data.unlockedLevel);

      if (
        !Number.isInteger(newLevel) ||
        newLevel < 2 ||
        newLevel > 4
      ) {
        throw new Error("Invalid access level returned by server.");
      }

      if (newLevel <= unlockedLevel) {
        typeText(`
ACCESS ALREADY GRANTED.

Current access level: ${unlockedLevel}
`);
      } else {
        unlockedLevel = newLevel;
        saveProgress();

        typeText(`
CREDENTIALS ACCEPTED.

Restricted archive access granted.

New access level: ${unlockedLevel}

Type 'main repository' to view available instances.
`);
      }

    } catch (error) {
      if (thisRequest !== requestId) return;

      typeText(`
ACCESS DENIED.

${error.message}
`);

    } finally {
      if (thisRequest === requestId) {
        waitingForAI = false;
        menuInput.disabled = false;
        menuInput.focus();
      }
    }
  }

  // =========================
  // COMMAND HANDLER
  // =========================

  function runCommand(cmd) {
    if (!cmd.trim()) return;

    const command = cmd.trim().toLowerCase();

    if (command === "back") {
      if (currentMode === "chat") {
        showCharacterMenu();
      } else {
        showMenu();
      }

      return;
    }

    if (currentMode === "chat") {
      sendAIMessage(cmd);
      return;
    }

    if (command === "main repository") {
      showCharacterMenu();
      return;
    }

    if (currentMode === "characterSelect") {
      const character = getAvailableCharacters().find(
        character => character.name.toLowerCase() === command
      );

      if (character) {
        connectCharacter(character);
      } else {
        // Also allow a password to be entered directly.
        unlockAccess(cmd.trim());
      }

      return;
    }

    // Allow direct password entry at the main menu.
    unlockAccess(cmd.trim());
  }

  // =========================
  // AI CHAT
  // =========================

  async function sendAIMessage(message) {
    if (waitingForAI || !selectedCharacter) return;

    const character = selectedCharacter;
    const history = conversations[character.id];

    waitingForAI = true;
    menuInput.disabled = true;

    output.textContent +=
      `\n\n> ${message}\n\n${character.name} is thinking...`;

    history.push({
      role: "user",
      content: message
    });

    if (history.length > MAX_MESSAGES) {
      history.splice(0, history.length - MAX_MESSAGES);
    }

    saveConversations();

    const thisRequest = ++requestId;

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          characterId: character.id,
          messages: history
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI request failed.");
      }

      if (!data.reply) {
        throw new Error("The AI returned an empty response.");
      }

      if (thisRequest !== requestId) return;

      history.push({
        role: "assistant",
        content: data.reply
      });

      if (history.length > MAX_MESSAGES) {
        history.splice(0, history.length - MAX_MESSAGES);
      }

      saveConversations();

      output.textContent = output.textContent.replace(
        `${character.name} is thinking...`,
        `${character.name}:\n${data.reply}`
      );

      output.textContent += "\n\n";

    } catch (error) {
      if (thisRequest !== requestId) return;

      history.pop();
      saveConversations();

      output.textContent = output.textContent.replace(
        `${character.name} is thinking...`,
        `ERROR: ${error.message}`
      );

      output.textContent += "\n\n";

    } finally {
      if (thisRequest === requestId) {
        waitingForAI = false;
        menuInput.disabled = false;
        menuInput.focus();
      }
    }
  }

  // =========================
  // BOOT SEQUENCE
  // =========================

  function bootSequence() {
    const bootText = `
Internal Essence Repository, RRJ Industries.
Initializing system...
Loading kernel modules...
Establishing secure connection...
Decrypting archives...
Mounting drives...
Access granted.

Welcome, user.
`;

    typeText(bootText, 20);

    setTimeout(() => showMenu(), 3000);
  }

  // =========================
  // ESC KEY
  // =========================

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      e.preventDefault();

      if (currentMode === "chat") {
        showCharacterMenu();
      } else {
        showMenu();
      }
    }
  });

  // =========================
  // TERMINAL INPUT
  // =========================

  menuInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (waitingForAI) return;

      const command = menuInput.value;
      menuInput.value = "";

      runCommand(command);
    }
  });

  // =========================
  // START
  // =========================

  menuInput.focus();
  bootSequence();
});
