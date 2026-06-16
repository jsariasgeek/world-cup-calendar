// Minimal zero-dependency test harness (deliberately not using node:test, since the
// project targets plain Node with no installed packages and no minimum Node version
// requirement beyond what's already needed to run a static file server).
"use strict";

var passed = 0;
var failed = 0;
var failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    failures.push({ name: name, err: err });
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      (message ? message + " -- " : "") +
        "expected " + JSON.stringify(expected) + " but got " + JSON.stringify(actual)
    );
  }
}

function report() {
  failures.forEach(function (f) {
    console.error("FAIL: " + f.name);
    console.error("  " + f.err.message);
  });
  console.log("\n" + passed + " passed, " + failed + " failed");
  if (failed > 0) process.exitCode = 1;
}

module.exports = { test: test, assertEqual: assertEqual, report: report };
