import Redis from 'ioredis'

declare global {
  var __ioRedis: Redis | undefined
}

export function getIoRedis(): Redis {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL env var is not set')
  if (!global.__ioRedis) {
    global.__ioRedis = new Redis(process.env.REDIS_URL)
  }
  return global.__ioRedis
}

