const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- VERİTABANI BAĞLANTISI ---
const db = new sqlite3.Database('./cafe.db', (err) => {
    if (err) console.error(err.message);
    else console.log('SQLite veritabanına bağlanıldı.');
});

// --- TABLOLARI OLUŞTURMA ---
db.serialize(() => {
    // 1. Menü Tablosu
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        category TEXT
    )`);

    // 2. Mesajlar Tablosu (YENİ EKLENDİ)
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        message TEXT,
        date TEXT
    )`);

    // Menü boşsa örnek veri ekle
    db.get("SELECT count(*) as count FROM menu", (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO menu (name, price, category) VALUES (?, ?, ?)");
            stmt.run("Latte", 65, "Kahve");
            stmt.run("Cheesecake", 85, "Tatlı");
            stmt.finalize();
        }
    });
});

// --- MENU API ENDPOINTLERİ (Aynen duruyor) ---
app.get('/api/menu', (req, res) => {
    db.all("SELECT * FROM menu", [], (err, rows) => {
        if (err) res.status(400).json({ error: err.message });
        else res.json(rows);
    });
});

app.post('/api/menu', (req, res) => {
    const { name, price, category } = req.body;
    db.run("INSERT INTO menu (name, price, category) VALUES (?, ?, ?)", [name, price, category], function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.status(201).json({ id: this.lastID, name, price, category });
    });
});

app.delete('/api/menu/:id', (req, res) => {
    db.run("DELETE FROM menu WHERE id = ?", req.params.id, function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.json({ message: "Silindi" });
    });
});

app.put('/api/menu/:id', (req, res) => {
    const { name, price, category } = req.body;
    db.run("UPDATE menu SET name = ?, price = ?, category = ? WHERE id = ?", [name, price, category, req.params.id], function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.json({ id: req.params.id, name, price, category });
    });
});

// --- MESAJ API ENDPOINTLERİ (YENİ EKLENDİ) ---

// 1. Mesaj Gönder (Create)
app.post('/api/messages', (req, res) => {
    const { name, email, message } = req.body;
    const date = new Date().toLocaleString('tr-TR'); // Tarih ve saat ekleyelim
    
    db.run("INSERT INTO messages (name, email, message, date) VALUES (?, ?, ?, ?)", [name, email, message, date], function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.status(201).json({ message: "Mesaj alındı" });
    });
});

// 2. Mesajları Oku (Read - Admin İçin)
app.get('/api/messages', (req, res) => {
    db.all("SELECT * FROM messages ORDER BY id DESC", [], (err, rows) => { // En son gelen en üstte
        if (err) res.status(400).json({ error: err.message });
        else res.json(rows);
    });
});

// 3. Mesaj Sil (Delete - Admin İçin)
app.delete('/api/messages/:id', (req, res) => {
    db.run("DELETE FROM messages WHERE id = ?", req.params.id, function (err) {
        if (err) res.status(400).json({ error: err.message });
        else res.json({ message: "Mesaj silindi" });
    });
});

app.listen(port, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${port}`);
});