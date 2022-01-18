import { PlexCollection } from './collection.interface';
import { Media } from './media.interface';

export interface PlexLibraryItem {
  ratingKey: string;
  parentRatingKey?: string;
  grandparentRatingKey?: string;
  title: string;
  guid: string;
  parentGuid?: string;
  grandparentGuid?: string;
  addedAt: number;
  updatedAt: number;
  Guid?: {
    id: string;
  }[];
  type: 'movie' | 'show' | 'season' | 'episode' | 'collection';
  Media: Media[];
  librarySectionTitle: string;
  librarySectionID: number;
  librarySectionKey: string;
  summary: string;
  viewCount: number;
  skipCount: number;
  lastViewedAt: number;
  year: number;
  duration: number;
  originallyAvailableAt: string;
  rating: number;
  genre?: PlexGenre[];
  role?: PlexActor[];
}

export interface PlexLibraryResponse {
  MediaContainer: {
    totalSize: number;
    Metadata: PlexLibraryItem[] | PlexCollection[];
  };
}
export interface PlexGenre {
  id: number;
  filter: string;
  tag: string;
}

export interface PlexActor {
  id: number;
  filter: string;
  tag: string; // contains name
  role: string;
  thumb: string;
}

export interface PlexLibrary {
  type: 'show' | 'movie';
  key: string;
  title: string;
  agent: string;
}

export interface PlexLibrariesResponse {
  MediaContainer: {
    Directory: PlexLibrary[];
  };
}

export interface PlexHubResponse {
  MediaContainer: {
    Size: string;
    Hub: PlexHub[];
  };
}

export interface PlexHub {
  identifier: string;
  title: string;
  recommendationsVisibility: 'none' | string;
  homeVisibility: 'none' | string;
  promotedToRecommended: boolean;
  promotedToOwnHome: boolean;
  promotedToSharedHome: boolean;
  deletable: boolean;
}

export interface PlexSeenBy extends PlexLibraryItem {
  historyKey: string;
  key: string;
  ratingKey: string;
  title: string;
  thumb: string;
  originallyAvailableAt: string;
  viewedAt: number;
  accountID: number;
  deviceID: number;
}