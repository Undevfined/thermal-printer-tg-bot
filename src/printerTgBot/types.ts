export type AvailableCommands = 'print'; // TODO: Add more commands

export type PrinterBotCommand = {
  command: AvailableCommands;
  description: string;
  handler: (chatId: number, userId: number) => void;
};
