// Pure calendar/filtering logic, deliberately kept free of DOM access so it can be
// loaded both in the browser (as window.WorldCupLogic) and in plain Node for tests
// (via require('./logic.js')) without needing a DOM/browser environment.
(function (root) {
  "use strict";

  var MATCH_DURATION_HOURS = 2; // 90 min + halftime + stoppage, used for calendar event length

  // Match kickoff is stored as US Eastern Time (date + timeET) with a fixed UTC offset
  // for the whole tournament (see data file comment re: no DST transitions in range).
  function matchStartUTC(tournament, match) {
    var iso = match.date + "T" + match.timeET + ":00-0" + tournament.utcOffsetHours + ":00";
    return new Date(iso);
  }

  function matchEndUTC(tournament, match) {
    var start = matchStartUTC(tournament, match);
    return new Date(start.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toICSDateUTC(date) {
    return (
      date.getUTCFullYear() +
      pad2(date.getUTCMonth() + 1) +
      pad2(date.getUTCDate()) +
      "T" +
      pad2(date.getUTCHours()) +
      pad2(date.getUTCMinutes()) +
      pad2(date.getUTCSeconds()) +
      "Z"
    );
  }

  function toGoogleDateUTC(date) {
    return toICSDateUTC(date); // same format Google Calendar expects
  }

  // Knockout matches start out with placeholder opponents (e.g. "Winner of Match 74")
  // until the feeding matches are actually played. Until then, just show the round name
  // (e.g. "Final") rather than the placeholder text.
  function matchTitle(match) {
    if (match.teamsConfirmed === false) return match.stage;
    return match.teamA + " vs " + match.teamB;
  }

  function matchDescription(tournament, match) {
    var lines = [tournament.name, "Match " + match.number + " - " + match.stage];
    if (match.group) lines.push("Group " + match.group);
    return lines.join("\n");
  }

  function matchLocation(match) {
    return match.stadium + ", " + match.city;
  }

  // ISO 3166-1 alpha-2 codes for every team name used in the data files, used to render
  // flag emoji. England/Scotland aren't sovereign states so they use the special Unicode
  // "tag sequence" flags (black flag + subdivision tag chars) instead of a 2-letter code.
  var TEAM_COUNTRY_CODES = {
    "Algeria": "DZ",
    "Argentina": "AR",
    "Australia": "AU",
    "Austria": "AT",
    "Belgium": "BE",
    "Bosnia and Herzegovina": "BA",
    "Brazil": "BR",
    "Cabo Verde": "CV",
    "Canada": "CA",
    "Colombia": "CO",
    "Croatia": "HR",
    "Curaçao": "CW",
    "Czechia": "CZ",
    "DR Congo": "CD",
    "Ecuador": "EC",
    "Egypt": "EG",
    "England": "GB-ENG",
    "France": "FR",
    "Germany": "DE",
    "Ghana": "GH",
    "Haiti": "HT",
    "Iran": "IR",
    "Iraq": "IQ",
    "Ivory Coast": "CI",
    "Japan": "JP",
    "Jordan": "JO",
    "Mexico": "MX",
    "Morocco": "MA",
    "Netherlands": "NL",
    "New Zealand": "NZ",
    "Norway": "NO",
    "Panama": "PA",
    "Paraguay": "PY",
    "Portugal": "PT",
    "Qatar": "QA",
    "Saudi Arabia": "SA",
    "Scotland": "GB-SCT",
    "Senegal": "SN",
    "South Africa": "ZA",
    "South Korea": "KR",
    "Spain": "ES",
    "Sweden": "SE",
    "Switzerland": "CH",
    "Tunisia": "TN",
    "Türkiye": "TR",
    "United States": "US",
    "Uruguay": "UY",
    "Uzbekistan": "UZ",
  };

  // Returns the lowercase flag code used to build "flags/<code>.svg" (matching the
  // flagcdn.com naming scheme the SVGs were sourced from), or "" for placeholder/
  // unrecognized team names so callers can render unconfirmed knockout matchups
  // without a flag instead of failing.
  function teamFlagCode(teamName) {
    var code = TEAM_COUNTRY_CODES[teamName];
    return code ? code.toLowerCase() : "";
  }

  var CITY_TIMEZONES = {
    "Arlington, TX":       "America/Chicago",
    "Atlanta, GA":         "America/New_York",
    "East Rutherford, NJ": "America/New_York",
    "Foxborough, MA":      "America/New_York",
    "Guadalupe, Mexico":   "America/Monterrey",
    "Houston, TX":         "America/Chicago",
    "Kansas City, MO":     "America/Chicago",
    "Los Angeles, CA":     "America/Los_Angeles",
    "Mexico City, Mexico": "America/Mexico_City",
    "Miami Gardens, FL":   "America/New_York",
    "Philadelphia, PA":    "America/New_York",
    "Santa Clara, CA":     "America/Los_Angeles",
    "Seattle, WA":         "America/Los_Angeles",
    "Toronto, Canada":     "America/Toronto",
    "Vancouver, Canada":   "America/Vancouver",
    "Zapopan, Mexico":     "America/Mexico_City",
  };

  function venueTimezone(match) {
    return CITY_TIMEZONES[match.city] || "America/New_York";
  }

  function formatET(match) {
    var hour = parseInt(match.timeET.slice(0, 2), 10);
    var minute = match.timeET.slice(3, 5);
    var suffix = hour >= 12 ? "PM" : "AM";
    var hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return hour12 + ":" + minute + " " + suffix + " ET";
  }

  function escapeICSText(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  function buildICS(tournament, match, now) {
    var start = matchStartUTC(tournament, match);
    var end = matchEndUTC(tournament, match);
    var stamp = now || new Date();
    var uid = "worldcup-" + tournament.id + "-match-" + match.number + "@football-calendar";
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//World Cup Calendar//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + toICSDateUTC(stamp),
      "DTSTART:" + toICSDateUTC(start),
      "DTEND:" + toICSDateUTC(end),
      "SUMMARY:" + escapeICSText(matchTitle(match) + " - " + tournament.name),
      "LOCATION:" + escapeICSText(matchLocation(match)),
      "DESCRIPTION:" + escapeICSText(matchDescription(tournament, match)),
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    return lines.join("\r\n");
  }

  function buildGoogleCalendarUrl(tournament, match) {
    var start = matchStartUTC(tournament, match);
    var end = matchEndUTC(tournament, match);
    var params = new URLSearchParams({
      action: "TEMPLATE",
      text: matchTitle(match) + " - " + tournament.name,
      dates: toGoogleDateUTC(start) + "/" + toGoogleDateUTC(end),
      details: matchDescription(tournament, match),
      location: matchLocation(match),
    });
    return "https://calendar.google.com/calendar/render?" + params.toString();
  }

  // now: optional epoch ms (or Date), defaults to the current time. Accepting it as a
  // parameter (rather than always reading Date.now() internally) is what makes this
  // testable without mocking the clock.
  function isPlayed(tournament, match, now) {
    var current = now === undefined ? Date.now() : +now;
    return current > matchEndUTC(tournament, match).getTime();
  }

  // filters: { search, stage, group, status } -- all optional, "" / undefined means "no filter".
  function matchMatchesFilters(tournament, match, filters, now) {
    filters = filters || {};
    if (filters.stage && match.stage !== filters.stage) return false;
    if (filters.group && match.group !== filters.group) return false;
    if (filters.status === "upcoming" && isPlayed(tournament, match, now)) return false;
    if (filters.status === "played" && !isPlayed(tournament, match, now)) return false;
    if (filters.search) {
      var needle = filters.search.toLowerCase();
      var haystack = (match.teamA + " " + match.teamB).toLowerCase();
      if (haystack.indexOf(needle) === -1) return false;
    }
    return true;
  }

  var WorldCupLogic = {
    matchStartUTC: matchStartUTC,
    matchEndUTC: matchEndUTC,
    toICSDateUTC: toICSDateUTC,
    toGoogleDateUTC: toGoogleDateUTC,
    matchTitle: matchTitle,
    matchDescription: matchDescription,
    matchLocation: matchLocation,
    teamFlagCode: teamFlagCode,
    venueTimezone: venueTimezone,
    formatET: formatET,
    escapeICSText: escapeICSText,
    buildICS: buildICS,
    buildGoogleCalendarUrl: buildGoogleCalendarUrl,
    isPlayed: isPlayed,
    matchMatchesFilters: matchMatchesFilters,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = WorldCupLogic;
  } else {
    root.WorldCupLogic = WorldCupLogic;
  }
})(typeof window !== "undefined" ? window : globalThis);
