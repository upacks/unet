export declare class Connection {
    private cio;
    private caxios;
    name: string;
    token: string;
    proxy: string;
    timeout: number;
    constructor(conf: {
        name: string; /** host name **/
        proxy?: string; /** proxy server **/
        token?: string; /** bearer **/
        timeout?: number; /** request timeout **/
    });
    connect: () => any;
    exit: () => any;
    /** _____________________________________________________________ HTTP-Client _____________________________________________________________ **/
    res: (response: any) => any;
    rej: (error: any) => any;
    get: (channel: any, data: any) => Promise<unknown>;
    set: (channel: any, data: any) => Promise<unknown>;
    pull: (channel: any, data: any, cb: any) => Promise<any>;
    push: (channel: any, data: any, cb: any) => Promise<any>;
    poll: (channel: any, data: any, cb: any) => void;
    /** _____________________________________________________________ WS-Client _____________________________________________________________ **/
    emit: (channel: any, data: any, cb: any) => void;
    on: (channel: any, cb: any) => void;
}
//# sourceMappingURL=connection.d.ts.map