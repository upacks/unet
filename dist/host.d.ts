export interface iHost {
    name: string; /** name alias **/
    port?: number;
    static?: string; /** if serves static **/
    timeout?: number; /** request timeout **/
    redis?: boolean; /** use redis **/
}
export declare class Host {
    private server;
    private requests;
    io: any;
    app: any;
    name: string;
    timeout: number;
    port: number;
    redis: boolean;
    constructor(conf: iHost);
    emit: (channel: string, data: any) => void;
    on: (channel: string, callback: any) => void;
    exit: () => void;
}
//# sourceMappingURL=host.d.ts.map