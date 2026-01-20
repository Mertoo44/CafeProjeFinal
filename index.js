const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./cafe.db', (err) => {
    if (err) console.error(err.message);
    else console.log('SQLite veritabanına bağlanıldı.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        category TEXT
    )`);
 
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        message TEXT,
        date TEXT
    )`);

    db.get("SELECT count(*) as count FROM menu", (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO menu (name, price, category) VALUES (?, ?, ?)");
            stmt.run("Latte", 65, "Kahve");
            stmt.run("Cheesecake", 85, "Tatlı");
            stmt.run("Çay", 25, "Sıcak İçecek");
            stmt.run("Pumpkin Spice Latte", 170, "Kahve");
            stmt.finalize();
        }
    });
});

// --- MENU API ENDPOINTLERİ ---
app.get('/api/menu', (req, res) => {
    db.all("SELECT * FROM menu", [], (err, rows) => {
        if (err) res.status(400).json({ error: err.message });
        else res.json(rows);
    });
});

// Ürün Ekleme Kısmı
app.post('/api/menu', (req, res) => {
    const name = req.body.name.trim(); 
    const price = req.body.price;
    const category = req.body.category.trim();

    if (!name || !price || !category) {
        return res.status(400).json({ error: "Lütfen tüm alanları doldurunuz." });
    }
    if (price < 0) {
        return res.status(400).json({ error: "Fiyat 0'dan küçük olamaz!" });
    }

    db.get("SELECT id FROM menu WHERE name = ? COLLATE NOCASE", [name], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (row) {
            return res.status(400).json({ error: `"${name}" isimli ürün zaten menüde var!` });
        }

        db.run("INSERT INTO menu (name, price, category) VALUES (?, ?, ?)", [name, price, category], function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
            } else {
                res.status(201).json({
                    id: this.lastID,
                    name: name,
                    price: price,
                    category: category
                });
            }
        });
    });
});

app.delete('/api/menu/:id', (req, res) => {
    db.run("DELETE FROM menu WHERE id = ?", req.params.id, function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.json({ message: "Silindi" });
    });
});

// Ürün Güncelleme Kısmı
app.put('/api/menu/:id', (req, res) => {
    const { name, price, category } = req.body;

    if (price < 0) {
        return res.status(400).json({ error: "Fiyat 0'dan küçük olamaz!" });
    }

    db.run("UPDATE menu SET name = ?, price = ?, category = ? WHERE id = ?", [name, price, category, req.params.id], function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.json({ id: req.params.id, name, price, category });
    });
});

// --- MESAJ API ENDPOINTLERİ  ---

app.post('/api/messages', (req, res) => {
    const { name, email, message } = req.body;
    const date = new Date().toLocaleString('tr-TR'); 
    
    db.run("INSERT INTO messages (name, email, message, date) VALUES (?, ?, ?, ?)", [name, email, message, date], function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.status(201).json({ message: "Mesaj alındı" });
    });
});

app.get('/api/messages', (req, res) => {
    db.all("SELECT * FROM messages ORDER BY id DESC", [], (err, rows) => {
        if (err) res.status(400).json({ error: err.message });
        else res.json(rows);
    });
});

app.delete('/api/messages/:id', (req, res) => {
    db.run("DELETE FROM messages WHERE id = ?", req.params.id, function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.json({ message: "Mesaj silindi" });
    });
});

app.listen(port, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${port}`);
});