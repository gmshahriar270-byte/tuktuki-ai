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
   NORMAL MESSAGE
========================= */

function addMessage(text, type, extraClass = "") {
  const row = document.createElement("div");

  row.className =
    "message-row " +
    (type === "user" ? "user-row" : "ai-row");

  const box = document.createElement("div");

  box.className =
    "message " +
    type +
    " " +
    extraClass;

  box.textContent = text;

  row.appendChild(box);
  chat.appendChild(row);

  chat.scrollTop = chat.scrollHeight;

  return row;
}


/* =========================
   AI MESSAGE
========================= */

function addAIMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row ai-row";

  const wrapper = document.createElement("div");
  wrapper.className = "ai-message-wrapper";

  const box = document.createElement("div");
  box.className = "message ai";
  box.textContent = text;

  wrapper.appendChild(box);

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

    } catch {
      try {
        const area = document.createElement("textarea");

        area.value = text;

        document.body.appendChild(area);

        area.select();

        document.execCommand("copy");

        area.remove();

        copyButton.textContent = "✅ Copied";

        setTimeout(() => {
          copyButton.textContent = "📋 Copy";
        }, 1500);

      } catch {
        copyButton.textContent = "❌ Copy failed";

        setTimeout(() => {
          copyButton.textContent = "📋 Copy";
        }, 1500);
      }
    }
  });


  /* =========================
     READ ALOUD
  ========================= */

  const speakButton =
    document.createElement("button");

  speakButton.type = "button";
  speakButton.textContent = "🔊 শুনুন";

  speakButton.addEventListener("click", () => {

    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      alert(
        "এই ব্রাউজারে Text-to-Speech চালু করা যাচ্ছে না।"
      );
      return;
    }

    try {

      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();

        speakButton.textContent = "🔊 শুনুন";

        return;
      }

      const speech =
        new SpeechSynthesisUtterance(text);

      speech.lang = "bn-BD";
      speech.rate = 0.9;
      speech.pitch = 1;

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

      speechSynthesis.cancel();
      speechSynthesis.speak(speech);

    } catch (error) {

      console.error("TTS Error:", error);

      speakButton.textContent = "🔊 শুনুন";

      alert(
        "Text-to-Speech চালু করা যায়নি।"
      );
    }
  });


  /* =========================
     REGENERATE
  ========================= */

  const regenerateButton =
    document.createElement("button");

  regenerateButton.type = "button";
  regenerateButton.textContent = "🔄 আবার";

  regenerateButton.addEventListener(
    "click",
    async () => {

      const previousUser =
        [...history]
          .reverse()
          .find(item => item.role === "user");

      if (!previousUser) {
        return;
      }

      regenerateButton.disabled = true;

      const typing =
        addMessage(
          "Tuktuki AI লিখছে...",
          "ai",
          "typing"
        );

      try {

        const response =
          await fetch("/api/chat", {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message:
                previousUser.content,

              history:
                history
            })
          });

        if (!response.ok) {
          throw new Error(
            "Server error " +
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

        history.push({
          role: "assistant",
          content: reply
        });

        saveHistory();

      } catch (error) {

        console.error(
          "Regenerate Error:",
          error
        );

        typing.remove();

        addMessage(
          "দুঃখিত, আবার উত্তর তৈরি করা যায়নি।",
          "ai"
        );
      }

      regenerateButton.disabled = false;
    }
  );


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
      "হ্যালো 👋 আমি Tuktuki AI\nআমার সাথে চ্যাট করো!"
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

    const ok =
      confirm(
        "এই ডিভাইসের চ্যাট হিস্ট্রি মুছে ফেলতে চাও?"
      );

    if (!ok) {
      return;
    }

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }

    history = [];

    localStorage.removeItem(
      "tuktuki_history"
    );

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


/* =========================
   IMAGE CHANGE
========================= */

imageInput.addEventListener(
  "change",
  event => {

    const file =
      event.target.files &&
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

      if (
        typeof reader.result !== "string" ||
        !reader.result.startsWith("data:image/")
      ) {

        alert(
          "ছবির preview তৈরি করা যায়নি।"
        );

        return;
      }

      selectedImage =
        reader.result;

      imagePreview.src =
        selectedImage;

      imagePreview.alt =
        "Selected image";

      imagePreview.style.display =
        "block";

      imagePreviewArea.style.display =
        "block";
    };

    reader.onerror = () => {

      alert(
        "ছবি পড়তে সমস্যা হয়েছে। আবার চেষ্টা করো।"
      );
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

    imagePreview.removeAttribute("src");

    imagePreview.alt = "";

    imagePreview.style.display =
      "none";

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

  const imageToSend =
    selectedImage;

  const typing =
    addMessage(
      "Tuktuki AI লিখছে...",
      "ai",
      "typing"
    );

  try {

    const response =
      await fetch("/api/chat", {
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
            imageToSend
        })
      });

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

    imagePreview.removeAttribute("src");

    imagePreview.alt = "";

    imagePreview.style.display =
      "none";

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
   ENTER KEY
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
   DARK / LIGHT
========================= */

const savedTheme =
  localStorage.getItem(
    "tuktuki_theme"
  );

if (savedTheme === "dark") {

  document.body.classList.add(
    "dark"
  );

  themeToggle.textContent =
    "☀️";

} else {

  themeToggle.textContent =
    "🌙";
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

  recognition.lang =
    "bn-BD";

  recognition.continuous =
    false;

  recognition.interimResults =
    false;

  voiceButton.addEventListener(
    "click",
    () => {

      try {

        recognition.start();

        voiceButton.textContent =
          "🔴";

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

      input.value +=
        text;

      input.focus();
    };

  recognition.onend =
    () => {

      voiceButton.textContent =
        "🎤";
    };

  recognition.onerror =
    () => {

      voiceButton.textContent =
        "🎤";
    };

} else {

  voiceButton.addEventListener(
    "click",
    () => {

      alert(
        "এই ব্রাউজারে Voice Input সমর্থিত নয়।"
      );
    }
  );
}


/* =========================
   START
========================= */

loadChat();

input.focus();

/* =========================================
   TUKTUKI AI - FEMALE BANGLA VOICE
========================================= */

(function () {

  if (!("speechSynthesis" in window)) {
    console.warn("এই browser-এ Text-to-Speech নেই।");
    return;
  }

  let voices = [];

  function loadVoices() {
    voices = speechSynthesis.getVoices();
  }

  loadVoices();

  speechSynthesis.onvoiceschanged = loadVoices;

  function getFemaleBanglaVoice() {

    const banglaVoices = voices.filter(v =>
      /^bn(-|_)/i.test(v.lang) ||
      /bangla|bengali/i.test(v.name)
    );

    const femaleWords =
      /female|woman|girl|zira|sabiha|sadia|tania|samantha|google বাংলা|google bengali/i;

    return (
      banglaVoices.find(v => femaleWords.test(v.name)) ||
      banglaVoices.find(v => /female|woman|girl/i.test(v.name)) ||
      banglaVoices[0] ||
      voices.find(v => /^bn/i.test(v.lang)) ||
      voices.find(v => /bengali|bangla/i.test(v.name)) ||
      voices[0]
    );
  }

  function speakTuktuki(text, button) {

    if (!text || !text.trim()) return;

    speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    const voice = getFemaleBanglaVoice();

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "bn-BD";
    } else {
      utterance.lang = "bn-BD";
    }

    utterance.rate = 0.92;
    utterance.pitch = 1.08;
    utterance.volume = 1;

    if (button) {
      button.textContent = "⏹️ বন্ধ";

      utterance.onend = function () {
        button.textContent = "🔊 শুনুন";
      };

      utterance.onerror = function () {
        button.textContent = "🔊 শুনুন";
      };
    }

    speechSynthesis.speak(utterance);
  }

  /* পুরোনো শুনুন button-এর click-ও override করা হবে */
  document.addEventListener(
    "click",
    function (event) {

      const button =
        event.target.closest("button");

      if (!button) return;

      const buttonText =
        button.textContent.trim();

      if (
        buttonText.includes("শুনুন") ||
        buttonText.includes("বন্ধ")
      ) {

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
          button.textContent = "🔊 শুনুন";
          return;
        }

        /*
          AI message bubble থেকে text নেওয়া
        */
        const message =
          button.closest(".message") ||
          button.parentElement;

        if (!message) return;

        const clone =
          message.cloneNode(true);

        clone
          .querySelectorAll("button")
          .forEach(b => b.remove());

        const text =
          clone.textContent
            .replace(/🔊\s*শুনুন/g, "")
            .replace(/⏹️\s*বন্ধ/g, "")
            .trim();

        speakTuktuki(text, button);
      }

    },
    true
  );

  console.log(
    "✅ Tuktuki AI Female Voice চালু হয়েছে"
  );

})();

