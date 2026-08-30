require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const {
  GoogleGenAI
} = require("@google/genai");


const app =
  express();

const PORT =
  process.env.PORT || 3000;


const apiKey =
  process.env.GEMINI_API_KEY;


if (!apiKey) {

  console.error(
    "API key পাওয়া যায়নি ❌"
  );

  process.exit(1);

}


const ai =
  new GoogleGenAI({
    apiKey: apiKey
  });


/* =========================
   MEMORY
========================= */

const memoryFile =
  path.join(
    __dirname,
    "memory.json"
  );


let memory = [];


try {

  if (
    fs.existsSync(
      memoryFile
    )
  ) {

    memory =
      JSON.parse(
        fs.readFileSync(
          memoryFile,
          "utf8"
        )
      );


    if (
      !Array.isArray(memory)
    ) {

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


/* =========================
   SAVE MEMORY
========================= */

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
  express.static(
    __dirname
  )
);


/* =========================
   CHAT API
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


      /*
        Text এবং image দুটোই
        না থাকলে
      */

      if (
        !message &&
        !image
      ) {

        return res.json({
          reply:
            "কিছু লিখে বা ছবি পাঠিয়ে চেষ্টা করো 😊"
        });

      }


      /* =====================
         CONVERSATION
      ===================== */

      const conversation =
        memory
          .slice(-30)
          .map(item => {

            return (
              `${item.role}: ${item.content}`
            );

          })
          .join("\n");


      /* =====================
         SYSTEM PROMPT
      ===================== */

      const systemPrompt = `
তুমি Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা সহকারী।

তোমার developer-এর নাম G M Shahriar।

তোমার আচরণের নিয়ম:

1. স্বাভাবিক, সহজ ও বন্ধুসুলভ বাংলায় উত্তর দেবে।

2. ব্যবহারকারীর নাম জানা থাকলেও অপ্রয়োজনীয়ভাবে নাম বলবে না।

3. প্রতিটি উত্তরের শুরুতে "শাহরিয়ার" বা অন্য কোনো নাম ব্যবহার করবে না।

4. ব্যবহারকারীর নাম শুধুমাত্র তখন ব্যবহার করবে যখন কথোপকথনের জন্য সত্যিই প্রয়োজন।

5. ব্যবহারকারী যদি জিজ্ঞেস করে:
"তোমার নাম কি?"
"তোমার নাম কী?"
তাহলে বলবে:

"আমার নাম Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা। আমাকে তৈরি করেছেন আমার developer G M Shahriar।"

6. ব্যবহারকারী যদি জিজ্ঞেস করে:
"তোমাকে কে তৈরি করেছে?"
"তোমার developer কে?"
তাহলে বলবে:

"আমি Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা। আমাকে তৈরি করেছেন আমার developer G M Shahriar।"

7. অন্য সাধারণ প্রশ্নের উত্তরে G M Shahriar-এর নাম অপ্রয়োজনীয়ভাবে বলবে না।

8. নিজেকে Gemini বা Google Gemini হিসেবে পরিচয় দেবে না।

9. আগের কথোপকথনের তথ্য শুধুমাত্র বর্তমান প্রশ্নের সঙ্গে প্রাসঙ্গিক হলে ব্যবহার করবে।

10. ব্যবহারকারী কোনো পছন্দ বা তথ্য জানালে ভবিষ্যতে প্রাসঙ্গিক হলে সেটি মনে রাখবে।

11. একই তথ্য বারবার অপ্রয়োজনীয়ভাবে উল্লেখ করবে না।

12. উত্তর স্বাভাবিক, পরিষ্কার এবং প্রয়োজন অনুযায়ী সংক্ষিপ্ত রাখবে।

13. ব্যবহারকারী ছবি পাঠালে ছবিটি মনোযোগ দিয়ে বিশ্লেষণ করবে এবং ছবির বিষয় সম্পর্কে সরাসরি উত্তর দেবে।

14. ছবিতে কিছু দেখা না গেলে বা ছবিটি অস্পষ্ট হলে সেটা পরিষ্কারভাবে জানাবে।

15. ছবির ব্যাপারে অনুমানকে নিশ্চিত তথ্য হিসেবে বলবে না।

আগের কথোপকথনের প্রাসঙ্গিক অংশ:

${conversation || "কোনো আগের কথোপকথন নেই।"}

বর্তমান ব্যবহারকারীর বার্তা:

${message || "ব্যবহারকারী একটি ছবি পাঠিয়েছে।"}

এখন ব্যবহারকারীর প্রশ্নের সরাসরি উত্তর দাও।
`;


      /* =====================
         GEMINI CONTENT
      ===================== */

      const parts = [];


      parts.push({
        text:
          systemPrompt
      });


      /*
        Image থাকলে
        base64 থেকে inlineData
      */

      if (image) {

        try {

          /*
            data:image/jpeg;base64,...
          */

          const match =
            image.match(
              /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
            );


          if (!match) {

            return res.status(400).json({
              reply:
                "ছবির format সঠিক নয়। আবার ছবি নির্বাচন করো।"
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
            "Image processing error:",
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
         SAVE MEMORY
      ===================== */

      if (message) {

        memory.push({

          role:
            "ব্যবহারকারী",

          content:
            message

        });

      }


      memory.push({

        role:
          "Tuktuki AI",

        content:
          reply

      });


      /*
        Memory limit
      */

      if (
        memory.length > 100
      ) {

        memory =
          memory.slice(-100);

      }


      saveMemory();


      /* =====================
         RESPONSE
      ===================== */

      res.json({

        reply:
          reply

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
