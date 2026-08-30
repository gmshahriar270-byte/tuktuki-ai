const chat = document.getElementById("chat");
const input = document.getElementById("message");
const sendButton = document.getElementById("send");
const clearButton = document.getElementById("clearChat");
const themeToggle = document.getElementById("themeToggle");

const imageButton = document.getElementById("imageButton");
const imageInput = document.getElementById("imageInput");
const imagePreviewArea = document.getElementById("imagePreviewArea");
const imagePreview = document.getElementById("imagePreview");
const removeImage = document.getElementById("removeImage");

const voiceButton = document.getElementById("voiceButton");

let history = [];
let selectedImage = null;


/* =========================
   HISTORY
========================= */

try {
  history = JSON.parse(
    localStorage.getItem("tuktuki_history") || "[]"
  );

  if (!Array.isArray(history)) {
    history = [];
  }
} catch (error) {
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

  const message = document.createElement("div");

  message.className =
    "message " +
    type +
    " " +
    extraClass;

  message.textContent = text;

  row.appendChild(message);
  chat.appendChild(row);

  chat.scrollTop = chat.scrollHeight;

  return row;
}


/* =========================
   AI MESSAGE WITH ACTIONS
========================= */

function addAIMessage(text) {

  const row = document.createElement("div");

  row.className = "message-row ai-row";

  const wrapper = document.createElement("div");

  wrapper.className = "ai-message-wrapper";

  const message = document.createElement("div");

  message.className = "message ai";

  message.textContent = text;

  wrapper.appendChild(message);


  /* ACTION BUTTONS */

  const actions = document.createElement("div");

  actions.className = "message-actions";


  /* COPY */

  const copyButton = document.createElement("button");

  copyButton.type = "button";
  copyButton.textContent = "📋 Copy";

  copyButton.addEventListener("click", async () => {

    try {

      await navigator.clipboard.writeText(text);

      copyButton.textContent = "✅ Copied";

      setTimeout(() => {
        copyButton.textContent = "📋 Copy";
      }, 1500);

    } catch (error) {

      copyButton.textContent = "❌ Copy failed";

      setTimeout(() => {
        copyButton.textContent = "📋 Copy";
      }, 1500);

    }

  });


  /* READ ALOUD */

  const speakButton = document.createElement("button");

  speakButton.type = "button";
  speakButton.textContent = "🔊 শুনুন";

  speakButton.addEventListener("click", () => {

    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {

      alert(
        "এই ব্রাউজারে Text-to-Speech চালু করা যাচ্ছে না। Chrome দিয়ে চেষ্টা করো।"
      );

      return;
    }

    try {

      speechSynthesis.cancel();

      const speech =
        new SpeechSynthesisUtterance(text);

      speech.lang = "bn-BD";
      speech.rate = 0.9;
      speech.pitch = 1;

      speakButton.textContent = "⏳ চালু হচ্ছে...";

      speech.onstart = () => {
        speakButton.textContent = "⏹️ বন্ধ";
      };

      speech.onend = () => {
        speakButton.textContent = "🔊 শুনুন";
      };

      speech.onerror = () => {

        speakButton.textContent = "🔊 শুনুন";

        alert(
          "ভয়েস চালু করা যায়নি। ফোনের Text-to-Speech সেটিংস পরীক্ষা করো।"
        );

      };

      speechSynthesis.speak(speech);

    } catch (error) {

      console.error("TTS Error:", error);

      speakButton.textContent = "🔊 শুনুন";

      alert("Text-to-Speech চালু করা যায়নি।");

    }

  });


  /* STOP VOICE */

  speakButton.addEventListener("dblclick", () => {

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      speakButton.textContent = "🔊 শুনুন";
    }

  });


  /* REGENERATE */

  const regenerateButton = document.createElement("button");

  regenerateButton.type = "button";
  regenerateButton.textContent = "🔄 আবার";

  regenerateButton.addEventListener("click", async () => {

    regenerateButton.disabled = true;
    regenerateButton.textContent = "⏳ অপেক্ষা...";

    try {

      const response = await fetch("/api/chat", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          message: text,
          history: history,
          image: null
        })

      });

      if (!response.ok) {
        throw new Error("Server error");
      }

      const data = await response.json();

      const newReply =
        data.reply ||
        "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";

      addAIMessage(newReply);

      history.push({
        role: "assistant",
        content: newReply
      });

      saveHistory();

    } catch (error) {

      console.error(
        "Regenerate Error:",
        error
      );

      alert(
        "আবার উত্তর তৈরি করা যায়নি।"
      );

    }

    regenerateButton.disabled = false;
    regenerateButton.textContent = "🔄 আবার";

  });


  actions.appendChild(copyButton);
  actions.appendChild(speakButton);
  actions.appendChild(regenerateButton);

  wrapper.appendChild(actions);

  row.appendChild(wrapper);

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

    addAIMessage(
      "হ্যালো 👋 আমি Tuktuki AI।\nআমার সাথে চ্যাট করো!"
    );

    return;
  }

  history.forEach(item => {

    if (item.role === "user") {

      addMessage(
        item.content,
        "user"
      );

    } else if (item.role === "assistant") {

      addAIMessage(
        item.content
      );

    }

  });

}


/* =========================
   CLEAR CHAT
========================= */

clearButton.addEventListener(
  "click",
  () => {

    const ok = confirm(
      "এই ডিভাইসের চ্যাট হিস্ট্রি মুছে ফেলতে চাও?"
    );

    if (!ok) {
      return;
    }

    history = [];

    localStorage.removeItem(
      "tuktuki_history"
    );

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }

    loadChat();

  }
);


/* =========================
   IMAGE SELECT
========================= */

imageButton.addEventListener(
  "click",
  () => {
    imageInput.click();
  }
);


imageInput.addEventListener(
  "change",
  event => {

    const file =
      event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {

      alert(
        "শুধু ছবি নির্বাচন করো।"
      );

      imageInput.value = "";

      return;
    }

    if (file.size > 7 * 1024 * 1024) {

      alert(
        "ছবিটি 7MB-এর কম হতে হবে।"
      );

      imageInput.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {

      selectedImage =
        reader.result;

      imagePreview.src =
        selectedImage;

      imagePreviewArea.style.display =
        "block";

    };

    reader.readAsDataURL(file);

  }
);


/* =========================
   REMOVE IMAGE
========================= */

removeImage.addEventListener(
  "click",
  () => {

    selectedImage = null;

    imagePreview.src = "";

    imageInput.value = "";

    imagePreviewArea.style.display =
      "none";

  }
);


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {

  const message =
    input.value.trim();

  if (!message && !selectedImage) {
    return;
  }


  if (message) {

    addMessage(
      message,
      "user"
    );

  } else {

    addMessage(
      "📷 ছবি পাঠানো হয়েছে",
      "user"
    );

  }


  input.value = "";

  sendButton.disabled = true;
  imageButton.disabled = true;
  voiceButton.disabled = true;


  const typing =
    addMessage(
      "Tuktuki AI লিখছে",
      "ai",
      "typing"
    );


  try {

    const response =
      await fetch(
        "/api/chat",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            message:
              message,

            history:
              history,

            image:
              selectedImage

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


    addAIMessage(reply);


    if (message) {

      history.push({

        role: "user",

        content: message

      });

    }


    history.push({

      role: "assistant",

      content: reply

    });


    saveHistory();


    selectedImage = null;

    imagePreview.src = "";

    imageInput.value = "";

    imagePreviewArea.style.display =
      "none";


  } catch (error) {

    console.error(
      "Chat Error:",
      error
    );


    typing.remove();


    addMessage(
      "দুঃখিত, সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করো।",
      "ai"
    );

  }


  sendButton.disabled = false;
  imageButton.disabled = false;
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
   ENTER
========================= */

input.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);


/* =========================
   DARK / LIGHT MODE
========================= */

const savedTheme =
  localStorage.getItem(
    "tuktuki_theme"
  );


if (savedTheme === "dark") {

  document.body.classList.add(
    "dark"
  );

  themeToggle.textContent = "☀️";

} else {

  themeToggle.textContent = "🌙";

}


themeToggle.addEventListener(
  "click",
  () => {

    document.body.classList.toggle(
      "dark"
    );

    const isDark =
      document.body.classList.contains(
        "dark"
      );

    localStorage.setItem(
      "tuktuki_theme",
      isDark
        ? "dark"
        : "light"
    );

    themeToggle.textContent =
      isDark
        ? "☀️"
        : "🌙";

  }
);


/* =========================
   VOICE INPUT
========================= */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


if (SpeechRecognition) {

  const recognition =
    new SpeechRecognition();

  recognition.lang = "bn-BD";
  recognition.continuous = false;
  recognition.interimResults = false;


  voiceButton.addEventListener(
    "click",
    () => {

      try {

        recognition.start();

        voiceButton.textContent =
          "🔴";

        voiceButton.classList.add(
          "listening"
        );

      } catch (error) {

        console.log(
          "Voice start:",
          error
        );

      }

    }
  );


  recognition.onresult =
    event => {

      const text =
        event.results[0][0].transcript;

      input.value += text;

      input.focus();

    };


  recognition.onend =
    () => {

      voiceButton.textContent =
        "🎤";

      voiceButton.classList.remove(
        "listening"
      );

    };


  recognition.onerror =
    error => {

      console.log(
        "Voice error:",
        error
      );

      voiceButton.textContent =
        "🎤";

      voiceButton.classList.remove(
        "listening"
      );

    };

} else {

  voiceButton.addEventListener(
    "click",
    () => {

      alert(
        "এই ব্রাউজারে Voice Input সমর্থিত নয়। Chrome দিয়ে চেষ্টা করো।"
      );

    }
  );

}


/* =========================
   START
========================= */

loadChat();

input.focus();
