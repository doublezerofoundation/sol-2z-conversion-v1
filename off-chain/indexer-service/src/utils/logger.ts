export enum LogLevel {
     ERROR = 0,
     WARN = 1,
     INFO = 2,
     DEBUG = 3
}

export interface LoggerConfig {
     level: LogLevel;
     service: string;
     timestamp: boolean;
     colors: boolean;
}

export class Logger {
     private config: LoggerConfig;
     private static instance: Logger;

     constructor(config: Partial<LoggerConfig> = {}) {
          this.config = {
               level: LogLevel.INFO,
               service: 'indexer-service',
               timestamp: true,
               colors: true,
               ...config
          };
     }

     public static getInstance(config?: Partial<LoggerConfig>): Logger {
          if (!Logger.instance) {
               Logger.instance = new Logger(config);
          }
          return Logger.instance;
     }

     private shouldLog(level: LogLevel): boolean {
          return level <= this.config.level;
     }

     private formatMessage(level: string, message: string, meta?: any): string {
          const parts: string[] = [];

          // Timestamp
          if (this.config.timestamp) {
               parts.push(`[${new Date().toISOString()}]`);
          }

          // Service name
          parts.push(`[${this.config.service}]`);

          // Log level
          if (this.config.colors) {
               const coloredLevel = this.colorizeLevel(level);
               parts.push(`[${coloredLevel}]`);
          } else {
               parts.push(`[${level}]`);
          }

          // Message
          parts.push(message);

          let logLine = parts.join(' ');

          // Add metadata if provided
          if (meta) {
               logLine += ` ${JSON.stringify(meta)}`;
          }

          return logLine;
     }

     private colorizeLevel(level: string): string {
          const colors = {
               ERROR: '\x1b[31m', // Red
               WARN: '\x1b[33m',  // Yellow
               INFO: '\x1b[36m',  // Cyan
               DEBUG: '\x1b[37m', // White
               RESET: '\x1b[0m'   // Reset
          };

          const color = colors[level as keyof typeof colors] || colors.INFO;
          return `${color}${level}${colors.RESET}`;
     }

     public error(message: string, meta?: any): void {
          if (this.shouldLog(LogLevel.ERROR)) {
               const formattedMessage = this.formatMessage('ERROR', message, meta);
               console.error(formattedMessage);
          }
     }

     public warn(message: string, meta?: any): void {
          if (this.shouldLog(LogLevel.WARN)) {
               const formattedMessage = this.formatMessage('WARN', message, meta);
               console.warn(formattedMessage);
          }
     }

     public info(message: string, meta?: any): void {
          if (this.shouldLog(LogLevel.INFO)) {
               const formattedMessage = this.formatMessage('INFO', message, meta);
               console.log(formattedMessage);
          }
     }

     public debug(message: string, meta?: any): void {
          if (this.shouldLog(LogLevel.DEBUG)) {
               const formattedMessage = this.formatMessage('DEBUG', message, meta);
               console.log(formattedMessage);
          }
     }

     // Set log level 
     public setLevel(level: LogLevel): void {
          this.config.level = level;
          this.info(`Log level set to ${LogLevel[level]}`);
     }

     // Get current config
     public getConfig(): LoggerConfig {
          return { ...this.config };
     }
}

export const logger = Logger.getInstance();
