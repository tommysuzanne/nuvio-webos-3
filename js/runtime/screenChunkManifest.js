// Shared by the loader, route registry and packaging checks.
export const SCREEN_CHUNK_MANIFEST = [
  { id: "player", entry: "js/ui/screens/player/playerScreen.js", routes: {player:"PlayerScreen"} },
  { id: "detail", entry: "js/ui/screens/detail/metaDetailsScreen.js", routes: {detail:"MetaDetailsScreen"} },
  { id: "search", entry: "js/ui/screens/search/searchScreen.js", routes: {search:"SearchScreen"} },
  { id: "discover", entry: "js/ui/screens/search/discoverScreen.js", routes: {discover:"DiscoverScreen"} },
  { id: "settings", entry: "js/ui/screens/settings/settingsChunk.js",
    routes: {settings:"SettingsScreen",trakt:"TraktScreen",supportersContributors:"SupportersContributorsScreen"} },
  { id: "stream", entry: "js/ui/screens/stream/streamScreen.js", routes: {stream:"StreamScreen"} }
];
