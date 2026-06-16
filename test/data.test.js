"use strict";

// The schedule data file assigns window.TOURNAMENTS as a plain <script> would in a
// browser; stub `window` so the same file can be loaded as-is under Node.
global.window = global.window || {};
require("../data/world-cup-2026.js");

var test = require("./harness").test;
var assertEqual = require("./harness").assertEqual;
var Logic = require("../logic.js");

var tournament = window.TOURNAMENTS["2026"];
var ALL_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

test("2026 data file exposes exactly 104 matches", function () {
  assertEqual(tournament.matches.length, 104);
});

test("match numbers are unique and cover 1..104 with none missing", function () {
  var numbers = tournament.matches.map(function (m) { return m.number; }).sort(function (a, b) { return a - b; });
  for (var i = 0; i < 104; i++) {
    assertEqual(numbers[i], i + 1, "match number slot " + (i + 1));
  }
});

test("every match's date/time parses to a valid UTC instant", function () {
  tournament.matches.forEach(function (m) {
    var start = Logic.matchStartUTC(tournament, m);
    if (isNaN(start.getTime())) {
      throw new Error("match " + m.number + " has an unparseable date/time: " + m.date + " " + m.timeET);
    }
  });
});

test("each of the 12 groups has exactly 6 group-stage matches", function () {
  var counts = {};
  tournament.matches
    .filter(function (m) { return m.stage === "Group Stage"; })
    .forEach(function (m) { counts[m.group] = (counts[m.group] || 0) + 1; });
  ALL_GROUPS.forEach(function (g) {
    assertEqual(counts[g], 6, "group " + g + " match count");
  });
});

test("knockout-stage matches have no group assigned", function () {
  tournament.matches
    .filter(function (m) { return m.stage !== "Group Stage"; })
    .forEach(function (m) {
      if (m.group) throw new Error("match " + m.number + " (" + m.stage + ") unexpectedly has group " + m.group);
    });
});

test("every match has an explicit boolean teamsConfirmed flag", function () {
  tournament.matches.forEach(function (m) {
    if (typeof m.teamsConfirmed !== "boolean") {
      throw new Error("match " + m.number + " has a non-boolean teamsConfirmed: " + JSON.stringify(m.teamsConfirmed));
    }
  });
});

test("group-stage matches always have confirmed teams (group draw fixes them upfront)", function () {
  tournament.matches
    .filter(function (m) { return m.stage === "Group Stage"; })
    .forEach(function (m) {
      assertEqual(m.teamsConfirmed, true, "match " + m.number);
    });
});

test("matchTitle never returns an empty string for any match in the data file", function () {
  tournament.matches.forEach(function (m) {
    if (!Logic.matchTitle(m)) {
      throw new Error("match " + m.number + " produced an empty title");
    }
  });
});

test("the final (match 104) kicks off 2026-07-19 at 19:00 UTC (3:00 PM ET)", function () {
  var final = tournament.matches.filter(function (m) { return m.number === 104; })[0];
  var start = Logic.matchStartUTC(tournament, final);
  assertEqual(start.toISOString(), "2026-07-19T19:00:00.000Z");
});

test("the opening match (match 1) kicks off 2026-06-11 at 19:00 UTC (3:00 PM ET)", function () {
  var opener = tournament.matches.filter(function (m) { return m.number === 1; })[0];
  var start = Logic.matchStartUTC(tournament, opener);
  assertEqual(start.toISOString(), "2026-06-11T19:00:00.000Z");
});
