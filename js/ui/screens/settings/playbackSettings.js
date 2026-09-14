import { PlayerSettingsStore } from "../../../data/local/playerSettingsStore.js";

export const PlaybackSettings = {
  getItems() {
    const settings = PlayerSettingsStore.get();

    return [
      {
        id: "playback_toggle_autoplay",
        label: `Autoplay Next: ${settings.autoplayNextEpisode ? "ON" : "OFF"}`,
        description: "Toggle automatic next episode",
        action: () => {
          PlayerSettingsStore.set({
            autoplayNextEpisode: !PlayerSettingsStore.get().autoplayNextEpisode
          });
        }
      }
    ];
  }
};
