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
   LOAD HISTORY
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


/* =========================
   SAVE HISTORY
========================= */

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

  const div = document.createElement("div");

  div.className =
    "message " +
    type +
    " " +
    extraClass;

  div.textContent = text;

  chat.appendChild(div);

  chat.scrollTop = chat.scrollHeight;

  return div;
}


/* =========================
   LOAD CHAT
========================= */

function loadChat() {

  chat.innerHTML = "";

  if (history.length === 0) {

    addMessage(
      "হ্যালো 👋 আমি Tuktuki AI।\nআমার সাথে চ্যাট করো!",
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

clearButton.addEventListener(
  "click",
  () => {

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


    /*
      বড় ছবি আটকানো
    */

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


  /*
    User message দেখানো
  */

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


  const typing =
    addMessage(
      "Tuktuki AI লিখছে...",
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


    addMessage(
      reply,
      "ai"
    );


    /*
      Text থাকলে history-তে রাখব
    */

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


    /*
      ছবি clear
    */

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
