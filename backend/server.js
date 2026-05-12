const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./database.sqlite", (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            phone TEXT,
            balance REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            amount REAL,
            status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

});

app.get("/", (req, res) => {
    res.send("Embani LLC Backend Running");
});

app.get("/customers", (req, res) => {

    db.all(
        "SELECT * FROM customers",
        [],
        (err, rows) => {

            if (err) {
                res.status(500).json(err);
            } else {
                res.json(rows);
            }

        }
    );

});

app.post("/customers", (req, res) => {

    const { name, phone, balance } = req.body;

    db.run(
        "INSERT INTO customers (name, phone, balance) VALUES (?, ?, ?)",
        [name, phone, balance],

        function(err) {

            if (err) {
                res.status(500).json(err);
            } else {

                res.json({
                    id: this.lastID,
                    message: "Customer added successfully"
                });

            }

        }
    );

});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
