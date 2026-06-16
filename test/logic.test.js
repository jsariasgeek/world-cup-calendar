"use strict";

var test = require("./harness").test;
var assertEqual = require("./harness").assertEqual;
var Logic = require("../logic.js");

var tournament = { id: "test", name: "Test Cup", utcOffsetHours: 4 };

var groupMatch = {
  number: 1,
  stage: "Group Stage",
  group: "A",
  date: "2026-06-11",
  timeET: "15:00",
  teamA: "Mexico",
  teamB: "South Africa",
  stadium: "Estadio Azteca",
  city: "Mexico City, Mexico",
  teamsConfirmed: true,
};

var knockoutMatch = {
  number: 90,
  stage: "Round of 16",
  group: null,
  date: "2026-07-04",
  timeET: "13:00",
  teamA: "Winner of Match 73",
  teamB: "Winner of Match 75",
  stadium: "NRG Stadium",
  city: "Houston, TX",
  teamsConfirmed: false,
};

var decidedKnockoutMatch = Object.assign({}, knockoutMatch, {
  teamA: "Argentina",
  teamB: "Portugal",
  teamsConfirmed: true,
});

test("matchStartUTC converts 15:00 ET to 19:00 UTC (EDT, UTC-4)", function () {
  var start = Logic.matchStartUTC(tournament, groupMatch);
  assertEqual(start.toISOString(), "2026-06-11T19:00:00.000Z");
});

test("matchEndUTC is exactly 2 hours after kickoff", function () {
  var start = Logic.matchStartUTC(tournament, groupMatch);
  var end = Logic.matchEndUTC(tournament, groupMatch);
  assertEqual(end.getTime() - start.getTime(), 2 * 60 * 60 * 1000);
});

test("a midnight ET kickoff rolls into the next UTC day", function () {
  var midnightMatch = Object.assign({}, groupMatch, { date: "2026-06-14", timeET: "00:00" });
  var start = Logic.matchStartUTC(tournament, midnightMatch);
  assertEqual(start.toISOString(), "2026-06-14T04:00:00.000Z");
});

test("toICSDateUTC formats as RFC 5545 basic UTC (no separators)", function () {
  var date = new Date("2026-06-11T19:00:00.000Z");
  assertEqual(Logic.toICSDateUTC(date), "20260611T190000Z");
});

test("matchTitle joins both teams with 'vs' when teams are confirmed", function () {
  assertEqual(Logic.matchTitle(groupMatch), "Mexico vs South Africa");
});

test("matchTitle falls back to the stage/round name when teams aren't confirmed yet", function () {
  assertEqual(Logic.matchTitle(knockoutMatch), "Round of 16");
});

test("matchTitle shows real teams again once a knockout matchup is decided", function () {
  assertEqual(Logic.matchTitle(decidedKnockoutMatch), "Argentina vs Portugal");
});

test("matchDescription includes the group line for group-stage matches", function () {
  assertEqual(Logic.matchDescription(tournament, groupMatch), "Test Cup\nMatch 1 - Group Stage\nGroup A");
});

test("matchDescription omits the group line for knockout matches", function () {
  assertEqual(Logic.matchDescription(tournament, knockoutMatch), "Test Cup\nMatch 90 - Round of 16");
});

test("escapeICSText escapes commas, semicolons, backslashes and newlines", function () {
  assertEqual(Logic.escapeICSText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("buildICS embeds DTSTART/DTEND/SUMMARY/LOCATION for the match", function () {
  var ics = Logic.buildICS(tournament, groupMatch, new Date("2026-01-01T00:00:00Z"));
  assertEqual(ics.indexOf("DTSTART:20260611T190000Z") !== -1, true);
  assertEqual(ics.indexOf("DTEND:20260611T210000Z") !== -1, true);
  assertEqual(ics.indexOf("SUMMARY:Mexico vs South Africa - Test Cup") !== -1, true);
  assertEqual(ics.indexOf("LOCATION:Estadio Azteca\\, Mexico City\\, Mexico") !== -1, true);
  assertEqual(ics.indexOf("BEGIN:VCALENDAR") !== -1, true);
  assertEqual(ics.indexOf("END:VCALENDAR") !== -1, true);
});

test("buildICS uses the round name as SUMMARY when teams aren't confirmed yet", function () {
  var ics = Logic.buildICS(tournament, knockoutMatch, new Date("2026-01-01T00:00:00Z"));
  assertEqual(ics.indexOf("SUMMARY:Round of 16 - Test Cup") !== -1, true);
});

test("buildGoogleCalendarUrl points at the Google Calendar render endpoint with the right UTC range", function () {
  var url = Logic.buildGoogleCalendarUrl(tournament, groupMatch);
  assertEqual(url.indexOf("https://calendar.google.com/calendar/render?"), 0);
  assertEqual(url.indexOf("action=TEMPLATE") !== -1, true);
  assertEqual(url.indexOf("dates=20260611T190000Z%2F20260611T210000Z") !== -1, true);
});

test("isPlayed is false before kickoff and true after the match has ended", function () {
  var before = new Date("2026-06-11T18:00:00Z").getTime();
  var after = new Date("2026-06-11T22:00:00Z").getTime();
  assertEqual(Logic.isPlayed(tournament, groupMatch, before), false);
  assertEqual(Logic.isPlayed(tournament, groupMatch, after), true);
});

test("matchMatchesFilters: stage filter only keeps matching stage", function () {
  assertEqual(Logic.matchMatchesFilters(tournament, groupMatch, { stage: "Final" }), false);
  assertEqual(Logic.matchMatchesFilters(tournament, groupMatch, { stage: "Group Stage" }), true);
});

test("matchMatchesFilters: group filter excludes knockout matches (group is null)", function () {
  assertEqual(Logic.matchMatchesFilters(tournament, knockoutMatch, { group: "A" }), false);
});

test("matchMatchesFilters: search matches either team, case-insensitively", function () {
  assertEqual(Logic.matchMatchesFilters(tournament, groupMatch, { search: "mexico" }), true);
  assertEqual(Logic.matchMatchesFilters(tournament, groupMatch, { search: "MEXICO" }), true);
  assertEqual(Logic.matchMatchesFilters(tournament, groupMatch, { search: "brazil" }), false);
});

test("teamFlagCode returns the lowercase ISO code used for the flag image filename", function () {
  assertEqual(Logic.teamFlagCode("Mexico"), "mx");
});

test("teamFlagCode uses the special subdivision code for England", function () {
  assertEqual(Logic.teamFlagCode("England"), "gb-eng");
});

test("teamFlagCode returns an empty string for an unrecognized/placeholder name", function () {
  assertEqual(Logic.teamFlagCode("Winner of Match 74"), "");
});

test("matchMatchesFilters: status=upcoming hides played matches, status=played hides upcoming ones", function () {
  var afterFullTime = new Date("2026-06-11T22:00:00Z").getTime();
  assertEqual(Logic.matchMatchesFilters(tournament, groupMatch, { status: "upcoming" }, afterFullTime), false);
  assertEqual(Logic.matchMatchesFilters(tournament, groupMatch, { status: "played" }, afterFullTime), true);
});
