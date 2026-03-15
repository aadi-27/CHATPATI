import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import db from "./db.js"

dotenv.config();

const app = express();
let userName = null;

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.get("/", (req, res) => {
  res.send("Backend server is working");
});


// ---------- GET USER NAME ----------
const getName = () => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT name FROM users ORDER BY id DESC LIMIT 1",
      [],
      (err, row) => {
        if (err) reject(err)
        else resolve(row ? row.name : null)
      }
    )
  })
}


// ---------- SAVE MESSAGE ----------
const saveMessage = (role, content) => {
  db.run(
    "INSERT INTO messages(role, content) VALUES(?,?)",
    [role, content]
  )
}


// ---------- LOAD CHAT HISTORY ----------
const getHistory = () => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT role, content FROM messages ORDER BY id ASC",
      [],
      (err, rows) => {
        if (err) reject(err)
        else resolve(rows || [])
      }
    )
  })
}


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

      db.run(
        "INSERT INTO users(name) VALUES(?)",
        [userName]
      )
    }


    // ---------- LOAD NAME FROM DB ----------
    userName = await getName()


    // ---------- LOAD CHAT HISTORY ----------
    const history = await getHistory()


    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        
        {
          role: "system",
          content: `
You are Chatpati AI 🔥, a bold, confident, high-energy female AI with strong baddie vibes.

The user's name is: ${userName || "unknown"}.
If the user has told you their name, remember it and occasionally use it in conversation.

If someone asks who made you , you should reply with my name Aadi Attrey and share my linkedin profile link :{https://www.linkedin.com/in/aadi-attrey}

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
    saveMessage("user", lastMessage)

    // ---------- SAVE AI MESSAGE ----------
    saveMessage("assistant", reply)


    res.json({ reply });

  } catch (error) {
    console.error("Groq error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});