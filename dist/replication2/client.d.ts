/// <reference types="node" />
export declare class ReplicaHost {
    cf: {
        step: number;
        interval: number;
    };
    constructor({ bidirectional, interval }: {
        bidirectional?: boolean;
        interval?: number;
    });
    log: (x: any) => boolean;
    /** Get latest from host **/
    last: () => Promise<void>;
    /** Pull N from host according to last(x) **/
    pull: () => Promise<void>;
    /** Pull N from host according to last(x) **/
    push: () => Promise<void>;
    save: () => Promise<void>;
    try_run: () => NodeJS.Timer;
}
//# sourceMappingURL=client.d.ts.map