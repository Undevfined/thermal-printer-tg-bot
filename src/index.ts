import TelegramBot from 'node-telegram-bot-api';
import Config from './config.js';

const config = Config.getInstance();

const bot = new TelegramBot(config.token, { polling: true });

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const responseText = `Hello from Undevfined, ${msg.from?.username}!`;

    bot.sendMessage(chatId, responseText);
});


console.log('Bot has been started...');