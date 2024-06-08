import chalk from 'chalk';

const levels = {
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
  debug: chalk.green,
};

const log = (level: keyof typeof levels, message: string) => {
  const timestamp = new Date().toISOString();
  const colorize = levels[level] || chalk.white;
  console.log(colorize(`[${timestamp}] [${level.toUpperCase()}]: ${message}`));
};

export const logger = {
  info: (message: string) => log('info', message),
  warn: (message: string) => log('warn', message),
  error: (message: string) => log('error', message),
  debug: (message: string) => log('debug', message),
};
