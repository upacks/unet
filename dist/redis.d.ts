import RedisIO from "ioredis";
interface iRedisArgs {
    id?: string;
    name?: string;
    host?: string;
    port?: number;
    on?: (type: string, message: string) => any;
}
/** REDIS-CLIENT */
export declare const Redis: (args: iRedisArgs) => {
    Pub: RedisIO;
    Sub: RedisIO;
};
export {};
//# sourceMappingURL=redis.d.ts.map