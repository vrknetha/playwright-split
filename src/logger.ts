import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: process.env.DEBUG === "true" ? "debug" : "info",
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(
      ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`
    )
  ),
  transports: [new transports.Console()],
});

export default logger;
