import TelegramBot, { InlineKeyboardMarkup, Message, User } from 'node-telegram-bot-api';
import Config from '../config.js';
import { AvailablePrintModes, PrintModeAction, PrinterBotCommand } from './types.js';
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

    logger.info('Printer Bot initialized');
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
    const user = message.from;

    logger.debug(
      `Received message from chatId: ${chatId}, user: ${user?.username}(${user?.id}), text: ${receivedText}`,
    );

    if (!receivedText || !user?.id) {
      this.sendHelperText(message.chat.id);
      return;
    }

    const command = this.commands.find((cmdItem) => `/${cmdItem.command}` === receivedText);

    if (!command) {
      this.sendHelperText(message.chat.id);
      return;
    }

    command.handler({ chatId, user });
  }

  private sendHelperText(chatId: number) {
    const commandsText = this.commands.map(({ command, description }) => `• /${command} - ${description}`).join('\n');
    const responseText = `✨ Available Commands ✨\n\n${commandsText}`;

    logger.debug(`Sending helper text to chatId: ${chatId}`);
    this.tgBot.sendMessage(chatId, responseText);
  }

  private handlePrintCommand({ chatId, user }: { chatId: number; user: User }) {
    logger.debug(`Handling print command for chatId: ${chatId}, userId: ${user.id}`);

    const printModeActions: PrintModeAction[] = [
      {
        printMode: 'note',
        action: this.handleNote.bind(this),
      },
      {
        printMode: 'reminder',
        action: this.handleReminder.bind(this),
      },
      {
        printMode: 'task',
        action: this.handleTask.bind(this),
      },
    ];

    const userChoices = this.buildUserChoices(printModeActions);

    // Send the message with the inline keyboard
    this.tgBot
      .sendMessage(chatId, 'What do you want to print?', {
        reply_markup: userChoices,
      })
      .then(() => {
        this.tgBot.once('callback_query', (query) => {
          const printModeAction = printModeActions.find((item) => item.printMode === query.data);

          if (!printModeAction) {
            logger.error(`Error while reading the print mode chosen by the user ${user.id}`);
            return;
          }

          printModeAction.action({ chatId, user });
        });
      })
      .catch((error) => {
        logger.error(`Error sending choices to the user: ${error}`);
      });
  }

  private handleReminder({ chatId, user }: { chatId: number; user: User }) {
    logger.debug(`Handling reminder for chatId: ${chatId}, userId: ${user.id}`);

    this.tgBot.sendMessage(chatId, 'Please enter the date for the reminder (e.g., 08/06/2024):').then(() => {
      this.tgBot.once('message', (msg) => {
        const date = this.isDateValid(msg.text) ? msg.text : undefined;

        this.tgBot.sendMessage(chatId, 'Please enter the event to be reminded:').then(() => {
          this.tgBot.once('message', (msg) => {
            const event = msg.text;

            if (!event) {
              this.tgBot.sendMessage(chatId, 'Event cannot be empty. Please enter the note message:');
              return this.handleReminder({ chatId, user });
            }

            const output = this.formatOutput({ type: 'reminder', user, dueDate: date, message: event });
            this.tgBot.sendMessage(chatId, output);
          });
        });
      });
    });
  }

  private handleNote({ chatId, user }: { chatId: number; user: User }) {
    logger.info(`Handling note for chatId: ${chatId}, userId: ${user.id}`);
    this.tgBot.sendMessage(chatId, 'Please enter the note message:').then(() => {
      this.tgBot.once('message', (msg) => {
        const message = msg.text;
        logger.info(`Received note message: ${message}`);

        if (!message) {
          this.tgBot.sendMessage(chatId, 'Note message cannot be empty. Please enter the note message:');
          return this.handleNote({ chatId, user });
        }

        const output = this.formatOutput({ type: 'note', user, message });
        this.tgBot.sendMessage(chatId, output);
      });
    });
  }

  private handleTask({ chatId, user }: { chatId: number; user: User }) {
    logger.info(`Handling task for chatId: ${chatId}, userId: ${user.id}`);
    this.tgBot.sendMessage(chatId, 'Please enter the task message:').then(() => {
      this.tgBot.once('message', (msg) => {
        const message = msg.text;
        logger.info(`Received task message: ${message}`);

        if (!message) {
          this.tgBot.sendMessage(chatId, 'Task message cannot be empty. Please enter the note message:');
          return this.handleNote({ chatId, user });
        }

        const output = this.formatOutput({ type: 'task', user, message });
        this.tgBot.sendMessage(chatId, output);
      });
    });
  }

  private formatOutput({
    type,
    user,
    dueDate,
    message,
  }: {
    type: AvailablePrintModes;
    user: User;
    dueDate?: string;
    message: string;
  }): string {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;

    const output = `\`\`\`
    ${this.capitalizeFirstChar(type)}

    Author: ${user.username}(${user.id})
    At: ${formattedDate}

    ----------

    ${type === 'task' ? '[_]' : ''} ${message}
    ${dueDate ? `Due: ${dueDate}` : ''}
\`\`\``;

    logger.info(`Formatted output: ${output}`);
    return output;
  }

  private buildUserChoices(printModeActions: PrintModeAction[]): InlineKeyboardMarkup {
    // Dynamically build userChoices from print mode actions
    const userChoices: InlineKeyboardMarkup = {
      inline_keyboard: printModeActions.map(({ printMode }) => [
        {
          text: this.capitalizeFirstChar(printMode),
          callback_data: printMode,
        },
      ]),
    };

    return userChoices;
  }

  private capitalizeFirstChar(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private isDateValid(date?: string): boolean {
    if (!date) return false;
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    return regex.test(date);
  }
}
