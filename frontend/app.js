/**
 * SitWell dashboard controller.
 *
 * This file manages the manual browser demo, sitting sessions, navigation,
 * downloads, and small popups. The backend and motor are not connected here.
 * Hardware settings live in config.js; educational content lives in learn.js.
 */
(() => {
  'use strict';
  // Shared settings come from the Arduino/Python reference, loaded before this file.
  const CONFIG = window.SITWELL_CONFIG;
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'sitwell.demo.v1';
  const GRACE_MS = CONFIG.session.interruptionBufferMs;
  const PRESSURE_THRESHOLD = CONFIG.hardware.pressureThreshold;
  const MIN_SESSION_MS = CONFIG.session.minimumSavedMs;
  const DEMO_FSR_SIGNAL = CONFIG.demo.seatedAdc;
  const DEMO_AWAY_SIGNAL = CONFIG.demo.awayAdc;
  const DEMO_SIGNAL_MAX = CONFIG.hardware.adcMax;

  // Time formatting is kept here so timers, tables, and downloads agree.
  const now = () => Date.now();
  const dayKey = (timestamp) => new Date(timestamp).toLocaleDateString('en-CA');
  const today = () => dayKey(now());
  const escapeHTML = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
  const timeLabel = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const clock = (ms) => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
      .map((x) => String(x).padStart(2, '0'))
      .join(':');
  };
  const countdown = (ms) => {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return (
      String(Math.floor(seconds / 60)).padStart(2, '0') +
      ':' +
      String(seconds % 60).padStart(2, '0')
    );
  };
  const shortDuration = (ms) => {
    const minutes = Math.floor(Math.max(0, ms) / 60000);
    return minutes >= 60
      ? Math.floor(minutes / 60) + 'h ' + String(minutes % 60).padStart(2, '0') + 'm'
      : minutes + 'm';
  };
  const durationDetail = (ms) => {
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    return seconds < 60 ? seconds + 's' : shortDuration(ms);
  };
  // Session records and clearly labeled sample history.
  const makeSession = (timestamp) => ({
    id: 'session-' + timestamp,
    start: timestamp,
    end: null,
    seatedMs: 0,
    seatedSince: timestamp,
    awaySince: null,
    intervals: [],
    breaks: [],
    lastReset: timestamp,
    reminderSent: false,
    scenario: 'seated',
    sample: false,
  });
  function makeInitialState() {
    // Sample history makes the first preview readable. It is labeled as sample
    // data in the interface and is never included in the backend-format JSON export.
    const end = now() - 60 * 60 * 1000;
    const sampleSpecs = [
      { minutes: 42, gap: 7, breaks: 1 },
      { minutes: 38, gap: 13, breaks: 1 },
      { minutes: 58, gap: 0, breaks: 2 },
    ];
    let cursor = end - (42 + 7 + 38 + 13 + 58 + 4) * 60000;
    const samples = sampleSpecs.map((spec, i) => {
      const start = cursor;
      const finish = start + (spec.minutes + spec.breaks) * 60000;
      cursor = finish + spec.gap * 60000;
      const breaks = Array.from({ length: spec.breaks }, (_, n) => ({
        start: start + ((n + 1) * 10 + n) * 60000,
        end: start + ((n + 1) * 10 + n + 1) * 60000,
      }));
      const intervals = [];
      let segmentStart = start;
      breaks.forEach((b) => {
        intervals.push({ start: segmentStart, end: b.start });
        segmentStart = b.end;
      });
      intervals.push({ start: segmentStart, end: finish });
      return {
        id: 'sample-' + i,
        start,
        end: finish,
        seatedMs: spec.minutes * 60000,
        seatedSince: null,
        awaySince: null,
        intervals,
        breaks,
        sample: true,
      };
    });
    return {
      version: 1,
      settings: { name: '', reminderMs: CONFIG.hardware.reminderMs, goal: 6, reminders: true },
      samples,
      sessions: [],
      active: makeSession(now()),
      notifications: [],
      storageAvailable: true,
    };
  }
  let state;
  // Read browser storage without clearing earlier sessions or personal settings.
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      parsed &&
      parsed.version === 1 &&
      parsed.active &&
      Array.isArray(parsed.sessions) &&
      parsed.settings
    )
      state = parsed;
  } catch {}
  if (!state) state = makeInitialState();
  if (
    ![CONFIG.hardware.reminderMs, CONFIG.hardware.everydayReminderMs].includes(
      state.settings.reminderMs,
    )
  ) {
    state.settings.reminderMs = CONFIG.hardware.reminderMs;
    state.active.reminderSent = false;
  }
  // Keep existing history and preferences while migrating the earlier visual demo.
  state.active.scenario = state.active.seatedSince !== null ? 'seated' : 'away';
  state.notifications = state.notifications.map((notification) => ({
    ...notification,
    message: notification.message
      .replace(/five-minute|5-minute/g, '10-second')
      .replace(/five minutes|5 minutes/g, '10 seconds'),
  }));
  let storageWarningShown = false;
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      state.storageAvailable = false;
      if (!storageWarningShown) {
        storageWarningShown = true;
        toast(
          'Browser storage is unavailable. This visit still works; export your data to keep it.',
        );
      }
    }
  }
  // Short notifications and the notification history.
  let toastTimeout;
  function toast(message) {
    $('toastText').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 5000);
  }
  function notify(title, message) {
    state.notifications.unshift({ title, message, time: now() });
    state.notifications = state.notifications.slice(0, 12);
    $('notificationDot').hidden = false;
    save();
  }
  // Session lifecycle: count occupied time, pause, resume, and save.
  function seatedDuration(session, timestamp = now()) {
    // Count only occupied time; a brief absence never adds to this total.
    return (
      session.seatedMs +
      (session.seatedSince !== null ? Math.max(0, timestamp - session.seatedSince) : 0)
    );
  }
  function closeSession(timestamp) {
    const session = state.active;
    if (!session || session.end !== null) return false;
    if (session.seatedSince !== null) {
      session.seatedMs += Math.max(0, timestamp - session.seatedSince);
      session.intervals.push({ start: session.seatedSince, end: timestamp });
      session.seatedSince = null;
    }
    session.end = timestamp;
    if (session.awaySince !== null) {
      const latest = session.breaks[session.breaks.length - 1];
      if (latest && latest.end === null) latest.end = timestamp;
    }
    const recorded = session.seatedMs >= MIN_SESSION_MS;
    if (recorded) state.sessions.unshift({ ...session });
    state.active = { ...session, seatedMs: 0, intervals: [], breaks: [], end: timestamp, recorded };
    save();
    return recorded;
  }
  function reconcile(timestamp = now()) {
    // The Python-style session buffer groups brief interruptions. It is separate
    // from the Arduino reminder, which restarts after every stand-up.
    const session = state.active;
    if (
      session.end === null &&
      session.awaySince !== null &&
      timestamp - session.awaySince >= GRACE_MS
    ) {
      const recorded = closeSession(session.awaySince + GRACE_MS);
      notify(
        recorded ? 'Session saved' : 'Brief pressure ignored',
        recorded
          ? 'Your 10-second buffer ended. Sit down to begin a fresh session.'
          : 'Sessions under 3 seconds are not saved. Sit down to begin a fresh session.',
      );
    }
    // Split at the local midnight boundary if a seated demo remains open overnight.
    if (state.active.end === null && dayKey(state.active.start) !== dayKey(timestamp)) {
      const midnight = new Date(timestamp);
      midnight.setHours(0, 0, 0, 0);
      const wasSeated = state.active.seatedSince !== null;
      closeSession(midnight.getTime());
      if (wasSeated) state.active = makeSession(midnight.getTime());
      save();
    }
  }
  function setScenario(scenario) {
    if (!['seated', 'away'].includes(scenario)) return;
    reconcile();
    const timestamp = now(),
      session = state.active;
    if (scenario === 'away') {
      if (session.end !== null || session.seatedSince === null) return;
      session.seatedMs += timestamp - session.seatedSince;
      session.intervals.push({ start: session.seatedSince, end: timestamp });
      session.seatedSince = null;
      session.awaySince = timestamp;
      session.breaks.push({ start: timestamp, end: null });
      session.scenario = 'away';
      session.reminderSent = false;
      stopHapticPreview();
      toast('Seat released. Your session stays open for 10 seconds.');
      notify(
        'A little room to move',
        'Your seated timer is paused. Return before the 10-second buffer ends to resume this session.',
      );
    } else {
      if (session.end !== null) {
        state.active = makeSession(timestamp);
        toast('A fresh session, automatically started.');
      } else if (session.awaySince !== null) {
        const latest = session.breaks[session.breaks.length - 1];
        if (latest && latest.end === null) latest.end = timestamp;
        session.awaySince = null;
        session.seatedSince = timestamp;
        // Arduino resets its reminder whenever pressure drops, even if Python
        // keeps the same sitting session open during its 10-second buffer.
        session.lastReset = timestamp;
        session.reminderSent = false;
        toast('Welcome back. Same session, fresh perspective.');
      }
      state.active.scenario = scenario;
    }
    save();
    renderAll();
  }
  function sessionToday(session) {
    return dayKey(session.start) === today();
  }
  function completedToday() {
    return [...state.samples, ...state.sessions].filter(sessionToday);
  }
  function breakCount() {
    return (
      completedToday().reduce((sum, s) => sum + s.breaks.filter((b) => b.end !== null).length, 0) +
      (state.active.end === null ? state.active.breaks.filter((b) => b.end !== null).length : 0)
    );
  }
  // Dashboard rendering. These functions read state and update the page.
  let chartPeriod = 'today',
    sessionFilter = 'all',
    currentView = 'overview';
  function renderIdentity() {
    const name = state.settings.name.trim();
    $('overview-heading').textContent = name
      ? 'Good to see you, ' + name + '.'
      : 'Find your rhythm.';
    const accent = document.createElement('span');
    accent.textContent = '.';
    if (!name) {
      $('overview-heading').textContent = 'Find your rhythm';
      $('overview-heading').append(accent);
    }
    $('profileName').textContent = name ? name + "'s workspace" : 'Your workspace';
    $('profileInitial').textContent = name ? name[0].toUpperCase() : 'Y';
    document.querySelector('.header-avatar').textContent = name ? name[0].toUpperCase() : 'S';
    $('todayDate').textContent = new Date()
      .toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
      .toUpperCase();
    $('dayLabel').textContent = new Date()
      .toLocaleDateString([], { month: 'short', day: 'numeric' })
      .toUpperCase();
    const localStatus = document.querySelector('.local-status');
    localStatus.lastChild.textContent =
      state.storageAvailable === false ? ' Session memory only' : ' Stored on your device';
  }
  function updateTimer() {
    reconcile();
    const timestamp = now(),
      session = state.active;
    const closed = session.end !== null,
      away = session.awaySince !== null || closed;
    $('sessionTime').innerHTML = clock(closed ? 0 : seatedDuration(session, timestamp))
      .split(':')
      .join('<span>:</span>');
    $('sessionState').textContent = closed
      ? 'A fresh start is a seat away.'
      : away
        ? 'A little space to reset.'
        : 'Settled in. Stay mindful.';
    $('sessionDot').style.background = away ? '#d9c58d' : '#d6edaa';
    $('timerCaption').textContent = closed
      ? 'Sit down to start your next session'
      : away
        ? 'Paused — time away is not counted'
        : 'Time seated in this session';
    const elapsed = timestamp - (session.lastReset || timestamp);
    let progress = 0;
    if (closed) {
      $('resetLabel').textContent =
        session.recorded === false ? 'Brief pressure ignored' : 'Your session has been saved';
      $('resetTime').textContent = 'Ready when you are';
      $('resetTime').style.fontSize = '17px';
      $('sessionNote').textContent =
        session.recorded === false
          ? 'Sessions under 3 seconds are not saved. Your next session begins when you sit down.'
          : 'Your next session begins automatically when you sit down.';
    } else if (away) {
      $('resetLabel').textContent = 'Holding your session for';
      $('resetTime').textContent = countdown(GRACE_MS - (timestamp - session.awaySince));
      $('resetTime').style.fontSize = '';
      $('sessionNote').textContent =
        'A 10-second buffer handles a brief interruption. Time away is excluded; longer breaks end this session.';
      progress = Math.min(100, ((timestamp - session.awaySince) / GRACE_MS) * 100);
    } else {
      const interval = state.settings.reminderMs;
      $('resetLabel').textContent =
        elapsed >= interval ? 'Your reminder is due' : 'Your next reminder preview';
      $('resetTime').textContent =
        elapsed >= interval ? 'Time to stretch' : countdown(interval - elapsed);
      $('resetTime').style.fontSize = '';
      $('sessionNote').textContent =
        elapsed >= interval
          ? 'One 0.8-second pulse per continuous sit. Stand up to reset the reminder.'
          : interval === CONFIG.hardware.reminderMs
            ? '20-second firmware demo: one pulse per continuous sit. This page only previews the reminder.'
            : '30-minute browser preview. This does not change the uploaded firmware’s 20-second setting.';
      progress = Math.min(100, (elapsed / interval) * 100);
      if (elapsed >= interval && !session.reminderSent) {
        session.reminderSent = true;
        if (state.settings.reminders) {
          toast('A little movement is due. Stand up, stretch, and make some space.');
          notify(
            'Time for a little reset',
            'Your reminder preview is due. The firmware uses one 800 ms pulse per continuous sit.',
          );
          animateHaptic();
        }
        save();
      }
    }
    $('breakProgress').style.width = progress + '%';
    const button = $('breakButton');
    button.innerHTML = away
      ? '<svg><use href="#i-mat"/></svg> Sit back down <span>↙</span>'
      : '<svg><use href="#i-walk"/></svg> Take a little break <span>↗</span>';
    const completed = completedToday();
    const total =
      completed.reduce((sum, s) => sum + s.seatedMs, 0) +
      (closed ? 0 : seatedDuration(session, timestamp));
    $('totalSeated').textContent = shortDuration(total);
    const count = completed.length + (closed ? 0 : 1);
    $('sessionCount').textContent = count;
    const stretches = completed.flatMap((s) => s.intervals.map((i) => i.end - i.start));
    if (!closed) {
      stretches.push(...session.intervals.map((i) => i.end - i.start));
      if (session.seatedSince !== null) stretches.push(timestamp - session.seatedSince);
    }
    $('averageStretch').innerHTML =
      (stretches.length
        ? Math.round(stretches.reduce((a, b) => a + b, 0) / stretches.length / 60000)
        : 0) + '<span> min</span>';
  }
  function renderOccupancy() {
    // One FSR reports occupancy. It does not report where weight is distributed.
    const session = state.active,
      away = session.end !== null || session.awaySince !== null;
    const scenario = away ? 'away' : 'seated';
    const signal = away ? DEMO_AWAY_SIGNAL : DEMO_FSR_SIGNAL;
    const signalPercent = (signal / DEMO_SIGNAL_MAX) * 100;
    const detected = signal >= PRESSURE_THRESHOLD;
    const status = session.end !== null ? 'Standing' : away ? 'Paused (Break)' : 'Sitting';
    const badge = $('occupancyBadge');
    badge.classList.toggle('away', away);
    badge.innerHTML = '<i></i>' + status;
    $('cushionStage').classList.toggle('away', away);
    $('occupancyCaption').textContent = away ? 'Seat released' : 'Pressure detected';
    $('seatDetection').textContent = detected ? 'Detected' : 'Not detected';
    $('fsrSignal').innerHTML = signal + '<span> ADC</span>';
    $('fsrSignalFill').style.width = signalPercent + '%';
    $('fsrSignalTrack').setAttribute('aria-valuemax', String(DEMO_SIGNAL_MAX));
    $('fsrSignalTrack').setAttribute('aria-valuenow', String(signal));
    $('fsrSignalTrack').setAttribute(
      'aria-valuetext',
      signal + ' ADC, simulated FSR signal. Sitting threshold: ' + PRESSURE_THRESHOLD + ' ADC.',
    );
    $('fsrThresholdMarker').style.left = (PRESSURE_THRESHOLD / DEMO_SIGNAL_MAX) * 100 + '%';
    $('sensorList').innerHTML = `
  <div class="sensor-row">
   <div class="sensor-label">
    <span>FSR 01 · simulated raw ADC</span>
    <b>${signal} ADC</b>
   </div>
   <div class="sensor-bar"><i style="width:${signalPercent}%"></i></div>
  </div>
  <dl>
   <div><dt>Detection threshold</dt><dd>${PRESSURE_THRESHOLD} ADC</dd></div>
   <div><dt>Reference status</dt><dd>${status}</dd></div>
   <div><dt>Seat pressure detected</dt><dd>${detected ? 'Yes' : 'No'}</dd></div>
   <div><dt>Measurement</dt><dd>Occupancy only</dd></div>
  </dl>
 `;
    document.querySelectorAll('[data-scenario]').forEach((button) => {
      const selected = button.dataset.scenario === scenario;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  function renderStats() {
    const count = breakCount(),
      goal = state.settings.goal;
    $('movementCount').innerHTML = count + '<span> / ' + goal + '</span>';
    $('movementHint').textContent =
      count >= goal
        ? 'You made space for your daily goal'
        : goal - count + ' more ' + (goal - count === 1 ? 'moment' : 'moments') + ' for yourself';
    $('breakDots').innerHTML = Array.from(
      { length: goal },
      (_, i) => '<i class="' + (i < count ? 'filled' : '') + '"></i>',
    ).join('');
    $('breakDots').setAttribute('aria-label', count + ' of ' + goal + ' movement breaks');
    $('winText').textContent =
      'You made room for ' + count + ' ' + (count === 1 ? 'break' : 'breaks') + ' today.';
  }
  // Timeline, sample weekly chart, and session-history table.
  const weekValues = [4, 6, 3, 5, 7, 2, 4];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d.toLocaleDateString([], { weekday: 'short' });
  });
  function weekHTML(compact = false) {
    return weekValues
      .map(
        (n, i) =>
          '<div class="week-col">' +
          (compact ? '' : '<b>' + n + '</b>') +
          '<div class="week-bar" style="height:' +
          Math.round((n / 8) * 78) +
          '%" title="' +
          weekDays[i] +
          ': ' +
          n +
          ' sample movement breaks"></div><span>' +
          weekDays[i] +
          '</span></div>',
      )
      .join('');
  }
  function renderChart() {
    // Draw recorded seated intervals and breaks, rather than a made-up pressure graph.
    if (chartPeriod === 'week') {
      $('rhythmChart').innerHTML = '<div class="week-timeline">' + weekHTML(true) + '</div>';
      return;
    }
    const timestamp = now();
    const history = completedToday();
    const active = state.active.end === null ? state.active : null;
    let intervals = history.flatMap((s) => s.intervals.map((i) => ({ ...i, live: false })));
    if (active) {
      intervals.push(...active.intervals.map((i) => ({ ...i, live: false })));
      if (active.seatedSince !== null)
        intervals.push({
          start: active.seatedSince,
          end: Math.max(timestamp, active.seatedSince + 15000),
          live: true,
        });
    }
    const first = Math.min(...intervals.map((i) => i.start), timestamp - 60000);
    const start = new Date(first);
    start.setMinutes(0, 0, 0);
    const end = new Date(timestamp);
    end.setHours(end.getHours() + 1, 0, 0);
    const duration = end - start;
    const position = (t) => Math.max(0, Math.min(100, ((t - start) / duration) * 100));
    const segments = intervals
      .map(
        (i) =>
          '<span class="timeline-segment ' +
          (i.live ? 'live' : '') +
          '" style="left:' +
          position(i.start) +
          '%;width:' +
          Math.max(0.5, position(i.end) - position(i.start)) +
          '%" title="' +
          (i.live ? 'Current demo session' : 'Sample / demo seated period') +
          ' · ' +
          timeLabel(i.start) +
          ' · ' +
          durationDetail(i.end - i.start) +
          '"></span>',
      )
      .join('');
    const breaks = [...history, ...(active ? [active] : [])].flatMap((s) => s.breaks);
    const breakSegments = breaks
      .map(
        (b) =>
          '<span class="timeline-segment break" style="left:' +
          position(b.start) +
          '%;width:' +
          Math.max(0.35, position(b.end || timestamp) - position(b.start)) +
          '%" title="Movement break · ' +
          durationDetail((b.end || timestamp) - b.start) +
          '"></span>',
      )
      .join('');
    const hours = Array.from({ length: 6 }, (_, i) =>
      timeLabel(start.getTime() + (duration * i) / 5),
    );
    $('rhythmChart').innerHTML =
      '<div class="chart-grid">' +
      hours.map(() => '<i></i>').join('') +
      '</div><div class="timeline-lane">' +
      segments +
      breakSegments +
      '</div><div class="chart-hours">' +
      hours.map((h) => '<span>' + h + '</span>').join('') +
      '</div>';
  }
  function renderSessions() {
    // Samples stay clearly labeled and separate from completed demo activity.
    const active = state.active.end === null ? [state.active] : [];
    let sessions = [...active, ...state.sessions, ...state.samples].sort(
      (a, b) => b.start - a.start,
    );
    if (sessionFilter === 'completed') sessions = sessions.filter((s) => s.end !== null);
    $('sessionRows').innerHTML = sessions.length
      ? sessions
          .map((s, i) => {
            const current = s.end === null;
            const breaks = s.breaks.filter((b) => b.end !== null).length;
            return (
              '<tr><td>' +
              (current ? 'Current session' : 'Sitting session') +
              '<small>' +
              (s.sample ? 'Illustrative sample' : 'Interactive demo') +
              '</small></td><td>' +
              escapeHTML(timeLabel(s.start)) +
              '<small>' +
              escapeHTML(
                new Date(s.start).toLocaleDateString([], { month: 'short', day: 'numeric' }),
              ) +
              '</small></td><td>' +
              durationDetail(current ? seatedDuration(s) : s.seatedMs) +
              '</td><td>' +
              breaks +
              '</td><td><span class="row-badge ' +
              (current ? 'current' : '') +
              '">' +
              (current ? (s.awaySince !== null ? 'On a break' : 'In progress') : 'Completed') +
              '</span></td></tr>'
            );
          })
          .join('')
      : '<tr><td colspan="5" class="empty-state">No completed sessions yet. Your next little habit starts here.</td></tr>';
  }
  function fillSettings() {
    $('nameInput').value = state.settings.name;
    $('intervalInput').value = state.settings.reminderMs;
    $('goalInput').value = state.settings.goal;
    $('reminderInput').checked = state.settings.reminders;
  }
  function renderAll() {
    updateTimer();
    renderIdentity();
    renderOccupancy();
    renderStats();
    renderChart();
    renderSessions();
  }
  function route() {
    // Hash links keep this build usable directly from index.html without a server.
    const requested = location.hash.slice(1) || 'overview';
    currentView = ['overview', 'sessions', 'insights', 'learn', 'device', 'settings'].includes(
      requested,
    )
      ? requested
      : 'overview';
    const labels = {
      overview: 'Overview',
      sessions: 'Sessions',
      insights: 'Insights',
      learn: 'Learn',
      device: 'My cushion',
      settings: 'Preferences',
    };
    document.querySelectorAll('.view').forEach((view) => {
      const visible = view.id === 'view-' + currentView;
      view.hidden = !visible;
      view.classList.toggle('active', visible);
    });
    document.querySelectorAll('[data-view]').forEach((link) => {
      const active = link.dataset.view === currentView;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('breadcrumb').textContent = labels[currentView];
    document.title = 'SitWell — ' + labels[currentView];
    if (currentView === 'settings') fillSettings();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  // Downloads stay local. They do not write to the Python backend.
  function exportCSV() {
    reconcile();
    const active = state.active.end === null ? [state.active] : [];
    const rows = [
      ['id', 'source', 'started_at', 'ended_at', 'seated_seconds', 'completed_breaks', 'status'],
      ...[...state.samples, ...state.sessions, ...active].map((s) => [
        s.id,
        s.sample ? 'illustrative sample' : 'interactive demo',
        new Date(s.start).toISOString(),
        s.end === null ? '' : new Date(s.end).toISOString(),
        Math.floor((s.end === null ? seatedDuration(s) : s.seatedMs) / 1000),
        s.breaks.filter((b) => b.end !== null).length,
        s.end === null ? (s.awaySince !== null ? 'on break' : 'seated') : 'completed',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => '"' + String(value).replace(/"/g, '""') + '"').join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sitwell-sessions-' + today() + '.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Your session history has been exported as a CSV.');
  }
  function formatBackendDate(timestamp) {
    const date = new Date(timestamp);
    const pad = (value) => String(value).padStart(2, '0');
    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      ' ' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes()) +
      ':' +
      pad(date.getSeconds())
    );
  }
  function exportSessionsJSON() {
    reconcile();
    // Match Python's sessions.json schema. Export actual completed demo sessions only:
    // no illustrative samples, unfinished sessions, or accidental sub-3-second bumps.
    const records = state.sessions
      .filter(
        (session) => !session.sample && session.end !== null && session.seatedMs >= MIN_SESSION_MS,
      )
      .slice()
      .sort((a, b) => a.start - b.start)
      .map((session) => ({
        start_time: formatBackendDate(session.start),
        end_time: formatBackendDate(session.end),
        duration_seconds: Math.floor(session.seatedMs / 1000),
      }));
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(records, null, 2) + '\n'], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sitwell-demo-sessions.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(
      records.length
        ? 'Completed demo sessions exported in your backend’s JSON format.'
        : 'No completed demo sessions yet. Exported an empty JSON list; sample history was excluded.',
    );
  }
  let routineTimer = null;
  // Every dialog uses the same container. Closing it also stops its reset timer.
  function closeDialog() {
    clearInterval(routineTimer);
    routineTimer = null;
    $('appDialog').close();
  }
  function showDialog(eyebrow, content) {
    clearInterval(routineTimer);
    routineTimer = null;
    $('dialogEyebrow').textContent = eyebrow;
    $('dialogContent').innerHTML = content;
    if (!$('appDialog').open) $('appDialog').showModal();
  }
  function showRoutine() {
    showDialog(
      'A MOMENT FOR YOURSELF',
      '<div class="dialog-icon"><svg><use href="#i-leaf"/></svg></div><h2>Make a little space.</h2><p>A simple 60-second pause. Stand comfortably, relax your shoulders, and move in a way that feels good to you.</p><div class="routine-timer" id="routineTime">01:00</div><div class="routine-step" id="routineStep">A small pause. No perfect way to do it.</div><button class="button button-green" id="routineStart">Start my reset <svg><use href="#i-arrow"/></svg></button>',
    );
    $('routineStart').addEventListener(
      'click',
      () => {
        setScenario('away');
        const end = now() + 60000;
        $('routineStart').disabled = true;
        $('routineStart').textContent = 'A moment, just for you…';
        const tick = () => {
          const remaining = Math.max(0, end - now());
          $('routineTime').textContent = countdown(remaining);
          $('routineStep').textContent =
            remaining > 40000
              ? 'Stand up and let your arms relax.'
              : remaining > 20000
                ? 'Gently roll your shoulders. Take your time.'
                : remaining > 0
                  ? 'Take a few easy steps. Come back when you’re ready.'
                  : 'A little reset, complete. Welcome back.';
          if (remaining === 0) {
            clearInterval(routineTimer);
            routineTimer = null;
            $('routineStart').disabled = false;
            $('routineStart').textContent = 'Finish my reset';
            $('routineStart').onclick = () => {
              closeDialog();
              toast('A little space makes a difference. Sit down whenever you’re ready.');
            };
          }
        };
        routineTimer = setInterval(tick, 250);
        tick();
      },
      { once: true },
    );
  }
  // Simulate an 800 ms pulse. Arduino controls the physical motor separately.
  let hapticTimeout;
  function stopHapticPreview() {
    clearTimeout(hapticTimeout);
    $('cushionStage').classList.remove('haptic-pulse');
    $('motorPreviewStatus').textContent = 'Off';
  }
  function animateHaptic() {
    // This only animates the page. The physical motor is controlled by Arduino.
    stopHapticPreview();
    const stage = $('cushionStage');
    void stage.offsetWidth; // Restart the CSS animation for a manual test pulse.
    stage.classList.add('haptic-pulse');
    $('motorPreviewStatus').textContent = 'Preview pulse · 800 ms';
    hapticTimeout = setTimeout(stopHapticPreview, CONFIG.hardware.buzzDurationMs);
  }
  function showBreak() {
    if (state.active.end !== null || state.active.awaySince !== null) {
      setScenario('seated');
      return;
    }
    setScenario('away');
    showDialog(
      'A MOMENT AWAY',
      '<div class="dialog-icon"><svg><use href="#i-walk"/></svg></div><h2>A little room to move.</h2><p>Your seated timer is paused. The cushion holds this session for <strong>10 seconds</strong> to handle a brief interruption.</p><p>A washroom trip or longer break will usually end the session. Sitting again starts a fresh one. Time away never counts as sitting.</p><button class="button button-green" id="returnToSeat">I’m back — sit down <svg><use href="#i-arrow"/></svg></button>',
    );
    $('returnToSeat').onclick = () => {
      setScenario('seated');
      closeDialog();
    };
  }
  function showPrivacy() {
    showDialog(
      'PRIVATE BY DESIGN',
      '<div class="dialog-icon"><svg><use href="#i-shield"/></svg></div><h2>Your space. Your data.</h2><p>Your demo sessions and preferences are stored in this browser. There are no accounts, analytics, external fonts, or cloud services in this frontend.</p><p>The cushion readings are simulated. Exported history labels sample records and demo activity separately. Hardware connection is the next integration step.</p><button class="button button-green" id="privacyExport">Export my session data <svg><use href="#i-download"/></svg></button>',
    );
    $('privacyExport').onclick = exportCSV;
  }
  function showNotifications() {
    $('notificationDot').hidden = true;
    const items = state.notifications.length
      ? state.notifications
      : [
          {
            title: 'Your quiet companion is ready',
            message:
              'Try sitting down and standing up. One simulated FSR input detects seat pressure; it does not measure posture.',
            time: now(),
          },
        ];
    showDialog(
      'YOUR LITTLE NUDGES',
      '<h2>A moment of awareness.</h2>' +
        items
          .map(
            (n) =>
              '<div class="notification-item"><svg><use href="#i-leaf"/></svg><div><b>' +
              escapeHTML(n.title) +
              '</b><p>' +
              escapeHTML(n.message) +
              '</p><small>' +
              escapeHTML(timeLabel(n.time)) +
              '</small></div></div>',
          )
          .join(''),
    );
  }
  // One click handler keeps navigation and demo buttons out of the HTML markup.
  document.addEventListener('click', (event) => {
    const scenarioButton = event.target.closest('[data-scenario]');
    if (scenarioButton) {
      setScenario(scenarioButton.dataset.scenario);
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action) {
      ({
        export: exportCSV,
        'export-json': exportSessionsJSON,
        break: showBreak,
        routine: showRoutine,
        privacy: showPrivacy,
        notifications: showNotifications,
        device: () => {
          location.hash = 'device';
        },
        haptic: () => {
          animateHaptic();
          notify(
            'Reminder preview',
            'An 800 ms on-screen pulse. The actual motor is controlled by the ESP32 on GPIO 2.',
          );
          toast('800 ms reminder preview. No physical motor is connected to this page.');
        },
      })[action]?.();
    }
    const chart = event.target.closest('[data-chart]');
    if (chart) {
      chartPeriod = chart.dataset.chart;
      document
        .querySelectorAll('[data-chart]')
        .forEach((b) => b.classList.toggle('active', b === chart));
      renderChart();
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      sessionFilter = filter.dataset.filter;
      document
        .querySelectorAll('[data-filter]')
        .forEach((b) => b.classList.toggle('active', b === filter));
      renderSessions();
    }
  });
  $('settingsForm').addEventListener('submit', (event) => {
    event.preventDefault();
    state.settings = {
      name: $('nameInput').value.trim(),
      reminderMs: Number($('intervalInput').value),
      goal: Number($('goalInput').value),
      reminders: $('reminderInput').checked,
    };
    // Saving a name or goal must not fire another pulse during the same sit.
    save();
    renderAll();
    toast('Your preferences are saved. Make yourself comfortable.');
  });
  $('closeDialog').onclick = closeDialog;
  $('appDialog').addEventListener('close', () => {
    clearInterval(routineTimer);
    routineTimer = null;
  });
  $('appDialog').addEventListener('click', (event) => {
    if (event.target === $('appDialog')) {
      const rect = $('appDialog').getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        closeDialog();
    }
  });
  $('dismissToast').onclick = () => $('toast').classList.remove('show');
  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      renderAll();
    } else save();
  });
  $('weeklyChart').innerHTML = weekHTML();
  // Startup restores saved state, opens the requested view, then refreshes the
  // visible clock every second. Ten-second saves reduce unnecessary storage writes.
  reconcile();
  fillSettings();
  route();
  save();
  setInterval(() => {
    const closedBefore = state.active.end;
    updateTimer();
    if (closedBefore !== state.active.end) {
      renderOccupancy();
      renderStats();
      renderChart();
      renderSessions();
    }
    if (currentView === 'sessions') renderSessions();
  }, 1000);
  setInterval(() => {
    renderChart();
    save();
  }, 10000);
})();
