export type MediaFile = {
  key: string;
  url: string;
  type: 'image' | 'video';
  size?: number;
  lastModified?: string;
};

export type FolderItem = {
  key: string;
  name: string;
};

export type MediaResponse = {
  prefix: string;
  folders: FolderItem[];
  files: MediaFile[];
};

export type MessageTone = 'info' | 'success' | 'error';
