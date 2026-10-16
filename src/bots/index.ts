import { easyBot } from './easy'
import { mediumBot } from './medium'
import type { Bot } from './types'

export type BotLevel = 'easy' | 'medium'

export const BOTS: Readonly<Record<BotLevel, Bot>> = { easy: easyBot, medium: mediumBot }
