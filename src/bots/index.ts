import { easyBot } from './easy'
import { hardBot } from './hard'
import { mediumBot } from './medium'
import type { Bot } from './types'

export type BotLevel = 'easy' | 'medium' | 'hard'

export const BOTS: Readonly<Record<BotLevel, Bot>> = {
  easy: easyBot,
  medium: mediumBot,
  hard: hardBot,
}
