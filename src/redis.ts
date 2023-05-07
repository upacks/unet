import RedisIO from "ioredis"
import { Uid, log } from 'utils'

interface iRedisArgs {
    id?: string
    name?: string
    host?: string
    port?: number
    on?: (type: string, message: string) => any
}

/** REDIS-CLIENT */
export const Redis = (args: iRedisArgs) => {

    args.id = args.id ?? Uid()
    args.name = args.name ?? Uid()

    const cb = args.on ?? ((type: string, message: string) => {
        type !== 'info' && type !== 'success' && log[type](`${args.name} / ${message} `)
    })

    const conf = (key) => ({
        id: `${args.id}-${key}`,
        name: `${args.name}-${key}`,
        host: "localhost",
        port: 6379,
        retryStrategy: (times: number) => Math.min(times * 250, 15000),
        ...args,
    })

    const Redis: { Pub: RedisIO, Sub: RedisIO } = {
        Pub: new RedisIO(conf('pub')),
        Sub: new RedisIO(conf('sub')),
    }

    Redis.Pub
        .on('connect', () => cb('success', 'Publisher: Connected'))
        .on('ready', () => cb('info', 'Ready'))
        .on('error', (e) => cb('error', e.message))
        .on('close', () => cb('warn', 'Close'))
        .on('reconnecting', () => cb('warn', 'Reconnecting...'))
        .on('end', () => cb('warn', 'End'))

    Redis.Sub
        .on('connect', () => cb('success', 'Subscriber: Connected'))
        .on('ready', () => cb('info', 'Ready'))
        .on('error', (e) => cb('error', e.message))
        .on('close', () => cb('warn', 'Close'))
        .on('reconnecting', () => cb('warn', 'Reconnecting...'))
        .on('end', () => cb('warn', 'End'))

    return Redis

}