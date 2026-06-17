(function () {
  "use strict";

  var Logic = window.WorldCupLogic;

  var state = {
    tournamentId: null,
    search: "",
    stage: "",
    group: "",
    status: "upcoming",
  };

  var els = {
    tournamentSelect: document.getElementById("tournament-select"),
    searchInput: document.getElementById("search-input"),
    statusSelect: document.getElementById("status-select"),
    stageSelect: document.getElementById("stage-select"),
    groupSelect: document.getElementById("group-select"),
    matchList: document.getElementById("match-list"),
    resultCount: document.getElementById("result-count"),
  };

  function getTournament() {
    return window.TOURNAMENTS[state.tournamentId];
  }

  function formatLocalDateTime(date) {
    var dateStr = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
    var parts = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "longGeneric",
    }).formatToParts(date);
    var timeStr = parts.map(function (p) { return p.value; }).join("").trim();
    return dateStr + " - " + timeStr;
  }

  function formatVenueTime(start, match) {
    var tz = Logic.venueTimezone(match);
    var dateStr = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: tz,
    }).format(start);
    var timeParts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: tz,
    }).formatToParts(start);
    var timeStr = timeParts.map(function (p) { return p.value; }).join("").trim();
    return dateStr + " · " + timeStr + " (" + match.city + ")";
  }

  function downloadICS(tournament, match) {
    var content = Logic.buildICS(tournament, match);
    var blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "match-" + match.number + "-" + Logic.matchTitle(match).replace(/\s+/g, "") + ".ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function populateStaticControls() {
    els.tournamentSelect.innerHTML = "";
    Object.keys(window.TOURNAMENTS).forEach(function (id) {
      var opt = document.createElement("option");
      opt.value = id;
      opt.textContent = window.TOURNAMENTS[id].name;
      els.tournamentSelect.appendChild(opt);
    });
    state.tournamentId = els.tournamentSelect.value;
  }

  function populateDependentControls() {
    var tournament = getTournament();
    var stages = [];
    var groups = [];
    tournament.matches.forEach(function (m) {
      if (stages.indexOf(m.stage) === -1) stages.push(m.stage);
      if (m.group && groups.indexOf(m.group) === -1) groups.push(m.group);
    });
    groups.sort();

    els.stageSelect.innerHTML = '<option value="">All stages</option>';
    stages.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      els.stageSelect.appendChild(opt);
    });

    els.groupSelect.innerHTML = '<option value="">All groups</option>';
    groups.forEach(function (g) {
      var opt = document.createElement("option");
      opt.value = g;
      opt.textContent = "Group " + g;
      els.groupSelect.appendChild(opt);
    });
  }

  // Knockout-stage matches have no group (match.group is null), so the group filter
  // is meaningless once a non-"Group Stage" stage is selected -- disable it and clear
  // any previously chosen group rather than silently filtering everything out.
  function updateGroupFilterAvailability() {
    var disable = !!state.stage && state.stage !== "Group Stage";
    els.groupSelect.disabled = disable;
    if (disable && state.group) {
      state.group = "";
      els.groupSelect.value = "";
    }
  }

  function buildTeamSpan(name) {
    var span = document.createElement("span");
    span.className = "team";
    var flagCode = Logic.teamFlagCode(name);
    if (flagCode) {
      var flagImg = document.createElement("img");
      flagImg.className = "flag";
      flagImg.src = "flags/" + flagCode + ".svg";
      flagImg.alt = "";
      flagImg.loading = "lazy";
      span.appendChild(flagImg);
    }
    span.appendChild(document.createTextNode(name));
    return span;
  }

  function renderMatchCard(tournament, match) {
    var start = Logic.matchStartUTC(tournament, match);
    var played = Logic.isPlayed(tournament, match);

    var card = document.createElement("article");
    card.className = "match-card" + (played ? " played" : "");

    var meta = document.createElement("div");
    meta.className = "match-meta";

    var timeLocal = document.createElement("div");
    timeLocal.className = "match-time";
    timeLocal.textContent = formatLocalDateTime(start);
    meta.appendChild(timeLocal);

    var timeVenue = document.createElement("div");
    timeVenue.className = "match-time-venue";
    timeVenue.textContent = formatVenueTime(start, match);
    meta.appendChild(timeVenue);

    var teams = document.createElement("div");
    teams.className = "match-teams";
    if (match.teamsConfirmed === false) {
      teams.textContent = Logic.matchTitle(match);
    } else {
      teams.appendChild(buildTeamSpan(match.teamA));
      var vs = document.createElement("span");
      vs.className = "vs";
      vs.textContent = "vs";
      teams.appendChild(vs);
      teams.appendChild(buildTeamSpan(match.teamB));
    }
    meta.appendChild(teams);

    var venue = document.createElement("div");
    venue.className = "match-venue";
    venue.textContent = match.stadium + " - " + match.city;
    meta.appendChild(venue);

    card.appendChild(meta);

    var badges = document.createElement("div");
    badges.className = "badges";

    var stageBadge = document.createElement("span");
    stageBadge.className = "badge";
    stageBadge.textContent = "Match " + match.number + " - " + match.stage;
    badges.appendChild(stageBadge);

    if (match.group) {
      var groupBadge = document.createElement("span");
      groupBadge.className = "badge";
      groupBadge.textContent = "Group " + match.group;
      badges.appendChild(groupBadge);
    }

    var statusBadge = document.createElement("span");
    statusBadge.className = "badge " + (played ? "status-played" : "status-upcoming");
    statusBadge.textContent = played ? "Played" : "Upcoming";
    badges.appendChild(statusBadge);

    card.appendChild(badges);

    var actions = document.createElement("div");
    actions.className = "actions";

    var gcalLink = document.createElement("a");
    gcalLink.href = Logic.buildGoogleCalendarUrl(tournament, match);
    gcalLink.target = "_blank";
    gcalLink.rel = "noopener";
    gcalLink.textContent = "Add to Google Calendar";
    actions.appendChild(gcalLink);

    var icsButton = document.createElement("button");
    icsButton.type = "button";
    icsButton.textContent = "Download .ics";
    icsButton.addEventListener("click", function () {
      downloadICS(tournament, match);
    });
    actions.appendChild(icsButton);

    card.appendChild(actions);

    return card;
  }

  function render() {
    var tournament = getTournament();
    var matches = tournament.matches
      .filter(function (match) {
        return Logic.matchMatchesFilters(tournament, match, state);
      })
      .slice()
      .sort(function (a, b) {
        return Logic.matchStartUTC(tournament, a) - Logic.matchStartUTC(tournament, b);
      });

    els.matchList.innerHTML = "";

    if (matches.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No matches match your filters.";
      els.matchList.appendChild(empty);
    } else {
      matches.forEach(function (match) {
        els.matchList.appendChild(renderMatchCard(tournament, match));
      });
    }

    els.resultCount.textContent = matches.length + " of " + tournament.matches.length + " matches";
  }

  function attachListeners() {
    els.tournamentSelect.addEventListener("change", function () {
      state.tournamentId = els.tournamentSelect.value;
      state.stage = "";
      state.group = "";
      populateDependentControls();
      updateGroupFilterAvailability();
      render();
    });
    els.searchInput.addEventListener("input", function () {
      state.search = els.searchInput.value.trim();
      render();
    });
    els.statusSelect.addEventListener("change", function () {
      state.status = els.statusSelect.value;
      render();
    });
    els.stageSelect.addEventListener("change", function () {
      state.stage = els.stageSelect.value;
      updateGroupFilterAvailability();
      render();
    });
    els.groupSelect.addEventListener("change", function () {
      state.group = els.groupSelect.value;
      render();
    });
  }

  function init() {
    populateStaticControls();
    populateDependentControls();
    attachListeners();
    updateGroupFilterAvailability();
    render();
  }

  init();
})();
