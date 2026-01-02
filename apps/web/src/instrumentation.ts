

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
         let consoleCaptureLogger: any;
         try {
            const mod = await import('./lib/logger');
            consoleCaptureLogger = mod.consoleCaptureLogger;
         } catch (e) {
            // Silently fail or log to stderr if logger fails to load
         }
        
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        const originalConsoleInfo = console.info;

        console.log = (...args: any[]) => {
            const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            if (consoleCaptureLogger) consoleCaptureLogger.info(msg);
            originalConsoleLog.apply(console, args);
        };

        console.error = (...args: any[]) => {
            const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            if (consoleCaptureLogger) consoleCaptureLogger.error(msg);
            originalConsoleError.apply(console, args);
        };

        console.warn = (...args: any[]) => {
            const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            if (consoleCaptureLogger) consoleCaptureLogger.warn(msg);
            originalConsoleWarn.apply(console, args);
        };
        
        console.info = (...args: any[]) => {
             const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
             if (consoleCaptureLogger) consoleCaptureLogger.info(msg);
             originalConsoleInfo.apply(console, args);
        };
    }
}
