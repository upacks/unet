export declare class ReplicaHost {
    constructor({ bidirectional }: {
        bidirectional?: boolean;
    });
    /** Get latest by source */
    last: () => Promise<void>;
    pull: () => Promise<void>;
    push: () => Promise<void>;
    save: () => Promise<void>;
}
//# sourceMappingURL=host.d.ts.map