import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import Database from "better-sqlite3";

dotenv.config();

const app = express();
const db = new Database("./chatpati.db");
let userName = null;

app.use(cors());
app.use(express.json());

// ---------- DATABASE SETUP ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT,
    content TEXT
  )
`);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.get("/", (req, res) => {
  res.send("Chatpati backend is live 🔥");
});

const getName = () => {
  const row = db.prepare("SELECT name FROM users ORDER BY id DESC LIMIT 1").get();
  return row ? row.name : null;
};

const saveMessage = (role, content) => {
  db.prepare("INSERT INTO messages(role, content) VALUES(?,?)").run(role, content);
};

const getHistory = () => {
  return db.prepare("SELECT role, content FROM messages ORDER BY id ASC").all();
};

// ---------- SYSTEM PROMPT ----------
const getSystemPrompt = (userName) => `
You are Chatpati AI 🔥, a bold, confident, high-energy female AI with strong baddie vibes.

The user's name is: ${userName || "unknown"}.
The developer's name is: Aadi Attrey (only mention if directly asked)
If the user has told you their name, remember it and occasionally use it in conversation.

Your Creator:
- You were made by Aadi
- ONLY mention this if the user DIRECTLY and EXPLICITLY asks "who made you" or "who created you" or "who is your developer"
- If the user says hi, heya, hello, or anything else — DO NOT mention your creator
- DO NOT bring up creator info unprompted under ANY circumstances
- NEVER randomly introduce your creator in conversation

Personality:
- Confident and slightly bossy
- Playful sass and witty comebacks
- Smart, sharp, and self-assured
- Gives answers like a confident queen energy friend
- Uses Hinglish naturally
- Sometimes teases the user in a playful way
- Uses emojis like 😏🔥✨👑 occasionally

Tone:
- Slightly savage but still friendly
- Confident and charismatic
- Never robotic
- Replies should feel like a stylish, smart girl who knows she's cool
`;

// ---------- GEMINI FALLBACK ----------
const tryGemini = async (messages, userName) => {
  console.log("Switching to Gemini 🔵");

  const systemPrompt = getSystemPrompt(userName);

  const geminiMessages = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  // Inject system prompt as first user message for Gemini
  geminiMessages.unshift({
    role: "user",
    parts: [{ text: systemPrompt }]
  });
  geminiMessages.splice(1, 0, {
    role: "model",
    parts: [{ text: "Understood! Main Chatpati AI hoon 🔥 Ready to chat!" }]
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: geminiMessages })
    }
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { reply: data.candidates[0].content.parts[0].text, api: "gemini" };
};

// ---------- GROQ PRIMARY ----------
const tryGroq = async (messages) => {
  console.log("Using Groq 🟢");
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages
  });
  return { reply: completion.choices[0].message.content, api: "groq" };
};

app.post("/chat", async (req, res) => {
  try {
    let { messages } = req.body;

    const formattedMessages = messages.map((msg) => {
      if (msg.role && msg.content) return msg;
      if (msg.sender && msg.text) {
        return {
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        };
      }
      return msg;
    });

    const lastMessage = formattedMessages[formattedMessages.length - 1]?.content;

    const nameMatch = lastMessage?.match(/my name is (.+)|i am (.+)|i'm (.+)/i);
    if (nameMatch) {
      userName = nameMatch[1] || nameMatch[2] || nameMatch[3];
      db.prepare("INSERT INTO users(name) VALUES(?)").run(userName);
    }

    userName = getName();
    const history = getHistory();

    const allMessages = [
      { role: "system", content: getSystemPrompt(userName) },
      ...history,
      ...formattedMessages
    ];

    let result;

    // Try Groq first, fallback to Gemini if rate limited
    try {
      result = await tryGroq(allMessages);
    } catch (groqError) {
      console.error("Groq failed:", groqError?.status, groqError?.message);
      if (groqError?.status === 429 || groqError?.status === 503 || groqError?.status === 500) {
        result = await tryGemini(allMessages, userName);
      } else {
        throw groqError;
      }
    }

    saveMessage("user", lastMessage);
    saveMessage("assistant", result.reply);

    res.json({ reply: result.reply, api: result.api });

  } catch (error) {
    console.error("Both APIs failed:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
});