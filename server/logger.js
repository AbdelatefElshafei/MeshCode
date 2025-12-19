const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'orchestrator-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// If we wanted to log to a file in production, we could add:
// logger.add(new winston.transports.File({ filename: 'error.log', level: 'error' }));
// logger.add(new winston.transports.File({ filename: 'combined.log' }));

module.exports = logger;
