// Ported from Android NuvioTV domain/model/ImdbRatingVisibility.kt so the web app
// applies the same IMDB rating visibility rules.
//
// The home setting controls home ratings and the standard title rating shown on
// the detail screen. An active MDBList rating always takes priority over the
// standard detail rating.

export const HOME_IMDB_RATINGS_VISIBILITY = {
  SHOW_ALL: "SHOW_ALL",
  HIDE_ALL: "HIDE_ALL"
};

export function normalizeHomeImdbRatingsVisibility(value) {
  return value === HOME_IMDB_RATINGS_VISIBILITY.HIDE_ALL
    ? HOME_IMDB_RATINGS_VISIBILITY.HIDE_ALL
    : HOME_IMDB_RATINGS_VISIBILITY.SHOW_ALL;
}

// Home rows and hero ratings.
export function showHomeRatings(visibility) {
  return normalizeHomeImdbRatingsVisibility(visibility) === HOME_IMDB_RATINGS_VISIBILITY.SHOW_ALL;
}

// Standard title rating on the detail screen. An active MDBList rating takes
// priority and always hides the standard rating.
export function showStandardDetailRatings(visibility, isMdbListActive) {
  return showHomeRatings(visibility) && !isMdbListActive;
}
