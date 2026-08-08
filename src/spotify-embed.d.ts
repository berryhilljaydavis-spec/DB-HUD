/** Minimal typings for Spotify's embed iFrame API (no official package). */
declare namespace SpotifyEmbed {
  interface PlaybackData {
    isPaused: boolean;
    isBuffering: boolean;
    position: number;
    duration: number;
  }

  interface Controller {
    loadUri(uri: string): void;
    play(): void;
    pause(): void;
    resume(): void;
    togglePlay(): void;
    seek(seconds: number): void;
    destroy(): void;
    addListener(event: 'ready', cb: () => void): void;
    addListener(event: 'playback_update', cb: (event: { data: PlaybackData }) => void): void;
  }

  interface Options {
    uri: string;
    width?: number | string;
    height?: number | string;
  }

  interface API {
    createController(
      element: HTMLElement,
      options: Options,
      callback: (controller: Controller) => void,
    ): void;
  }
}

interface Window {
  onSpotifyIframeApiReady?: (api: SpotifyEmbed.API) => void;
}
