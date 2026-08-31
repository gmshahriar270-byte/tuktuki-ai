require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const {
  GoogleGenAI
} = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("API key পাওয়া যায়নি ❌");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: apiKey
});


/* =========================
   MEMORY
========================= */

const memoryFile = path.join(
  __dirname,
  "memory.json"
);

let memory = [];

try {
  if (fs.existsSync(memoryFile)) {
    memory = JSON.parse(
      fs.readFileSync(
        memoryFile,
        "utf8"
      )
    );

    if (!Array.isArray(memory)) {
      memory = [];
    }
  }
} catch (error) {
  console.error(
    "Memory পড়তে সমস্যা হয়েছে:",
    error.message
  );

  memory = [];
}


function saveMemory() {
  try {
    fs.writeFileSync(
      memoryFile,
      JSON.stringify(
        memory,
        null,
        2
      ),
      "utf8"
    );
  } catch (error) {
    console.error(
      "Memory save করতে সমস্যা হয়েছে:",
      error.message
    );
  }
}


/* =========================
   MIDDLEWARE
========================= */

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.static(__dirname)
);


/* =========================
   NORMAL CHAT + IMAGE
========================= */

app.post(
  "/api/chat",
  async (req, res) => {

    try {

      const message =
        String(
          req.body.message || ""
        ).trim();

      const image =
        req.body.image || null;


      if (!message && !image) {
        return res.json({
          reply:
            "কিছু লিখে বা ছবি পাঠিয়ে চেষ্টা করো 😊"
        });
      }


      const conversation =
        memory
          .slice(-30)
          .map(item => {
            return `${item.role}: ${item.content}`;
          })
          .join("\n");


      const parts = [];


      /* =====================
         SYSTEM / TEXT
      ===================== */

      const prompt = `
তুমি Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা।

তোমার developer-এর নাম G M Shahriar।

নিয়ম:

1. স্বাভাবিক ও বন্ধুসুলভ বাংলায় উত্তর দেবে।

2. নিজেকে Gemini বা Google Gemini হিসেবে
পরিচয় দেবে না।

3. ব্যবহারকারীর নাম অপ্রয়োজনীয়ভাবে বলবে না।

4. ব্যবহারকারী যদি জিজ্ঞেস করে
"তোমার নাম কী?" বা "তোমার নাম কি?"
তাহলে বলবে:

"আমার নাম Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা। আমাকে তৈরি করেছেন আমার developer G M Shahriar।"

5. ব্যবহারকারী যদি জিজ্ঞেস করে
"তোমাকে কে তৈরি করেছে?" বা
"তোমার developer কে?"
তাহলে বলবে:

"আমি Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা। আমাকে তৈরি করেছেন আমার developer G M Shahriar।"

6. আগের কথোপকথন প্রাসঙ্গিক হলে ব্যবহার করবে।

7. উত্তর সহজ, স্বাভাবিক এবং প্রয়োজন অনুযায়ী
সংক্ষিপ্ত রাখবে।

আগের কথোপকথন:
${conversation || "কোনো আগের কথোপকথন নেই।"}

ব্যবহারকারীর বর্তমান বার্তা:
${message || "ব্যবহারকারী একটি ছবি পাঠিয়েছে।"}

সরাসরি উত্তর দাও।
`;


      parts.push({
        text: prompt
      });


      /* =====================
         IMAGE
      ===================== */

      if (image) {

        try {

          const match =
            image.match(
              /^data:(image\/[^;]+);base64,(.+)$/
            );


          if (!match) {
            return res.status(400).json({
              reply:
                "ছবিটি সঠিক format-এ নেই।"
            });
          }


          const mimeType =
            match[1];

          const base64Data =
            match[2];


          parts.push({
            inlineData: {
              mimeType:
                mimeType,
              data:
                base64Data
            }
          });


        } catch (error) {

          console.error(
            "Image Error:",
            error
          );

          return res.status(400).json({
            reply:
              "ছবিটি প্রক্রিয়া করতে সমস্যা হয়েছে।"
          });
        }
      }


      /* =====================
         AI REQUEST
      ===================== */

      const response =
        await ai.models.generateContent({

          model:
            "gemini-3.1-flash-lite",

          contents: [
            {
              role: "user",
              parts: parts
            }
          ]
        });


      const reply =
        response.text ||
        "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";


      /* =====================
         MEMORY
      ===================== */

      if (message) {

        memory.push({
          role: "ব্যবহারকারী",
          content: message
        });

      }


      memory.push({
        role: "Tuktuki AI",
        content: reply
      });


      if (memory.length > 100) {
        memory =
          memory.slice(-100);
      }


      saveMemory();


      res.json({
        reply: reply
      });


    } catch (error) {

      console.error(
        "AI Error:",
        error
      );

      res.status(500).json({
        reply:
          "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। আবার চেষ্টা করো।"
      });
    }
  }
);


/* =========================
   LIVE API TOKEN
========================= */

app.get(
  "/api/live-token",
  async (req, res) => {

    try {

      const token =
        await ai.authTokens.create({

          config: {

            uses: 1,

            expireTime:
              new Date(
                Date.now() +
                5 * 60 * 1000
              ).toISOString(),

            newSessionExpireTime:
              new Date(
                Date.now() +
                60 * 1000
              ).toISOString(),

            liveConnectConstraints: {

              model:
                "gemini-3-flash-preview",

              config: {

                responseModalities:
                  ["AUDIO"]

              }

            }

          }

        });


      res.json({
        token: token.name
      });


    } catch (error) {

      console.error(
        "Live Token Error:",
        error
      );

      res.status(500).json({
        error:
          "Live Voice চালু করা যায়নি।"
      });

    }

  }
);


/* =========================
   SERVER
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Tuktuki AI চলছে: http://localhost:${PORT}`
    );

  }
);
