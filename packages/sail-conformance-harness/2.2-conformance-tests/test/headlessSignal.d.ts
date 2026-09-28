/**
 * Headless-mode signalling for the conformance suite.
 *
 * When the conformance app is launched with a `?suite=` query parameter it runs
 * unattended and announces its progress and final result on four independent
 * channels, so that whatever is driving the run - Playwright, the desktop agent
 * hosting the iframe, or another FDC3 app - can tell when it has finished.
 *
 *  1. `window.__FDC3_CONFORMANCE__` plus a `data-conformance` attribute on
 *     `<body>`. For same-origin browser automation (`page.waitForFunction`).
 *  2. A `console.log` sentinel line. Survives cross-origin iframes and can be
 *     scraped straight out of CI logs.
 *  3. `postMessage` to `window.parent` and `window.opener`. For a desktop agent
 *     hosting this app in an iframe or popup.
 *  4. An FDC3 broadcast on a dedicated app channel. For a collector app
 *     registered in the desktop agent's app directory.
 *
 * None of this runs unless headless mode is requested, so the interactive UI is
 * completely unaffected.
 */
import { DesktopAgent } from '@finos/fdc3';
/** Prefix of the single-line console message carrying the final result. */
export declare const RESULT_SENTINEL = "FDC3_CONFORMANCE_RESULT";
/** Prefix of the per-test console progress messages. */
export declare const STATUS_SENTINEL = "FDC3_CONFORMANCE_STATUS";
/** App channel the final result is broadcast on. */
export declare const RESULT_CHANNEL_ID = "fdc3-conformance-results";
/** Context type of the broadcast result. */
export declare const RESULT_CONTEXT_TYPE = "fdc3.conformance.result";
export type ConformanceTestState = 'passed' | 'failed' | 'pending';
export type ConformanceTestResult = {
    /** Full title, including the enclosing suite names. */
    title: string;
    /** Title of the immediately enclosing suite. */
    suite: string;
    state: ConformanceTestState;
    durationMs?: number;
    error?: string;
    stack?: string;
};
export type ConformanceRunning = {
    status: 'running';
    suite: string;
    completed: number;
    total: number;
};
export type ConformanceComplete = {
    status: 'complete';
    suite: string;
    passes: number;
    failures: number;
    pending: number;
    total: number;
    durationMs: number;
    startedAt: string;
    finishedAt: string;
    userAgent: string;
    tests: ConformanceTestResult[];
};
export type ConformanceError = {
    status: 'error';
    suite: string;
    error: string;
    stack?: string;
};
export type ConformanceState = ConformanceRunning | ConformanceComplete | ConformanceError;
declare global {
    interface Window {
        __FDC3_CONFORMANCE__?: ConformanceState;
    }
}
/**
 * Reports a failure that happened before (or instead of) a test run - most
 * commonly `getAgent()` never resolving, or an unknown suite name.
 */
export declare function signalError(suite: string, error: unknown, agent?: DesktopAgent): void;
/**
 * Attaches the signal emitters to a Mocha runner. Must be called synchronously
 * in the same tick as `mocha.run()` so that no events are missed.
 */
export declare function attachSignals(runner: Mocha.Runner, suite: string, agent?: DesktopAgent): void;
