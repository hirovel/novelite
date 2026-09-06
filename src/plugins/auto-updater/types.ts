export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  publishedAt?: string;
  releaseTitle?: string;
  releaseNotes?: string;
  htmlUrl?: string;
  assets?: ReleaseAsset[];
}
