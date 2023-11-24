import { Request, Response } from 'express';
type UserRequest = Request & {
    user: {
        proj: string;
        user: string;
        level: number;
    };
};
export declare class Host {
    server: any;
    io: any;
    app: any;
    requests: any;
    name: string;
    timeout: number;
    port: number;
    redis: boolean;
    constructor(conf: {
        name: string; /** name alias **/
        port?: number;
        static?: string; /** if serves static **/
        timeout?: number; /** request timeout **/
        redis?: boolean; /** use redis **/
    });
    emit: (channel: string, data: any) => void;
    _on: (channel: string, callback: (req: Request, res: Response) => void, authorize?: boolean) => void;
    on: (channel: string, callback: (req: UserRequest, res: Response) => void, authorize?: boolean) => void;
    exit: () => void;
}
export {};
//# sourceMappingURL=host.d.ts.map