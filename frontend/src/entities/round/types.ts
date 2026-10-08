import type { components } from '@/shared/api/schema';

export type Round = components['schemas']['RoundDto'];
export type RoundSummary = components['schemas']['RoundResponseDto'];
export type RoundList = components['schemas']['RoundListResponseDto'];
export type TapResponse = components['schemas']['TapResponseDto'];
export type Winner = components['schemas']['WinnerDto'];
export type Participant = components['schemas']['ParticipantDto'];
export type RoundScope = 'current' | 'finished';
export type RoundPhase = 'cooldown' | 'active' | 'counting' | 'finished';
