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
let lastUserMessage = "";
let isGenerating = false;


/* =========================
   HISTORY
========================= */

function loadHistory() {
  try {
    const saved = localStorage.getItem("tuktuki_history");
    history = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(history)) {
      history = [];
    }
  } catch (error) {
    console.log("History load error:", error);
    history = [];
  }
}

function saveHistory() {
  localStorage.setItem(
    "tuktuki_history",
    JSON.stringify(history)
  );
}


/* =========================
   MESSAGE
========================= */

function addMessage(text, type, typing = false) {

  const row = document.createElement("div");

  row.className =
    type === "user"
      ? "message-row user-row"
      : "message-row ai-row";


  if (type === "ai") {

    const avatar = document.createElement("div");

    avatar.className = "ai-avatar";

    const img = document.createElement("img");

    img.src = "/icon-192.png";
    img.alt = "Tuktuki AI";

    avatar.appendChild(img);
    row.appendChild(avatar);
  }


  const content =
    document.createElement("div");

  content.className =
    "message-content";


  const bubble =
    document.createElement("div");

  bubble.className =
    "message " +
    type +
    (typing ? " typing" : "");

  bubble.textContent = text;

  content.appendChild(bubble);


  if (
    type === "ai" &&
    !typing &&
    text
  ) {

    const actions =
      document.createElement("div");

    actions.className =
      "message-actions";


    /* COPY */

    const copy =
      document.createElement("button");

    copy.type = "button";
    copy.className = "message-action";
    copy.textContent = "📋 Copy";

    copy.onclick = async () => {

      try {

        await navigator.clipboard.writeText(
          text
        );

        copy.textContent =
          "✅ Copied";

        setTimeout(() => {
          copy.textContent =
            "📋 Copy";
        }, 1500);

      } catch {

        copy.textContent =
          "❌ Failed";

        setTimeout(() => {
          copy.textContent =
            "📋 Copy";
        }, 1500);
      }
    };


    /* SPEAK */

    const speak =
      document.createElement("button");

    speak.type = "button";
    speak.className = "message-action";
    speak.textContent = "🔊 শুনুন";

    speak.onclick = () => {

      if (
        !("speechSynthesis" in window)
      ) {

        alert(
          "এই ব্রাউজারে Text-to-Speech নেই।"
        );

        return;
      }

      window.speechSynthesis.cancel();

      const speech =
        new SpeechSynthesisUtterance(text);

      speech.lang = "bn-BD";
      speech.rate = 0.95;
      speech.pitch = 1;

      window.speechSynthesis.speak(
        speech
      );
    };


    /* REGENERATE */

    const regenerate =
      document.createElement("button");

    regenerate.type = "button";
    regenerate.className =
      "message-action";

    regenerate.textContent =
      "🔄 আবার তৈরি";

    regenerate.onclick = () => {
      regenerateResponse();
    };


    actions.appendChild(copy);
    actions.appendChild(speak);
    actions.appendChild(regenerate);

    content.appendChild(actions);
  }


  row.appendChild(content);

  chat.appendChild(row);

  chat.scrollTop =
    chat.scrollHeight;

  return row;
}


/* =========================
   IMAGE MESSAGE
========================= */

function addUserImage(image) {

  const row =
    document.createElement("div");

  row.className =
    "message-row user-row";


  const content =
    document.createElement("div");

  content.className =
    "message-content";


  const bubble =
    document.createElement("div");

  bubble.className =
    "message user image-message";


  const img =
    document.createElement("img");

  img.src = image;
  img.alt = "Sent image";

  bubble.appendChild(img);

  content.appendChild(bubble);

  row.appendChild(content);

  chat.appendChild(row);

  chat.scrollTop =
    chat.scrollHeight;
}


/* =========================
   WELCOME
========================= */

function showWelcome() {

  addMessage(
    "হ্যালো 👋\nআমি Tuktuki AI। কী জানতে চাও?",
    "ai"
  );
}


/* =========================
   LOAD CHAT
========================= */

function loadChat() {

  chat.innerHTML = "";

  if (history.length === 0) {

    showWelcome();

    return;
  }


  history.forEach(item => {

    if (
      item.role === "user" ||
      item.role === "assistant"
    ) {

      addMessage(
        item.content || "",
        item.role === "user"
          ? "user"
          : "ai"
      );
    }
  });


  const lastUser =
    [...history]
      .reverse()
      .find(
        item => item.role === "user"
      );

  if (lastUser) {
    lastUserMessage =
      lastUser.content;
  }
}


/* =========================
   CLEAR CHAT
========================= */

clearButton.addEventListener(
  "click",
  () => {

    if (
      !confirm(
        "সব চ্যাট ইতিহাস মুছে ফেলতে চাও?"
      )
    ) {
      return;
    }

    history = [];

    lastUserMessage = "";

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

    if (isGenerating) {
      return;
    }

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

async function sendMessage(
  customMessage = null
) {

  if (isGenerating) {
    return;
  }


  const message =
    customMessage !== null
      ? customMessage.trim()
      : input.value.trim();


  const image =
    selectedImage;


  if (!message && !image) {
    return;
  }


  isGenerating = true;

  sendButton.disabled = true;
  imageButton.disabled = true;
  voiceButton.disabled = true;


  if (message) {

    addMessage(
      message,
      "user"
    );
  }


  if (image) {

    addUserImage(
      image
    );
  }


  if (message) {
    lastUserMessage =
      message;
  }


  if (customMessage === null) {
    input.value = "";
  }


  const typing =
    addMessage(
      "Tuktuki AI লিখছে",
      "ai",
      true
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
              image
          })
        }
      );


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


    addMessage(
      reply,
      "ai"
    );


    if (message) {

      history.push({

        role: "user",

        content:
          message
      });
    }


    history.push({

      role: "assistant",

      content:
        reply
    });


    if (history.length > 100) {

      history =
        history.slice(-100);
    }


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


  isGenerating = false;

  sendButton.disabled = false;
  imageButton.disabled = false;
  voiceButton.disabled = false;

  input.focus();
}


/* =========================
   REGENERATE
========================= */

async function regenerateResponse() {

  if (isGenerating) {
    return;
  }


  if (!lastUserMessage) {

    alert(
      "আগের কোনো প্রশ্ন পাওয়া যায়নি।"
    );

    return;
  }


  /* শেষ AI উত্তর মুছে দাও */

  if (
    history.length &&
    history[history.length - 1].role ===
      "assistant"
  ) {

    history.pop();
  }


  saveHistory();


  /* UI থেকে শেষ AI message মুছে দাও */

  const rows =
    chat.querySelectorAll(
      ".ai-row"
    );


  if (rows.length) {

    const last =
      rows[rows.length - 1];

    if (
      !last
        .querySelector(".message")
        ?.classList.contains("typing")
    ) {

      last.remove();
    }
  }


  await sendMessage(
    lastUserMessage
  );
}


/* =========================
   SEND
========================= */

sendButton.addEventListener(
  "click",
  () => {
    sendMessage();
  }
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
   DARK MODE
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


    const dark =
      document.body.classList.contains(
        "dark"
      );


    localStorage.setItem(
      "tuktuki_theme",
      dark
        ? "dark"
        : "light"
    );


    themeToggle.textContent =
      dark
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

      if (isGenerating) {
        return;
      }


      try {

        recognition.start();

        voiceButton.classList.add(
          "listening"
        );

        voiceButton.textContent =
          "🔴";

      } catch (error) {

        console.log(
          "Voice error:",
          error
        );
      }
    }
  );


  recognition.onresult =
    event => {

      const text =
        event.results[0][0].transcript;


      input.value =
        input.value
          ? input.value + " " + text
          : text;


      input.focus();
    };


  recognition.onend =
    () => {

      voiceButton.classList.remove(
        "listening"
      );

      voiceButton.textContent =
        "🎤";
    };


  recognition.onerror =
    () => {

      voiceButton.classList.remove(
        "listening"
      );

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

loadHistory();

loadChat();

input.focus();
