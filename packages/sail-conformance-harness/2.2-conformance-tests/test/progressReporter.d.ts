/**
 * Custom Mocha reporter that shows an amber in-progress indicator when each test
 * starts, then updates the indicator to a green tick or red cross when the test completes.
 */
export declare class ProgressReporter extends Mocha.reporters.Base {
    private testElements;
    private suiteStack;
    private canvas;
    private passCount;
    private failCount;
    private durationCount;
    private startTime;
    private durationTimer;
    constructor(runner: Mocha.Runner, options?: Mocha.MochaOptions);
    private onSuite;
    private onSuiteEnd;
    private onTest;
    private onPass;
    private onFail;
    private onEnd;
    private getSpeedClass;
    private addDuration;
    private buildStatItem;
    private updateDuration;
    private updateStats;
}
