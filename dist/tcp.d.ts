/// <reference types="node" />
import Net from 'net';
interface iHostCb {
    (data: Net.Socket | any): void;
}
export declare class NetServer {
    host: string;
    port: number;
    alias: string;
    server: Net.Server;
    clients: Net.Socket[];
    secret: string;
    constructor({ host, port, secret }: {
        host?: string;
        port?: number;
        secret?: string;
    }, cb: iHostCb);
    verify: (token: any) => any;
    create: (cb: iHostCb) => void;
}
export declare class NetClient {
    client: any;
    config: any;
    callback: any;
    last: number;
    constructor({ host, port, token }: {
        host?: string;
        port?: number;
        token?: string;
    }, cb: any);
    log: (s: any) => void;
    restart: () => void;
    start: () => void;
}
export {};
//# sourceMappingURL=tcp.d.ts.map