import winston from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configure logger to never log sensitive data
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    // Custom formatter to strip sensitive data
    winston.format((info) => {
      // Never log environment variables or secrets
      delete info.env
      delete info.process
      return info
    })()
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`
        })
      )
    }),
    // Data errors log
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/data-errors.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // Pipeline log
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/pipeline.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
})

export default logger
