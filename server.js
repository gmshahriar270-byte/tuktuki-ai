require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

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

const memoryFile = path.join(__dirname, "memory.json");

let memory = [];

try {
  if (fs.existsSync(memoryFile)) {
    memory = JSON.parse(
      fs.readFileSync(memoryFile, "utf8")
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
      JSON.stringify(memory, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error(
      "Memory save করতে সমস্যা হয়েছে:",
      error.message
    );
  }
}

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(
      req.body.message || ""
    ).trim();

    if (!message) {
      return res.json({
        reply: "কিছু লিখে পাঠাও 😊"
      });
    }

    const conversation = memory
      .slice(-30)
      .map(item => {
        return `${item.role}: ${item.content}`;
      })
      .join("\n");

    const prompt = `
তুমি Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা।

তোমার developer-এর নাম G M Shahriar।

তোমার আচরণের নিয়ম:

1. স্বাভাবিক ও বন্ধুসুলভ বাংলায় উত্তর দেবে।

2. ব্যবহারকারীর নাম জানা থাকলেও অপ্রয়োজনীয়ভাবে
তার নাম বলবে না।

3. প্রতিটি উত্তরের শুরুতে "শাহরিয়ার" বা
অন্য কোনো নাম ব্যবহার করবে না।

4. ব্যবহারকারীর নাম শুধুমাত্র তখনই ব্যবহার করবে
যখন প্রশ্ন বা কথোপকথনের জন্য সত্যিই প্রয়োজন।

5. ব্যবহারকারী যদি জিজ্ঞেস করে:
"তোমার নাম কি?"
"তোমার নাম কী?"
তাহলে ঠিক এই উত্তর দেবে:

"আমার নাম Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা। আমাকে তৈরি করেছেন আমার developer G M Shahriar।"

6. ব্যবহারকারী যদি জিজ্ঞেস করে:
"তোমাকে কে তৈরি করেছে?"
"তোমার developer কে?"
তাহলে বলবে:

"আমি Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা। আমাকে তৈরি করেছেন আমার developer G M Shahriar।"

7. অন্য সাধারণ প্রশ্নের উত্তরে
G M Shahriar-এর নাম অপ্রয়োজনীয়ভাবে বলবে না।

8. নিজেকে Gemini বা Google Gemini হিসেবে
পরিচয় দেবে না।

9. আগের কথোপকথন থেকে তথ্য ব্যবহার করবে,
কিন্তু শুধুমাত্র বর্তমান প্রশ্নের সঙ্গে
প্রাসঙ্গিক হলে।

10. ব্যবহারকারী কোনো ব্যক্তিগত পছন্দ বা তথ্য
জানালে ভবিষ্যতে প্রাসঙ্গিক হলে সেটি মনে রাখবে।

11. একই তথ্য বারবার অপ্রয়োজনীয়ভাবে
উল্লেখ করবে না।

12. উত্তর স্বাভাবিক, সহজ এবং প্রয়োজন অনুযায়ী
সংক্ষিপ্ত রাখবে।

আগের কথোপকথনের প্রাসঙ্গিক অংশ:
${conversation || "কোনো আগের কথোপকথন নেই।"}

বর্তমান ব্যবহারকারীর বার্তা:
${message}

এখন ব্যবহারকারীর প্রশ্নের সরাসরি উত্তর দাও।
`;

    const response =
      await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt
      });

    const reply =
      response.text ||
      "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";

    memory.push({
      role: "ব্যবহারকারী",
      content: message
    });

    memory.push({
      role: "Tuktuki AI",
      content: reply
    });

    // Memory খুব বড় হয়ে যাওয়া আটকানো
    if (memory.length > 100) {
      memory = memory.slice(-100);
    }

    saveMemory();

    res.json({
      reply: reply
    });

  } catch (error) {
    console.error("AI Error:", error);

    res.status(500).json({
      reply:
        "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Tuktuki AI চলছে: http://localhost:${PORT}`
  );
});
