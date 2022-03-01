const winston = require("winston");

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.printf((log) => log.message),
    }),
    new winston.transports.File({
      filename: "deploys.log",
      format: winston.format.printf((log) => log.message),
    }),
  ],
});

module.exports = logger;
