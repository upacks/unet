export declare class Proxy {
    apiProxy: any;
    constructor();
    http: (req: any, res: any, url: any) => any;
    ws: (req: any, socket: any, head: any, url: any) => any;
}
export declare class Core {
    config: {
        port0: number;
        port: number;
        redisChannel: string;
        keepAliveTimeout: number;
        headersTimeout: number;
    };
    store: {};
    redis: any;
    constructor(conf: any);
    start: () => void;
    stop: () => void;
}
//# sourceMappingURL=proxy.d.ts.map