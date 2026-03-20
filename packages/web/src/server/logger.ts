import pino from 'pino'

/**
 * Logger instance for the Sail server.
 * 
 * Log levels (in order of verbosity):
 * - trace: Most verbose, rarely used
 * - debug: Event details, message traces, protocol events
 * - info: Important operational messages (server started, connections established)
 * - warn: Warning conditions
 * - error: Error conditions
 * - fatal: System unusable
 * 
 * Set LOG_LEVEL environment variable to control output:
 * - LOG_LEVEL=debug  (shows debug and above)
 * - LOG_LEVEL=info   (shows info and above, default)
 * - LOG_LEVEL=error  (shows only errors)
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname'
            }
        }
})

/**
 * Create a child logger with a specific module name prefix.
 * Useful for identifying which part of the system generated a log message.
 */
export function createLogger(module: string) {
    return logger.child({ module })
}
