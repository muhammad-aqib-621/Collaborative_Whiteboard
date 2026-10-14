import { nanoid } from 'nanoid'
import type { LocalUser } from '@/types/collab'
import { USER_COLORS } from './constants'

const ADJECTIVES = [
  'brave',
  'calm',
  'clever',
  'cosmic',
  'curious',
  'eager',
  'gentle',
  'happy',
  'jolly',
  'lucky',
  'mellow',
  'nimble',
  'quiet',
  'speedy',
  'sunny',
  'witty',
]

const ANIMALS = [
  'otter',
  'falcon',
  'panda',
  'fox',
  'heron',
  'koala',
  'lynx',
  'narwhal',
  'octopus',
  'owl',
  'quokka',
  'robin',
  'seal',
  'tiger',
  'walrus',
  'yak',
]

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export function randomUserName(): string {
  return `${capitalize(pick(ADJECTIVES))} ${capitalize(pick(ANIMALS))}`
}

export function createLocalUser(): LocalUser {
  return { id: nanoid(10), name: randomUserName(), color: pick(USER_COLORS) }
}

export function generateRoomId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${digits}`
}

export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{3,64}$/

export function normalizeRoomId(input: string): string | null {
  const trimmed = input.trim()
  // Accept either a bare id or a full board link.
  const fromLink = trimmed.match(/#\/board\/([A-Za-z0-9_-]{3,64})/)
  const candidate = fromLink?.[1] ?? trimmed
  return ROOM_ID_PATTERN.test(candidate) ? candidate : null
}
