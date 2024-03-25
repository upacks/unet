import { Request, Response } from 'express';
export type tUser = {
    proj: string;
    type: string;
    name: string;
    level: number;
};
export interface iUser {
    user?: tUser;
}
export declare class Host {
    server: any;
    io: any;
    app: any;
    requests: any;
    name: string;
    timeout: number;
    port: number;
    redis: boolean;
    secret: string;
    constructor(conf: {
        name: string; /** name alias **/
        port?: number;
        static?: string; /** if serves static **/
        timeout?: number; /** request timeout **/
        redis?: boolean; /** use redis **/
        secret?: string; /** jwt hash **/
    });
    emit: (channel: string, data: any) => void;
    emitBy: (channel: string, data: any, cb: (user: tUser & {
        status: boolean;
        message: string;
    }) => boolean) => void;
    /** Depricated **/
    _on: (channel: string, callback: (req: Request, res: Response) => void, authorize?: boolean) => void;
    on: (channel: string, callback: (req: iUser & Request, res: Response) => void, authorize?: boolean) => void;
    exit: () => void;
}
//# sourceMappingURL=host.d.ts.map