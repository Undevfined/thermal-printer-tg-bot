import TelegramBot, { InlineKeyboardMarkup, Message, User } from 'node-telegram-bot-api';
import Config from '../config.js';
import { AvailablePrintModes, InputPrompt, PrintModeAction, PrinterBotCommand } from './types.js';
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

  private async handleReminder({ chatId, user }: { chatId: number; user: User }) {
    logger.debug(`Handling reminder for chatId: ${chatId}, userId: ${user.id}`);

    const inputPrompts: InputPrompt[] = [
      {
        prompt: 'Please enter the date for the reminder (e.g., 08/06/2024):',
        validator: this.isDateValid.bind(this),
        expectedFormat: '08/06/2024',
      },
      {
        prompt: 'Please enter the event to be reminded:',
      },
    ];

    const userInputs = await this.collectUserInputs({ chatId, inputPrompts });

    const text = `${userInputs[0]}
Due: ${userInputs[1]}`;

    this.tgBot.sendMessage(chatId, this.formatOutput({ user, type: 'reminder', text }));
  }

  private async handleNote({ chatId, user }: { chatId: number; user: User }) {
    logger.info(`Handling note for chatId: ${chatId}, userId: ${user.id}`);

    const inputPrompts: InputPrompt[] = [
      {
        prompt: 'Please enter the note message:',
      },
    ];

    const userInputs = await this.collectUserInputs({ chatId, inputPrompts });
    const text = userInputs[0];

    this.tgBot.sendMessage(chatId, this.formatOutput({ user, type: 'note', text }));
  }

  private async handleTask({ chatId, user }: { chatId: number; user: User }) {
    logger.info(`Handling task for chatId: ${chatId}, userId: ${user.id}`);

    const inputPrompts: InputPrompt[] = [
      {
        prompt: 'Please enter the task:',
      },
    ];

    const userInputs = await this.collectUserInputs({ chatId, inputPrompts });
    const text = `[_] ${userInputs[0]}`;

    this.tgBot.sendMessage(chatId, this.formatOutput({ user, type: 'task', text }));
  }

  private async collectUserInputs({
    chatId,
    inputPrompts,
  }: {
    chatId: number;
    inputPrompts: InputPrompt[];
  }): Promise<string[]> {
    const inputs: string[] = [];

    for (const inputPrompt of inputPrompts) {
      let userInput = await this.collectSingleUserInput({ chatId, prompt: inputPrompt.prompt });
      logger.debug(`Received user input: ${userInput}`);

      while (!userInput) {
        userInput = await this.collectSingleUserInput({
          chatId,
          prompt: 'This input cannot be empty. Please enter it:',
        });
      }

      // TODO: Improve this conditional
      while (!userInput || (inputPrompt.validator && !inputPrompt.validator(userInput))) {
        userInput = await this.collectSingleUserInput({
          chatId,
          prompt: `This input does not follow the expected format (${inputPrompt.expectedFormat}). Please re-enter it:`,
        });
      }

      inputs.push(userInput);
    }

    return inputs;
  }

  private async collectSingleUserInput({
    chatId,
    prompt,
  }: {
    chatId: number;
    prompt: string;
  }): Promise<string | undefined> {
    return new Promise<string | undefined>((resolve) => {
      this.tgBot.sendMessage(chatId, prompt).then(() => {
        this.tgBot.once('message', (msg) => {
          resolve(msg.text);
        });
      });
    });
  }

  private formatOutput({ type, user, text }: { type: AvailablePrintModes; user: User; text: string }): string {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;

    const output = `\`\`\`
    ${this.capitalizeFirstChar(type)}

    Author: ${user.username}(${user.id})
    At: ${formattedDate}

    ----------

    ${text}
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
