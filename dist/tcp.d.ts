/// <reference types="node" />
import Net from 'net';
interface iHostCb {
    (data: Net.Socket | any): void;
}
interface ServerSocket extends Net.Socket {
    authenticate: (token: string) => any | null; /** Nullable **/
}
interface ClientSocket extends Net.Socket {
    authenticate: (token: string) => void;
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
    }, cb: (client: ServerSocket) => void);
    verify: (token: any) => any;
    create: (cb: iHostCb) => void;
}
export declare class NetClient {
    client: any;
    config: any;
    callback: (client: ClientSocket) => void;
    last: number;
    constructor({ host, port, token }: {
        host?: string;
        port?: number;
        token?: string;
    }, cb: (client: ClientSocket) => void);
    log: (s: any) => boolean;
    restart: () => void;
    start: () => void;
}
export {};
//# sourceMappingURL=tcp.d.ts.map