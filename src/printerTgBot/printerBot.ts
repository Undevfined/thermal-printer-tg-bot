import TelegramBot, { Message } from 'node-telegram-bot-api';
import Config from '../config.js';
import { PrinterBotCommand } from './types.js';
import { logger } from '../logger.js'; // Import the custom logger

export class PrinterBot {
  private config: Config;
  private tgBot: TelegramBot;
  private commands: PrinterBotCommand[];

  constructor(config: Config) {
    this.config = config;
    this.tgBot = new TelegramBot(this.config.token, { polling: true });

    this.commands = [
      { command: 'print', description: 'Print a note, reminder, or task', handler: this.handlePrintCommand.bind(this) },
    ];

    logger.info('PrinterBot initialized');
  }

  public start() {
    this.tgBot.setMyCommands(this.commands);
    this.tgBot.on('message', (msg) => {
      this.handleMessage(msg);
    });

    logger.info('PrinterBot started');
  }

  private handleMessage(message: Message) {
    const receivedText = message.text?.toLowerCase();
    const chatId = message.chat.id;
    const userId = message.from?.id;

    logger.info(`Received message from chatId: ${chatId}, userId: ${userId}, text: ${receivedText}`);

    if (!receivedText || !userId) {
      this.sendHelperText(message.chat.id);
      return;
    }

    const command = this.commands.find((cmdItem) => `/${cmdItem.command}` === receivedText);

    if (!command) {
      this.sendHelperText(message.chat.id);
      return;
    }

    command.handler(chatId, userId);
  }

  private sendHelperText(chatId: number) {
    const commandsText = this.commands.map(({ command, description }) => `• /${command} - ${description}`).join('\n');
    const responseText = `✨ Available Commands ✨\n\n${commandsText}`;

    logger.info(`Sending helper text to chatId: ${chatId}`);
    this.tgBot.sendMessage(chatId, responseText);
  }

  private handlePrintCommand(chatId: number, userId?: number) {
    logger.info(`Handling print command for chatId: ${chatId}, userId: ${userId}`);

    this.tgBot.sendMessage(chatId, 'What do you want to print? (note, reminder, task)').then(() => {
      this.tgBot.once('message', (msg) => {
        const text = msg.text?.toLowerCase();
        logger.info(`Received response for print command: ${text}`);

        if (text === 'reminder') {
          this.handleReminder(chatId, userId);
        } else if (text === 'note') {
          this.handleNote(chatId, userId);
        } else if (text === 'task') {
          this.handleTask(chatId, userId);
        } else {
          this.sendHelperText(chatId);
        }
      });
    });
  }

  private handleReminder(chatId: number, userId?: number) {
    logger.info(`Handling reminder for chatId: ${chatId}, userId: ${userId}`);
    this.tgBot.sendMessage(chatId, 'Please enter the date for the reminder (e.g., 2024-06-08):').then(() => {
      this.tgBot.once('message', (msg) => {
        const date = msg.text;
        logger.info(`Received reminder date: ${date}`);

        this.tgBot.sendMessage(chatId, 'Please enter the reminder message:').then(() => {
          this.tgBot.once('message', (msg) => {
            const message = msg.text;
            logger.info(`Received reminder message: ${message}`);

            const output = this.formatOutput('reminder', userId, date, message);
            this.tgBot.sendMessage(chatId, output);
          });
        });
      });
    });
  }

  private handleNote(chatId: number, userId?: number) {
    logger.info(`Handling note for chatId: ${chatId}, userId: ${userId}`);
    this.tgBot.sendMessage(chatId, 'Please enter the note message:').then(() => {
      this.tgBot.once('message', (msg) => {
        const message = msg.text;
        logger.info(`Received note message: ${message}`);

        const output = this.formatOutput('note', userId, undefined, message);
        this.tgBot.sendMessage(chatId, output);
      });
    });
  }

  private handleTask(chatId: number, userId?: number) {
    logger.info(`Handling task for chatId: ${chatId}, userId: ${userId}`);
    this.tgBot.sendMessage(chatId, 'Please enter the task message:').then(() => {
      this.tgBot.once('message', (msg) => {
        const message = msg.text;
        logger.info(`Received task message: ${message}`);

        const output = this.formatOutput('task', userId, undefined, message, true);
        this.tgBot.sendMessage(chatId, output);
      });
    });
  }

  private formatOutput(
    type: 'reminder' | 'note' | 'task',
    userId?: number,
    date?: string,
    message?: string,
    isTask: boolean = false,
  ): string {
    const user = userId ? `User ID: ${userId}` : '';
    const timestamp = new Date().toISOString();
    let output = `Type: ${type}\n${user}\nDate: ${timestamp}\n`;

    if (type === 'reminder' && date) {
      output += `Reminder Date: ${date}\n`;
    }
    if (isTask) {
      output += `Task: [ ] ${message}\n`;
    } else {
      output += `Message: ${message}\n`;
    }

    logger.info(`Formatted output: ${output}`);
    return output;
  }
}
