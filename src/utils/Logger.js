const winston = require("winston");

const levelFilter = (level) => {
  return winston.format((info) => {
    return info.level === level ? info : false;
  })();
};

const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.splat(), // ⭐ IMPORTANT
    winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
    winston.format.printf(({ timestamp, level, message, metadata }) => {
      let extra = "";

      // If exactly one extra argument was passed
      if (metadata && metadata[0] !== undefined) {
        const value = metadata[0];
        extra =
          typeof value === "string" ? ` ${value}` : ` ${JSON.stringify(value)}`;
      }

      return `${timestamp} [${level.toUpperCase()}]: ${message}${extra}`;
    }),
  ),
  transports: [
    new winston.transports.File({
      filename: "logs/info.log",
      level: "info",
      format: levelFilter("info"),
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: levelFilter("error"),
    }),
    new winston.transports.File({
      filename: "logs/warn.log",
      level: "warn",
      format: levelFilter("warn"),
    }),
    new winston.transports.File({
      filename: "logs/http.log",
      level: "http",
      format: levelFilter("http"),
    }),
    new winston.transports.File({
      filename: "logs/verbose.log",
      level: "verbose",
      format: levelFilter("verbose"),
    }),
    new winston.transports.File({
      filename: "logs/debug.log",
      level: "debug",
      format: levelFilter("debug"),
    }),
    new winston.transports.File({
      filename: "logs/silly.log",
      level: "silly",
      format: levelFilter("silly"),
    }),
  ],
});

module.exports = logger;

// Loggers.error("This is an error message");
// Loggers.warn("This is a warning message");
// Loggers.info("This is some informational message");
// Loggers.http("This is an HTTP log");
// Loggers.verbose("This is a verbose message");
// Loggers.debug("This is a debug message");
// Loggers.silly("This is a silly log message");
