"use strict";
/**
 * Simple logger utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor(context, level = LogLevel.INFO) {
        this.context = context;
        this.level = level;
    }
    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(`[${new Date().toISOString()}] [DEBUG] [${this.context}]`, message, ...args);
        }
    }
    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.log(`[${new Date().toISOString()}] [INFO] [${this.context}]`, message, ...args);
        }
    }
    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(`[${new Date().toISOString()}] [WARN] [${this.context}]`, message, ...args);
        }
    }
    error(message, ...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(`[${new Date().toISOString()}] [ERROR] [${this.context}]`, message, ...args);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=index.js.map