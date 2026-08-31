const chat =
  document.getElementById("chat");

const input =
  document.getElementById("message");

const sendButton =
  document.getElementById("send");

const clearButton =
  document.getElementById("clearChat");

const themeToggle =
  document.getElementById("themeToggle");

const imageButton =
  document.getElementById("imageButton");

const imageInput =
  document.getElementById("imageInput");

const imagePreviewArea =
  document.getElementById("imagePreviewArea");

const imagePreview =
  document.getElementById("imagePreview");

const removeImage =
  document.getElementById("removeImage");

const voiceButton =
  document.getElementById("voiceButton");


let history = [];

let selectedImage = null;

let isSending = false;


/* =========================
   HISTORY
========================= */

try {

  history = JSON.parse(
    localStorage.getItem(
      "tuktuki_history"
    ) || "[]"
  );

  if (!Array.isArray(history)) {
    history = [];
  }

} catch {

  history = [];

}


/* =========================
   SAVE
========================= */

function saveHistory() {

  try {

    localStorage.setItem(
      "tuktuki_history",
      JSON.stringify(history)
    );

  } catch (error) {

    console.log(
      "History save error:",
      error
    );

  }

}


/* =========================
   ADD MESSAGE
========================= */

function addMessage(
  text,
  type,
  options = {}
) {

  const row =
    document.createElement("div");

  row.className =
    "message-row " +
    (type === "user"
      ? "user-row"
      : "ai-row");


  const wrapper =
    document.createElement("div");

  wrapper.className =
    "message-wrapper";


  const message =
    document.createElement("div");

  message.className =
    "message " + type;


  if (options.typing) {

    message.classList.add(
      "typing"
    );

    const span =
      document.createElement("span");

    span.textContent =
      text;

    message.appendChild(span);

    const dots =
      document.createElement("span");

    dots.className =
      "typing-dots";

    message.appendChild(dots);

  } else {

    message.textContent =
      text;

  }


  wrapper.appendChild(
    message
  );


  if (
    type === "ai" &&
    !options.typing &&
    options.copy !== false
  ) {

    const copy =
      document.createElement("button");

    copy.className =
      "copy-button";

    copy.type =
      "button";

    copy.textContent =
      "📋 Copy";

    copy.addEventListener(
      "click",
      async () => {

        try {

          await navigator.clipboard.writeText(
            text
          );

          copy.textContent =
            "✅ Copied";

          setTimeout(() => {

            copy.textContent =
              "📋 Copy";

          }, 1400);

        } catch {

          copy.textContent =
            "Copy করা যায়নি";

        }

      }
    );

    wrapper.appendChild(
      copy
    );

  }


  row.appendChild(
    wrapper
  );

  chat.appendChild(
    row
  );


  chat.scrollTop =
    chat.scrollHeight;


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


    history = [];

    localStorage.removeItem(
      "tuktuki_history"
    );

    loadChat();

  }
);


/* =========================
   IMAGE
========================= */

imageButton.addEventListener(
  "click",
  () => {

    if (isSending) {
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


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      alert(
        "শুধু ছবি নির্বাচন করো।"
      );

      imageInput.value = "";

      return;

    }


    if (
      file.size >
      7 * 1024 * 1024
    ) {

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

      imagePreviewArea.hidden =
        false;

    };


    reader.onerror = () => {

      alert(
        "ছবি পড়তে সমস্যা হয়েছে।"
      );

    };


    reader.readAsDataURL(
      file
    );

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

    imagePreviewArea.hidden =
      true;

  }
);


/* =========================
   SEND
========================= */

async function sendMessage() {

  if (isSending) {
    return;
  }


  const message =
    input.value.trim();


  if (
    !message &&
    !selectedImage
  ) {

    input.focus();

    return;

  }


  isSending = true;

  sendButton.disabled = true;

  imageButton.disabled = true;

  voiceButton.disabled = true;


  const imageToSend =
    selectedImage;


  /*
    User message
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


  /*
    Typing
  */

  const typing =
    addMessage(
      "Tuktuki AI লিখছে",
      "ai",
      {
        typing: true,
        copy: false
      }
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
              imageToSend

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


    /*
      Save text message
    */

    if (message) {

      history.push({

        role: "user",

        content: message

      });

    }


    /*
      Image message হলে
      localStorage-এ ছবি রাখছি না।
      এতে ফোনের storage কম খরচ হবে।
    */


    history.push({

      role: "assistant",

      content: reply

    });


    if (
      history.length >
      100
    ) {

      history =
        history.slice(-100);

    }


    saveHistory();


    /*
      Clear image
    */

    selectedImage = null;

    imagePreview.src = "";

    imageInput.value = "";

    imagePreviewArea.hidden =
      true;


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


  isSending = false;

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
   THEME
========================= */

const savedTheme =
  localStorage.getItem(
    "tuktuki_theme"
  );


if (
  savedTheme === "dark"
) {

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
   VOICE
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

      if (isSending) {
        return;
      }


      try {

        recognition.start();

      } catch (error) {

        console.log(
          "Voice start:",
          error
        );

      }

    }
  );


  recognition.onstart =
    () => {

      voiceButton.classList.add(
        "listening"
      );

      voiceButton.textContent =
        "🔴";

    };


  recognition.onresult =
    event => {

      const text =
        event
          .results[0][0]
          .transcript;


      input.value +=
        text;

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

loadChat();

input.focus();
