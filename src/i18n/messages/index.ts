import type { Dictionary, Lang } from '../core'
import { en } from './en'
import { zhTW } from './zh-TW'

export type MessageKey = keyof typeof zhTW

export const dictionaries: Record<Lang, Dictionary> = { 'zh-TW': zhTW, en }
