/**
 * 日志管理器类
 * 提供企业级的日志记录功能，支持多种日志级别和自定义输出
 */
class Logger {
    /**
     * 日志级别枚举
     * @type {Object}
     */
    static LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
    };

    /**
     * 日志级别名称映射
     * @type {Object}
     */
    static LEVEL_NAMES = {
        0: 'DEBUG',
        1: 'INFO',
        2: 'WARN',
        3: 'ERROR',
    };

    /**
     * 控制台输出样式配置
     * @type {Object}
     */
    static CONSOLE_STYLES = {
        DEBUG: 'color: #888; font-weight: normal',
        INFO: 'color: #2196F3; font-weight: bold',
        WARN: 'color: #FF9800; font-weight: bold',
        ERROR: 'color: #F44336; font-weight: bold',
    };

    /**
     * 构造函数
     * @param {Object} config - 配置对象
     * @param {boolean} config.enabled - 是否启用日志
     * @param {string} config.level - 日志级别 (DEBUG/INFO/WARN/ERROR)
     * @param {Function} config.onLog - 日志回调函数
     * @param {boolean} config.consoleOutput - 是否输出到控制台
     */
    constructor(config = {}) {
        this.enabled = config.enabled || false;
        this.level = Logger.LEVELS[config.level] !== undefined
            ? Logger.LEVELS[config.level]
            : Logger.LEVELS.INFO;
        this.onLog = typeof config.onLog === 'function' ? config.onLog : null;
        this.consoleOutput = config.consoleOutput !== false;
        this.sessionId = this._generateSessionId();
    }

    /**
     * 生成会话ID
     * @private
     * @returns {string} 会话ID
     */
    _generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取当前时间戳（ISO 8601格式）
     * @private
     * @returns {string} 时间戳
     */
    _getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * 记录日志
     * @private
     * @param {number} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Object} metadata - 元数据
     */
    _log(level, message, metadata = {}) {
        // 如果未启用日志或级别不足，则不记录
        if (!this.enabled || level < this.level) {
            return;
        }

        const logEntry = {
            timestamp: this._getTimestamp(),
            sessionId: this.sessionId,
            level: Logger.LEVEL_NAMES[level],
            message,
            metadata,
        };

        // 输出到控制台
        if (this.consoleOutput && typeof console !== 'undefined') {
            this._consoleLog(logEntry);
        }

        // 调用自定义回调
        if (this.onLog) {
            try {
                this.onLog(logEntry);
            } catch (error) {
                // 防止日志回调错误影响主流程
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[Logger] Error in onLog callback:', error);
                }
            }
        }
    }

    /**
     * 输出到浏览器控制台
     * @private
     * @param {Object} logEntry - 日志条目
     */
    _consoleLog(logEntry) {
        const { level, message, metadata, timestamp } = logEntry;
        const style = Logger.CONSOLE_STYLES[level] || '';
        const prefix = `[${timestamp}] [${level}]`;

        // 根据日志级别选择控制台方法
        const consoleMethod = level === 'ERROR' ? 'error'
            : level === 'WARN' ? 'warn'
                : level === 'DEBUG' ? 'debug'
                    : 'log';

        if (Object.keys(metadata).length > 0) {
            console[consoleMethod](`%c${prefix} ${message}`, style, metadata);
        } else {
            console[consoleMethod](`%c${prefix} ${message}`, style);
        }
    }

    /**
     * 记录调试信息
     * @param {string} message - 日志消息
     * @param {Object} metadata - 元数据
     */
    debug(message, metadata) {
        this._log(Logger.LEVELS.DEBUG, message, metadata);
    }

    /**
     * 记录一般信息
     * @param {string} message - 日志消息
     * @param {Object} metadata - 元数据
     */
    info(message, metadata) {
        this._log(Logger.LEVELS.INFO, message, metadata);
    }

    /**
     * 记录警告信息
     * @param {string} message - 日志消息
     * @param {Object} metadata - 元数据
     */
    warn(message, metadata) {
        this._log(Logger.LEVELS.WARN, message, metadata);
    }

    /**
     * 记录错误信息
     * @param {string} message - 日志消息
     * @param {Object} metadata - 元数据
     */
    error(message, metadata) {
        this._log(Logger.LEVELS.ERROR, message, metadata);
    }

    /**
     * 更新日志级别
     * @param {string} level - 新的日志级别
     */
    setLevel(level) {
        if (Logger.LEVELS[level] !== undefined) {
            this.level = Logger.LEVELS[level];
        }
    }

    /**
     * 启用日志
     */
    enable() {
        this.enabled = true;
    }

    /**
     * 禁用日志
     */
    disable() {
        this.enabled = false;
    }
}

export default Logger;
