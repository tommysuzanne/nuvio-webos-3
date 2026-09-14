import { TraktScrobbleService } from "./traktScrobbleService.js";
import { SimklScrobbleService } from "./simklScrobbleService.js";

const providers = [TraktScrobbleService, SimklScrobbleService];

function enabledProviders() {
  return providers.filter((provider) => provider.isEnabled());
}

export const TrackingScrobbleService = {
  isEnabled() {
    return enabledProviders().length > 0;
  },

  start(context) {
    enabledProviders().forEach((provider) => provider.start(context));
  },

  pause(context) {
    enabledProviders().forEach((provider) => provider.pause(context));
  },

  stop(context) {
    enabledProviders().forEach((provider) => provider.stop(context));
  },

  cancel() {
    providers.forEach((provider) => provider.cancel());
  }
};
