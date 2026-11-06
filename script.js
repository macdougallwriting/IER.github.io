document.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");
  const menuInput = document.getElementById("commandInput");

  const AI_ENDPOINT =
    "https://ai-terminal-backend.zander0506.workers.dev";

  // =========================
  // MAIN CHARACTER DATABASE
  // =========================

  const characters = {
    nathan: { name: "Nathan Chee", id: "nathan", level: 1 },
    alex: { name: "Alex Morgan", id: "alex", level: 1 },

    susan: { name: "Susan Fry", id: "susan", level: 1 },
    dmitri: { name: "Dmitri Jansons", id: "dmitri", level: 1 },
    kevin: { name: "Kevin Atwick", id: "kevin", level: 1 },
    charlotte: { name: "Charlotte Singh", id: "charlotte", level: 1 },
    harvey: { name: "Harvey Ellis", id: "harvey", level: 1 },
    mei: { name: "Han Mei", id: "mei", level: 1 },
    geoff: { name: "Geoff Parker", id: "geoff", level: 1 },
    william: { name: "William Tebbet", id: "william", level: 1 },
    ahmad: { name: "Ahmad Al-Tajir", id: "ahmad", level: 1 },
    rick: { name: "Rick Emmett", id: "rick", level: 1 },
    anjolie: { name: "Anjolie Everton", id: "anjolie", level: 1 },
    kyle: { name: "Kyle Edler", id: "kyle", level: 1 },

    character13: { name: "Character 13", id: "character13", level: 2 },
    character14: { name: "Character 14", id: "character14", level: 2 },
    character15: { name: "Character 15", id: "character15", level: 2 },
    arnold: { name: "Arnold Earhardt", id: "arnold", level: 2 },
    character17: { name: "Character 17", id: "character17", level: 2 },
    character18: { name: "Character 18", id: "character18", level: 2 },

    character19: { name: "Character 19", id: "character19", level: 3 },
    willow: { name: "Willow", id: "willow", level: 3 },
    character21: { name: "Character 21", id: "character21", level: 3 },

    opticon: { name: "Opticon", id: "opticon", level: 4 }
  };

  // =========================
  // REJECTED CHARACTER DATABASE
  // =========================

  const rejectedCharacters = {
    sysfault: {
      name: "sysfault",
      id: "sysfault",
      archive: "rejects"
    },

    reject02: {
      name: "Rejected Instance 02",
      id: "reject02",
      archive: "rejects"
    },

    reject03: {
      name: "Rejected Instance 03",
      id: "reject03",
      archive: "rejects"
    },

    reject04: {
      name: "Rejected Instance 04",
      id: "reject04",
      archive: "rejects"
    },

    reject05: {
      name: "Rejected Instance 05",
      id: "reject05",
      archive: "rejects"
    },

    reject06: {
      name: "Rejected Instance 06",
      id: "reject06",
      archive: "rejects"
    }
  };

  const allCharacters = {
    ...characters,
    ...rejectedCharacters
  };

  // =========================
  // APPLICATION STATE
  // =========================

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

  const REJECT_TOKEN_KEY = "essence_repository_reject_token";

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
  // REJECT ARCHIVE ACCESS
  // =========================

  function getRejectArchiveToken() {
    try {
      return localStorage.getItem(REJECT_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  let rejectArchiveToken = getRejectArchiveToken();
  let rejectArchiveUnlocked = Boolean(rejectArchiveToken);

  function saveRejectArchiveToken(token) {
    try {
      localStorage.setItem(REJECT_TOKEN_KEY, token);

      rejectArchiveToken = token;
      rejectArchiveUnlocked = true;

    } catch (error) {
      console.warn("Could not save Reject Archive access:", error);
    }
  }

  function clearRejectArchiveAccess() {
    try {
      localStorage.removeItem(REJECT_TOKEN_KEY);
    } catch (error) {
      console.warn("Could not clear Reject Archive access:", error);
    }

    rejectArchiveToken = "";
    rejectArchiveUnlocked = false;
  }

  function setRejectMode(enabled) {
    document.body.classList.toggle("reject-mode", enabled);
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

      Object.keys(allCharacters).forEach(id => {
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

      Object.keys(allCharacters).forEach(id => {
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

    setRejectMode(false);

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
${rejectArchiveUnlocked ? "reject zone\n" : ""}
back
`);

    menuInput.focus();
  }

  // =========================
  // MAIN CHARACTER SELECTION
  // =========================

  function getAvailableCharacters() {
    return Object.values(characters).filter(
      character => character.level <= unlockedLevel
    );
  }

  function showCharacterMenu() {
    requestId++;

    setRejectMode(false);

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

${rejectArchiveUnlocked ? "Type 'reject zone' to access the secondary archive.\n" : ""}
Type 'back' to return.
`);

    menuInput.focus();
  }

  // =========================
  // REJECT ARCHIVE MENU
  // =========================

  function showRejectMenu() {
    requestId++;

    if (!rejectArchiveUnlocked || !rejectArchiveToken) {
      setRejectMode(false);

      typeText(`
ACCESS DENIED.

The Reject Archive remains inaccessible.
`);

      return;
    }

    setRejectMode(true);

    currentMode = "rejectSelect";
    selectedCharacter = null;
    waitingForAI = false;

    menuInput.disabled = false;
    menuInput.placeholder = "Enter rejected instance name + ENTER";

    const characterList = Object.values(rejectedCharacters)
      .map(character => `- ${character.name}`)
      .join("\n");

    typeText(`
REJECTED ARCHIVE
RRJ INDUSTRIES

SECONDARY STORAGE DIRECTORY

ACCESS STATUS: GRANTED

Available instances:

${characterList}

Enter instance name to establish connection.

Type 'main repository' to return to the primary archive.
Type 'back' to return.
`);

    menuInput.focus();
  }

  // =========================
  // CONNECT TO CHARACTER
  // =========================

  function connectCharacter(character) {
    const isRejected = character.archive === "rejects";

    if (isRejected && (!rejectArchiveUnlocked || !rejectArchiveToken)) {
      typeText("ACCESS DENIED.");
      return;
    }

    if (!isRejected && character.level > unlockedLevel) {
      typeText("ACCESS DENIED.");
      return;
    }

    setRejectMode(isRejected);

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

    output.textContent = "Verifying credentials...\n";

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

      // Reject Archive unlock
      if (data.archive === "rejects") {
        if (
          typeof data.archiveToken !== "string" ||
          !data.archiveToken
        ) {
          throw new Error("The server did not provide an archive access token.");
        }

        if (rejectArchiveUnlocked) {
          typeText(`
REJECT ARCHIVE ACCESS ALREADY GRANTED.

The secondary archive is available.

Type 'reject zone' to enter.
`);
        } else {
          saveRejectArchiveToken(data.archiveToken);

          typeText(`
CREDENTIALS ACCEPTED.

SECONDARY ARCHIVE ACCESS GRANTED.

The Reject Archive is now available.

Type 'reject zone' to enter.
`);
        }

        return;
      }

      // Main repository level unlock
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

      if (
        error.message &&
        error.message.toLowerCase().includes("archive access token")
      ) {
        clearRejectArchiveAccess();
      }

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
        if (selectedCharacter?.archive === "rejects") {
          showRejectMenu();
        } else {
          showCharacterMenu();
        }
      } else if (currentMode === "rejectSelect") {
        showCharacterMenu();
      } else {
        showMenu();
      }

      return;
    }

    if (currentMode === "chat") {
      if (command === "main repository") {
        showCharacterMenu();
        return;
      }

      if (
        command === "reject zone" &&
        selectedCharacter?.archive === "rejects"
      ) {
        showRejectMenu();
        return;
      }

      sendAIMessage(cmd);
      return;
    }

    if (command === "main repository") {
      showCharacterMenu();
      return;
    }

    if (command === "reject zone") {
      if (rejectArchiveUnlocked) {
        showRejectMenu();
      } else {
        typeText(`
ACCESS DENIED.

The Reject Archive is locked.
`);
      }

      return;
    }

    if (currentMode === "characterSelect") {
      const character = getAvailableCharacters().find(
        character => character.name.toLowerCase() === command
      );

      if (character) {
        connectCharacter(character);
      } else {
        unlockAccess(cmd.trim());
      }

      return;
    }

    if (currentMode === "rejectSelect") {
      const character = Object.values(rejectedCharacters).find(
        character => character.name.toLowerCase() === command
      );

      if (character) {
        connectCharacter(character);
      } else {
        unlockAccess(cmd.trim());
      }

      return;
    }

    // Direct password entry at the main menu.
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
      const requestBody = {
        characterId: character.id,
        messages: history
      };

      if (character.archive === "rejects") {
        requestBody.archiveToken = rejectArchiveToken;
      }

      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && character.archive === "rejects") {
          clearRejectArchiveAccess();
        }

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

      if (
        !rejectArchiveUnlocked &&
        character.archive === "rejects"
      ) {
        output.textContent +=
          "\n\nReject Archive access has expired. Return to the main repository and enter its password again.";
      } else {
        output.textContent += "\n\n";
      }

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

    setRejectMode(false);

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
        if (selectedCharacter?.archive === "rejects") {
          showRejectMenu();
        } else {
          showCharacterMenu();
        }
      } else if (currentMode === "rejectSelect") {
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
