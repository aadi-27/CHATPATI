import sqlite3 from "sqlite3"

const db = new sqlite3.Database("./chatpati.db", (err) => {
  if (err) {
    console.error(err.message)
  } else {
    console.log("Connected to SQLite database")
  }
})

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT,
      content TEXT
    )
  `)

})

export default db