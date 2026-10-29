import type { StudioOutputType } from '@muninn/shared';
import {
  AudioLinesIcon,
  FileTextIcon,
  GraduationCapIcon,
  type LucideIcon,
  MessageCircleQuestionMarkIcon,
} from 'lucide-react';

export interface StudioOutputMeta {
  title: string;
  description: string;
  Icon: LucideIcon;
}

export const STUDIO_OUTPUT_META: Record<StudioOutputType, StudioOutputMeta> = {
  BRIEFING: {
    title: 'Briefing',
    description: 'Kompakter Überblick über deine Quellen',
    Icon: FileTextIcon,
  },
  FAQ: {
    title: 'FAQ',
    description: 'Häufige Fragen mit belegten Antworten',
    Icon: MessageCircleQuestionMarkIcon,
  },
  STUDY_GUIDE: {
    title: 'Lernleitfaden',
    description: 'Lernziele, Begriffe und Verständnisfragen',
    Icon: GraduationCapIcon,
  },
  AUDIO: {
    title: 'Rabenbericht',
    description: 'Hugin & Munin sprechen über deine Quellen',
    Icon: AudioLinesIcon,
  },
};
