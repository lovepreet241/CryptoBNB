const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Apna Bot Token aur Domain/URL yahan daalein
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const WEB_APP_URL = 'https://aapkadomain.com'; 

const bot = new Telegraf(BOT_TOKEN);
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        balance REAL DEFAULT 0,
        tasks_done INTEGER DEFAULT 0
    )`);
});

// 3. Updated BNB Tasks
const TASKS = [
    { id: 1, type: 'youtube', reward: 0.000010, url: 'https://youtu.be/r6iGQHtiKZY' },
    { id: 2, type: 'youtube', reward: 0.000005, url: 'https://youtu.be/HnWKOEg-2do' },
    { id: 3, type: 'youtube', reward: 0.000005, url: 'https://youtu.be/s9CRZvf2oHI' },
    { id: 4, type: 'adsgram', reward: 0.000005, note: 'no must click' },
    { id: 5, type: 'adsgram', reward: 0.000005, note: 'must click' },
    { id: 6, type: 'adsgram', reward: 0.000005, note: 'must click' },
    { id: 7, type: 'adsgram', reward: 0.000005, note: 'must click' },
    { id: 8, type: 'youtube', reward: 0.000005, url: 'https://youtu.be/_hzf9W746hk' },
    { id: 9, type: 'adsgram', reward: 0.000005, note: 'must click' }
];

bot.start((ctx) => {
    const userId = ctx.from.id.toString();
    const name = ctx.from.first_name || 'User';

    db.run(`INSERT OR IGNORE INTO users (id, name, balance, tasks_done) VALUES (?, ?, 0, 0)`, [userId, name]);

    ctx.reply(
        `🎯 Complete tasks & earn BNB\n\nWatch ads and get rewarded instantly!`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Open Tasks', WEB_APP_URL)]
        ])
    );

    ctx.reply(
        `Welcome ${name}! Choose an option below:`,
        Markup.keyboard([
            ['💰 Balance', '🧍 Referral'],
            ['📥 Withdraw', '🎁 Earn More']
        ]).resize()
    );
});

bot.hears('💰 Balance', (ctx) => {
    const userId = ctx.from.id.toString();
    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, row) => {
        // 6 decimal point fix
        const bal = row ? row.balance.toFixed(6) : '0.000000';
        ctx.reply(
            `🤴 User : ${ctx.from.first_name}\n\nYour Balance: ${bal} BNB\n\n📝 If you submitted wrong data then you can restart the bot & resubmit the data again by clicking on /start`
        );
    });
});

bot.hears('🎁 Earn More', (ctx) => {
    ctx.reply(
        `🎯 Complete tasks & earn BNB\n\nWatch ads and get rewarded instantly!`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Open Tasks', WEB_APP_URL)]
        ])
    );
});

bot.hears('🧍 Referral', (ctx) => {
    ctx.reply('Referral system coming soon!');
});
bot.hears('📥 Withdraw', (ctx) => {
    ctx.reply('Withdraw system coming soon!');
});

app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, row) => {
        if (!row) {
            db.run(`INSERT INTO users (id, name, balance, tasks_done) VALUES (?, 'User', 0, 0)`, [userId]);
            return res.json({ balance: 0, tasks_done: 0, tasks: TASKS });
        }
        res.json({ balance: row.balance, tasks_done: row.tasks_done, tasks: TASKS });
    });
});

app.post('/api/complete-task', (req, res) => {
    const { userId, reward } = req.body;
    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, row) => {
        if (!row || row.tasks_done >= 9) {
            return res.status(400).json({ error: 'Limit reached' });
        }
        const newBal = parseFloat((row.balance + reward).toFixed(6));
        const newTasks = row.tasks_done + 1;

        db.run(`UPDATE users SET balance = ?, tasks_done = ? WHERE id = ?`, [newBal, newTasks, userId], () => {
            bot.telegram.sendMessage(
                userId,
                `📋 Task Completed\n\n💰 +${reward.toFixed(6)} BNB has been added to your balance.\n\n📊 Tasks Progress: ${newTasks} / 9`
            ).catch(() => {});

            res.json({ success: true, balance: newBal, tasks_done: newTasks });
        });
    });
});

bot.launch();
app.listen(3005, () => console.log('Crypto Pro Server running on port 3005'));
