import { useState, useEffect, useRef } from "react"
import axios from "axios"

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Heyy! Main hoon Chatpati AI — seedha jawaab nahi dungi, but ekdum sahi dungi 😏 Kya poochna hai?",
      time: formatTime(new Date()),
    }
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return

    const userMsg = {
      role: "user",
      content: input,
      time: formatTime(new Date())
    }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    try {
      const response = await axios.post("https://chatpati.onrender.com/chat", {
        messages: [...messages, userMsg].map(m => ({
          role: m.role,
          content: m.content
        }))
      })

      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.data.reply,
        time: formatTime(new Date())
      }])

    } catch (err) {
  setMessages(prev => [...prev, {
    role: "assistant",
    content: err.response?.status === 429 
      ? "Arre yaar bahut saare sawaal! Thodi der baad try kar 😅🔥" 
      : "Arre kuch gadbad ho gayi! Thoda baad mei try kar 😅",
    time: formatTime(new Date())
  }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="app">
      <div className="chat-shell">

        <div className="chat-header">
          <div className="mascot-ring">
            <span className="mascot-face">🌶</span>
          </div>
          <div className="header-text">
            <h1>Chatpati AI</h1>
            <p>Always spicy, never boring</p>
          </div>
          <div className="status-dot" />
        </div>

        <div className="chat-messages">
          <div className="date-divider">Today</div>

          {messages.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.role === "user" ? "user" : "bot"}`}>
              <div className={`msg-avatar ${msg.role === "assistant" ? "bot-av" : ""}`}>
                {msg.role === "assistant" ? "🌶" : "👤"}
              </div>
              <div>
                <div className={`bubble ${msg.role === "assistant" ? "bot" : "user"}`}>
                  {msg.content}
                </div>
                <div className="msg-time">{msg.time}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="typing">
              <div className="msg-avatar bot-av">🌶</div>
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="input-shell">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something spicy..."
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage() }}
              disabled={isTyping}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={isTyping}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            </button>
          </div>
          <div className="input-hint">
            Press <span>Enter</span> to send · Made with 🌶 by Aadi
          </div>
        </div>

      </div>
    </div>
  )
}

export default Chatbot