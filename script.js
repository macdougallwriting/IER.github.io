
document.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");
  const menuInput = document.getElementById("commandInput");

  const AI_ENDPOINT =
    "https://ai-terminal-backend.zander0506.workers.dev";

  const characters = {
    nathan: {
      name: "Nathan Chee",
      id: "nathan"
    },
  
   alex: {
    name: "Alex Morgan",
    id: "alex"
  }
};

  let currentMode = "menu";
  let selectedCharacter = null;

  let typingTimeout = null;
  let waitingForAI = false;
  let requestId = 0;

// PERSISTENT CONVERSATION STORAGE
const STORAGE_KEY = "essence_repository_conversations";
const MAX_MESSAGES = 100;

function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const loaded = {};

    // Automatically create a history for every character.
    Object.keys(characters).forEach(id => {
      const history = Array.isArray(saved[id]) ? saved[id] : [];

      loaded[id] = history
        .filter(message =>
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string"
        )
        .slice(-MAX_MESSAGES);
    });

    return loaded;

  } catch (error) {
    console.warn("Could not load saved conversations:", error);
    return {};
  }
}

let conversations = loadConversations();

// Save all character conversations to browser storage.
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

Type 'back' anytime to return.
`);

    menuInput.focus();
  }

  // =========================
  // CHARACTER SELECTION
  // =========================

  function showCharacterMenu() {
    requestId++;

    currentMode = "characterSelect";
    selectedCharacter = null;
    waitingForAI = false;

    menuInput.disabled = false;
    menuInput.placeholder = "Enter instance name + ENTER";

    typeText(`
CONSCIOUSNESS STORAGE

Available instances:

- Nathan Chee
- Alex Morgan

Enter an instance name to establish connection.
Type 'back' to return.
`);

    menuInput.focus();
  }

  function connectCharacter(character) {
    selectedCharacter = character;
    currentMode = "chat";

    menuInput.placeholder = "Enter message + ENTER";

    typeText(`
Establishing connection...
Instance identified: ${character.name}
Connection established.

You are now communicating with ${character.name}.

Type 'back' to disconnect.
`);

    menuInput.focus();
  }

  // =========================
  // COMMAND HANDLER
  // =========================

  function runCommand(cmd) {
    if (!cmd) return;

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

    if (currentMode === "characterSelect") {
      const character = Object.values(characters).find(
        character => character.name.toLowerCase() === command
      );

      if (character) {
        connectCharacter(character);
      } else {
        typeText(`
Unknown instance.

Available instances:

- Nathan Chee

Type 'back' to return.
`);
      }

      return;
    }

    if (command === "main repository") {
      showCharacterMenu();
      return;
    }

    typeText("Unknown command\n\nType 'back'");
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

    history.push({ role: "user", content: message });

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

      history.push({ role: "assistant", content: data.reply });

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
