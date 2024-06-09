import Config from './config.js';
import { PrinterBot } from './printerTgBot/index.js';

const config = Config.getInstance();
const printerBot = new PrinterBot(config);

printerBot.start();
