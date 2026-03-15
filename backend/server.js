import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import Database from "better-sqlite3";

dotenv.config();

const app = express();
const db = new Database("./chatpati.db");
let userName = null;

app.use(cors({
  origin: [
    "https://chatpati-j3wfpm30u-aadi-27s-projects.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST"],
}));
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

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.get("/", (req, res) => {
  res.send("Chatpati backend is live 🔥");
});

// ---------- GET USER NAME ----------
const getName = () => {
  const row = db.prepare("SELECT name FROM users ORDER BY id DESC LIMIT 1").get();
  return row ? row.name : null;
};

// ---------- SAVE MESSAGE ----------
const saveMessage = (role, content) => {
  db.prepare("INSERT INTO messages(role, content) VALUES(?,?)").run(role, content);
};

// ---------- LOAD CHAT HISTORY ----------
const getHistory = () => {
  return db.prepare("SELECT role, content FROM messages ORDER BY id ASC").all();
};

app.post("/chat", async (req, res) => {
  try {
    let { messages } = req.body;

    // Safety: convert old format to new format
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

    // ---------- NAME DETECTION ----------
    const lastMessage = formattedMessages[formattedMessages.length - 1]?.content;

    const nameMatch = lastMessage?.match(/my name is (.+)|i am (.+)|i'm (.+)/i);

    if (nameMatch) {
      userName = nameMatch[1] || nameMatch[2] || nameMatch[3];
      db.prepare("INSERT INTO users(name) VALUES(?)").run(userName);
    }

    // ---------- LOAD NAME FROM DB ----------
    userName = getName();

    // ---------- LOAD CHAT HISTORY ----------
    const history = getHistory();

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
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
`
        },
        ...history,
        ...formattedMessages
      ]
    });

    const reply = chatCompletion.choices[0].message.content;

    // ---------- SAVE USER MESSAGE ----------
    saveMessage("user", lastMessage);

    // ---------- SAVE AI MESSAGE ----------
    saveMessage("assistant", reply);

    res.json({ reply });

  } catch (error) {
    console.error("Groq error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
});