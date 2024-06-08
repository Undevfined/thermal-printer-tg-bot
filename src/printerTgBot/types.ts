type AvailableCommands = 'print'; // TODO: Add more commands

export type PrinterBotCommand = {
  command: AvailableCommands;
  description: string;
  handler: ({ chatId, userId }: { chatId: number; userId: number }) => void;
};

const availablePrintModes = ['note', 'reminder', 'task'] as const;

export type AvailablePrintModes = (typeof availablePrintModes)[number];

export type PrintModeAction = {
  printMode: AvailablePrintModes;
  action: ({ chatId, userId }: { chatId: number; userId?: number }) => void;
};
