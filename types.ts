export type AspectRatio = '3:4' | '1:1' | '9:16';

// Since the standard DOM types don't include camera zoom and torch, we extend them here.
// This is a common pattern for dealing with browser-specific or newer APIs.
export interface ZoomableMediaTrackCapabilities extends MediaTrackCapabilities {
  zoom?: {
    min: number;
    max: number;
    step: number;
  };
  torch?: boolean;
}

export interface ZoomableMediaTrackSettings extends MediaTrackSettings {
  zoom?: number;
  torch?: boolean;
}

export interface ZoomableMediaTrackConstraintSet extends MediaTrackConstraintSet {
  zoom?: number;
  torch?: boolean;
}
