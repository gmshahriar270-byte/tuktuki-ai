const chat = document.getElementById("chat");
const input = document.getElementById("message");
const sendButton = document.getElementById("send");
const clearButton = document.getElementById("clearChat");
const themeToggle = document.getElementById("themeToggle");
const voiceButton = document.getElementById("voiceButton");

/* =========================
   THEME
========================= */

const savedTheme = localStorage.getItem("tuktuki_theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  localStorage.setItem(
    "tuktuki_theme",
    isDark ? "dark" : "light"
  );

  themeToggle.textContent =
    isDark ? "☀️" : "🌙";
});

/* =========================
   CHAT MEMORY
========================= */

let history = [];

try {
  history = JSON.parse(
    localStorage.getItem("tuktuki_history") || "[]"
  );

  if (!Array.isArray(history)) {
    history = [];
  }
} catch {
  history = [];
}

function saveHistory() {
  localStorage.setItem(
    "tuktuki_history",
    JSON.stringify(history)
  );
}

/* =========================
   ADD MESSAGE
========================= */

function addMessage(text, type, extraClass = "") {
  const row = document.createElement("div");

  row.className =
    "message-row " +
    (type === "user" ? "user-row" : "ai-row");

  const div = document.createElement("div");

  div.className =
    "message " +
    type +
    " " +
    extraClass;

  div.textContent = text;

  row.appendChild(div);
  chat.appendChild(row);

  chat.scrollTop = chat.scrollHeight;

  return row;
}

/* =========================
   LOAD CHAT
========================= */

function loadChat() {
  chat.innerHTML = "";

  if (history.length === 0) {
    addMessage(
      "হ্যালো 👋\nআমি Tuktuki AI।\nআমার সাথে চ্যাট করো!",
      "ai"
    );

    return;
  }

  history.forEach(item => {
    if (
      item.role === "user" ||
      item.role === "assistant"
    ) {
      addMessage(
        item.content,
        item.role === "user"
          ? "user"
          : "ai"
      );
    }
  });
}

/* =========================
   CLEAR CHAT
========================= */

clearButton.addEventListener("click", () => {
  const confirmClear = confirm(
    "এই ডিভাইসের চ্যাট হিস্ট্রি মুছে ফেলতে চাও?"
  );

  if (!confirmClear) {
    return;
  }

  history = [];

  localStorage.removeItem(
    "tuktuki_history"
  );

  loadChat();
});

/* =========================
   VOICE INPUT
========================= */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();

  recognition.lang = "bn-BD";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;

    voiceButton.classList.add(
      "listening"
    );

    voiceButton.textContent = "🔴";
  };

  recognition.onresult = event => {
    let finalText = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      finalText +=
        event.results[i][0].transcript;
    }

    input.value = finalText;
  };

  recognition.onerror = event => {
    console.log(
      "Voice recognition:",
      event.error
    );

    isListening = false;

    voiceButton.classList.remove(
      "listening"
    );

    voiceButton.textContent = "🎤";
  };

  recognition.onend = () => {
    isListening = false;

    voiceButton.classList.remove(
      "listening"
    );

    voiceButton.textContent = "🎤";

    input.focus();
  };

  voiceButton.addEventListener(
    "click",
    () => {
      if (isListening) {
        recognition.stop();
        return;
      }

      try {
        recognition.start();
      } catch (error) {
        console.log(error);
      }
    }
  );

} else {
  voiceButton.addEventListener(
    "click",
    () => {
      alert(
        "এই ব্রাউজারে Voice Input সমর্থিত নয়। Chrome ব্যবহার করে চেষ্টা করো।"
      );
    }
  );
}

/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {
  const message = input.value.trim();

  if (!message) {
    return;
  }

  if (isListening && recognition) {
    recognition.stop();
  }

  addMessage(
    message,
    "user"
  );

  input.value = "";

  sendButton.disabled = true;
  input.disabled = true;
  voiceButton.disabled = true;

  const typing = addMessage(
    "Tuktuki AI লিখছে",
    "ai",
    "typing"
  );

  try {
    const response = await fetch(
      "/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          message: message,
          history: history
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        "Server error: " +
        response.status
      );
    }

    const data =
      await response.json();

    typing.remove();

    const reply =
      data.reply ||
      "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";

    addMessage(
      reply,
      "ai"
    );

    history.push({
      role: "user",
      content: message
    });

    history.push({
      role: "assistant",
      content: reply
    });

    saveHistory();

  } catch (error) {
    typing.remove();

    addMessage(
      "দুঃখিত 😥 সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করো।",
      "ai"
    );

    console.error(error);
  }

  sendButton.disabled = false;
  input.disabled = false;
  voiceButton.disabled = false;

  input.focus();
}

/* =========================
   SEND BUTTON
========================= */

sendButton.addEventListener(
  "click",
  sendMessage
);

/* =========================
   ENTER KEY
========================= */

input.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter" &&
      !sendButton.disabled
    ) {
      sendMessage();
    }
  }
);

/* =========================
   START APP
========================= */

loadChat();
