import { createContext, useContext } from 'react';
import type { CharacterDto } from '../api/characters';
import type { LocationDto } from '../api/locations';
import type { OutlineDto } from '../api/outlines';

export type InternalLinkType = 'character' | 'location' | 'outline';

export interface InternalLinkTarget {
  id: string;
  name: string;
  type: InternalLinkType;
}

interface InternalLinkContextValue {
  characters: CharacterDto[];
  locations: LocationDto[];
  outlines: OutlineDto[];
  navigateTo: (type: InternalLinkType, id: string, name: string) => void;
}

export const InternalLinkContext = createContext<InternalLinkContextValue>({
  characters: [],
  locations: [],
  outlines: [],
  navigateTo: () => {},
});

export function useInternalLink() {
  return useContext(InternalLinkContext);
}
