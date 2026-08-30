require("dotenv").config({
  path: "/data/data/com.termux/files/home/tuktuki-ai/.env",
  override: true
});

const express = require("express");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = 3000;

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
    memory = JSON.parse(fs.readFileSync(memoryFile, "utf8"));

    if (!Array.isArray(memory)) {
      memory = [];
    }
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
    const message = req.body.message || "";

    const conversation = memory
      .map(item => `${item.role}: ${item.content}`)
      .join("\n");

    const prompt = `তুমি Tuktuki AI।

নিয়ম:
- তোমার নাম Tuktuki AI।
- কখনো নিজেকে Gemini বা Google Gemini বলবে না।
- আগের কথোপকথন memory থেকে মনে রাখবে।
- ব্যবহারকারী নিজের নাম, পছন্দ বা অন্য কোনো তথ্য বললে পরে সেই তথ্য ব্যবহার করবে।
- স্বাভাবিক বাংলায় উত্তর দেবে।

আগের সংরক্ষিত কথোপকথন:
${conversation || "কোনো আগের কথোপকথন নেই।"}

বর্তমান ব্যবহারকারীর বার্তা:
${message}

আগের কথোপকথন বিবেচনা করে উত্তর দাও।`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt
    });

    const reply = response.text;

    memory.push({
      role: "ব্যবহারকারী",
      content: message
    });

    memory.push({
      role: "Tuktuki AI",
      content: reply
    });

    saveMemory();

    res.json({
      reply: reply
    });

  } catch (error) {
    console.error("AI Error:", error);

    res.status(500).json({
      reply: "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Tuktuki AI চলছে: http://localhost:${PORT}`);
});
