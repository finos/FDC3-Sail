import mocha from 'mocha';
type testSet = {
    [key: string]: (() => Promise<Mocha.Suite>)[];
};
export declare const allTests: testSet;
export declare const allManualTests: testSet;
export declare const packs: {
    [index: string]: string[];
};
export declare function getPackNames(): string[];
export declare function getPackMembers(packName: string): string[];
/**
 * Called synchronously with the Mocha runner the moment the run starts, before
 * any test has had a chance to report. Used by headless mode to attach its
 * result listeners without missing events.
 */
export type RunnerCallback = (runner: Mocha.Runner) => void;
/**
 * Intended for running tests in container with results shown
 * in HTML page
 */
export declare const executeTestsInBrowser: (pack: string, onRunner?: RunnerCallback) => Promise<mocha.Runner>;
/**
 * Intended for running Manual tests in container with results shown
 * in HTML page
 */
export declare const executeManualTestsInBrowser: (pack: string, onRunner?: RunnerCallback) => Promise<mocha.Runner>;
export {};
