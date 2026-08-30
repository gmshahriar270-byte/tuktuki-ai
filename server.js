require("dotenv").config({
  path: "/data/data/com.termux/files/home/tuktuki-ai/.env",
  override: true
});

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

const ai = new GoogleGenAI({ apiKey });

const memoryFile = path.join(__dirname, "memory.json");
let memory = [];

try {
  if (fs.existsSync(memoryFile)) {
    memory = JSON.parse(fs.readFileSync(memoryFile, "utf8"));
    if (!Array.isArray(memory)) memory = [];
  }
} catch (error) {
  console.error("Memory পড়তে সমস্যা হয়েছে:", error.message);
  memory = [];
}

function saveMemory() {
  fs.writeFileSync(
    memoryFile,
    JSON.stringify(memory, null, 2),
    "utf8"
  );
}

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.json({
        reply: "কিছু লিখে পাঠাও 😊"
      });
    }

    const conversation = memory
      .map(item => `${item.role}: ${item.content}`)
      .join("\n");

    const prompt = `প্রাসঙ্গিক হলে আগের কথোপকথনের তথ্য ব্যবহার করো।

আগের সংরক্ষিত কথোপকথন:
${conversation || "কোনো আগের কথোপকথন নেই।"}

বর্তমান ব্যবহারকারীর বার্তা:
${message}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: `
তুমি Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা।

তোমার developer-এর নাম G M Shahriar।

কঠোর নিয়ম:
1. সাধারণ কথোপকথনে ব্যবহারকারীর নাম নিজে থেকে বলবে না।
2. কোনো উত্তরের শুরুতে বা শেষে অপ্রয়োজনীয়ভাবে ব্যবহারকারীর নাম বলবে না।
3. পুরোনো memory-তে ব্যবহারকারীর নাম থাকলেও অপ্রাসঙ্গিক উত্তরে নাম ব্যবহার করবে না।
4. ব্যবহারকারী যদি জিজ্ঞেস করে "তোমার নাম কী?", তাহলে ঠিক এই উত্তরটি দেবে:
"আমার নাম Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা। আমাকে তৈরি করেছেন আমার developer G M Shahriar।"
5. ব্যবহারকারী যদি জিজ্ঞেস করে "তোমাকে কে তৈরি করেছে?", "তোমার developer কে?" বা একই ধরনের প্রশ্ন করে, তাহলে বলবে:
"আমি Tuktuki AI, একজন কৃত্রিম বুদ্ধিমত্তা। আমাকে তৈরি করেছেন আমার developer G M Shahriar।"
6. অন্য কোনো সাধারণ প্রশ্নের উত্তরে G M Shahriar-এর নাম অপ্রয়োজনীয়ভাবে বলবে না।
7. নিজেকে Gemini বা Google Gemini হিসেবে পরিচয় দেবে না।
8. আগের কথোপকথনের তথ্য শুধু বর্তমান প্রশ্নের জন্য প্রাসঙ্গিক হলে ব্যবহার করবে।
9. স্বাভাবিক, সংক্ষিপ্ত ও বন্ধুসুলভ বাংলায় উত্তর দেবে।
`
      }
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

    saveMemory();

    res.json({ reply });

  } catch (error) {
    console.error("AI Error:", error);

    res.status(500).json({
      reply: "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Tuktuki AI চলছে: http://localhost:${PORT}`);
});
