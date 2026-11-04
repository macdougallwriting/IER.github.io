
document.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");
  const menuInput = document.getElementById("commandInput");

  const AI_ENDPOINT =
    "https://ai-terminal-backend.zander0506.workers.dev";

  let essays = {};
  let currentSubject = null;
  let currentMode = "menu";

  let typingTimeout = null;
  let isTyping = false;
  let conversationHistory = [];
  let waitingForAI = false;

  // =========================
  // TYPING SYSTEM
  // =========================

  function typeText(text, speed = 10) {
    if (typingTimeout) clearTimeout(typingTimeout);

    isTyping = true;
    output.textContent = "";

    let i = 0;

    function type() {
      if (i < text.length) {
        output.textContent += text.charAt(i);
        i++;
        typingTimeout = setTimeout(type, speed);
      } else {
        isTyping = false;
      }
    }

    type();
  }

  // =========================
  // COMMAND HANDLER
  // =========================

  function runCommand(cmd) {
    if (!cmd) return;

    cmd = cmd.trim();

    if (cmd.toLowerCase() === "back") {
      showMenu();
      return;
    }

    if (currentMode === "ai") {
      sendAIMessage(cmd);
      return;
    }

    if (currentSubject !== null) {
      const essayName = essays[currentSubject].find(
        name => name.toLowerCase() === cmd.toLowerCase()
      );

      if (essayName) {
        loadEssay(currentSubject, essayName);
      } else {
        typeText("Unknown command\n\nType 'back'");
      }

      return;
    }

    if (cmd.toLowerCase() === "ai test") {
      enterAIChat();
      return;
    }

    const subject = Object.keys(essays).find(
      name => name.toLowerCase() === cmd.toLowerCase()
    );

    if (subject) {
      showSubjectMenu(subject);
    } else {
      typeText("Unknown command\n\nType 'back'");
    }
  }

  // =========================
  // LOAD ESSAY
  // =========================

  function loadEssay(subject, essayName) {
    if (typingTimeout) clearTimeout(typingTimeout);

    isTyping = false;
    output.textContent = "";

    fetch(`essays/${subject}/${essayName}.txt`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.text();
      })
      .then(text => {
        currentSubject = subject;
        currentMode = "essay";
        displayEssay(text);
      })
      .catch(() => {
        typeText("Error: file not found\n\nType 'back'");
      });
  }

  // =========================
  // DISPLAY ESSAY
  // =========================

  function displayEssay(text) {
    output.textContent = "";

    let i = 0;
    isTyping = true;

    function type() {
      if (i < text.length) {
        output.textContent += text.charAt(i);
        i++;
        typingTimeout = setTimeout(type, 1);
      } else {
        isTyping = false;
      }
    }

    type();
  }

  // =========================
  // AI CHAT
  // =========================

  function enterAIChat() {
    if (typingTimeout) clearTimeout(typingTimeout);

    currentMode = "ai";
    currentSubject = null;
    conversationHistory = [];
    waitingForAI = false;

    typeText(`
AI TEST TERMINAL

Connection established.
Model: GLM 4.7 Flash

You are now connected to the AI.

Type a message and press ENTER.
Type 'back' to disconnect.
`);

    menuInput.placeholder = "Type message + ENTER";
    menuInput.focus();
  }

  async function sendAIMessage(message) {
    if (waitingForAI) return;

    waitingForAI = true;

    menuInput.disabled = true;

    output.textContent +=
      `\n\n> ${message}\n\nAI is thinking...`;

    conversationHistory.push({
      role: "user",
      content: message
    });

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
  messages: conversationHistory
})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI request failed.");
      }

      if (!data.reply) {
        throw new Error("The AI returned an empty response.");
      }

      conversationHistory.push({
        role: "assistant",
        content: data.reply
      });

      output.textContent = output.textContent.replace(
        "AI is thinking...",
        `AI:\n${data.reply}`
      );

      output.textContent += "\n\n";

    } catch (error) {
      output.textContent = output.textContent.replace(
        "AI is thinking...",
        `ERROR: ${error.message}`
      );

      output.textContent += "\n\n";

      // Remove the failed message from conversation history.
      conversationHistory.pop();
    }

    waitingForAI = false;
    menuInput.disabled = false;
    menuInput.focus();
  }

  // =========================
  // MENUS
  // =========================

  function showMenu() {
    if (typingTimeout) clearTimeout(typingTimeout);

    currentSubject = null;
    currentMode = "menu";
    waitingForAI = false;
    conversationHistory = [];

    menuInput.disabled = false;
    menuInput.placeholder = "Type command + ENTER";

    typeText(`
IER TERMINAL

Commands:

${Object.keys(essays).join("\n")}

ai test

Type 'back' anytime to return here
`);

    menuInput.focus();
  }

  function showSubjectMenu(subject) {
    currentSubject = subject;
    currentMode = "subject";

    const list = essays[subject].join("\n- ");

    typeText(`
${subject.toUpperCase()}

Type one of the following:

- ${list}

Type 'back' to return
`);

    menuInput.focus();
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
  // LOAD JSON INDEX
  // =========================

  fetch("essays/index.json")
    .then(res => res.json())
    .then(data => {
      essays = data;
      bootSequence();
    })
    .catch(() => {
      output.textContent = "Failed to load essays index.";
    });

  // =========================
  // ESC KEY
  // =========================

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      e.preventDefault();
      showMenu();
    }
  });

  // =========================
  // MENU / CHAT INPUT
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

  menuInput.focus();
});
