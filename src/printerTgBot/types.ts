import { User } from 'node-telegram-bot-api';

type AvailableCommands = 'print'; // TODO: Add more commands

export type PrinterBotCommand = {
  command: AvailableCommands;
  description: string;
  handler: ({ chatId, user }: { chatId: number; user: User }) => void;
};

const availablePrintModes = ['note', 'reminder', 'task'] as const;

export type AvailablePrintModes = (typeof availablePrintModes)[number];

export type PrintModeAction = {
  printMode: AvailablePrintModes;
  action: ({ chatId, user }: { chatId: number; user: User }) => void;
};

export type InputPrompt = {
  prompt: string;
  validator?: (inputData?: string) => boolean;
  expectedFormat?: string;
};
