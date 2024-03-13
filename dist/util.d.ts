export declare const Op: any;
export declare const isAsync: (p: any) => boolean;
export declare const execute: (f: any, req: any, res: any, content: any) => Promise<unknown>;
export declare const tryAuthorize: (token?: string, secret?: string) => {
    proj: any;
    type: string;
    name: any;
    level: number;
    status: boolean;
    message: string;
} | {
    status: boolean;
    message: any;
};
export declare const authenticate: (req: any) => {
    proj: any;
    type: string;
    name: any;
    level: number;
};
//# sourceMappingURL=util.d.ts.map