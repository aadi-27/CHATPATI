import Database from "better-sqlite3"

const db = new Database("./chatpati.db")

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT,
    content TEXT
  )
`)

console.log("Connected to SQLite database")

export default db