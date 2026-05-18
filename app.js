/* 3thirty JAMB - app.js */

var SUBJECTS = [
  { id: 2,  title: 'English Language',         file: 'eng.json',   icon: '&#x1F4DD;',   compulsory: true  },
  { id: 3,  title: 'Mathematics',               file: 'maths.json', icon: '&#x1F4D0;', compulsory: false },
  { id: 4,  title: 'Physics',                   file: 'phy.json',   icon: '&#x26A1;',   compulsory: false },
  { id: 5,  title: 'Chemistry',                 file: 'chem.json',  icon: '&#x1F9EA;',  compulsory: false },
  { id: 6,  title: 'Biology',                   file: 'bio.json',   icon: '&#x1F33F;',   compulsory: false },
  { id: 7,  title: 'Geography',                 file: 'geo.json',   icon: '&#x1F30D;',   compulsory: false },
  { id: 8,  title: 'Literature in English',     file: 'lit.json',   icon: '&#x1F4DA;',   compulsory: false },
  { id: 9,  title: 'Economics',                 file: 'econs.json', icon: '&#x1F4CA;',  compulsory: false },
  { id: 10, title: 'Commerce',                  file: 'comm.json',  icon: '&#x1F3EA;',  compulsory: false },
  { id: 11, title: 'Accounts',                  file: 'acc.json',   icon: '&#x1F9FE;',   compulsory: false },
  { id: 12, title: 'Government',                file: 'govt.json',  icon: '&#x1F3DB;',  compulsory: false },
  { id: 13, title: 'CRK',                       file: 'crk.json',   icon: '&#x271D;',   compulsory: false },
  { id: 14, title: 'Agricultural Science',      file: 'agric.json', icon: '&#x1F33E;', compulsory: false },
  { id: 15, title: 'Islamic Religious Studies', file: 'irs.json',   icon: '&#x262A;',   compulsory: false }
];

var Q_COUNTS_MAP = {2:1488,3:1087,4:1153,5:1146,6:1163,7:1013,8:592,9:1160,10:1104,11:1113,12:1114,13:1134,14:176,15:331};

var Q_COUNTS = [20, 40, 60];

var TIMER_OPTIONS = [
  { label: '30 min',  secs: 1800  },
  { label: '1 hr',    secs: 3600  },
  { label: '1.5 hrs', secs: 5400  },
  { label: '2 hrs',   secs: 7200  },
  { label: '3 hrs',   secs: 10800 }
];

var selectedSubjects = [2];
var subjectConfigs   = {};
var selectedTimer    = 7200;
var examQuestions    = [];
var examAnswers      = {};
var currentIdx       = 0;
var timeLeft         = 7200;
var timerInterval    = null;
var examSubmitted    = false;
var examResults      = null;
var dataCache        = {};

/* ---- helpers ---- */
function getById(id) { return document.getElementById(id); }

function findSubject(id) {
  for (var i = 0; i < SUBJECTS.length; i++) {
    if (SUBJECTS[i].id === id) return SUBJECTS[i];
  }
  return null;
}

function showScreen(name) {
  var screens = ['home','subjects','config','exam','results','review','history'];
  for (var i = 0; i < screens.length; i++) {
    var el = getById('screen-' + screens[i]);
    if (el) el.classList.remove('active');
  }
  var target = getById('screen-' + name);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
}

var toastTimer = null;
function showToast(msg) {
  var el = getById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { el.classList.remove('show'); }, 3000);
}

var loadingEl = null;
function showLoading(msg) {
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.className = 'loading-overlay';
    loadingEl.innerHTML = '<div class="spinner"></div><p id="loading-msg"></p>';
    document.body.appendChild(loadingEl);
  }
  getById('loading-msg').textContent = msg || 'Loading...';
  loadingEl.classList.remove('hidden');
}
function hideLoading() {
  if (loadingEl) loadingEl.classList.add('hidden');
}

function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function saveHistory(entry) {
  try {
    var raw = localStorage.getItem('3thirty_hist');
    var list = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    if (list.length > 100) list.length = 100;
    localStorage.setItem('3thirty_hist', JSON.stringify(list));
  } catch(e) {}
}

function getHistory() {
  try {
    var raw = localStorage.getItem('3thirty_hist');
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

/* ---- particles ---- */
function initParticles() {
  var c = getById('particles');
  if (!c) return;
  for (var i = 0; i < 18; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    var sz = Math.random() * 8 + 3;
    p.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;left:' +
      (Math.random() * 100) + '%;animation-duration:' +
      (Math.random() * 15 + 10) + 's;animation-delay:' +
      (Math.random() * 15) + 's;';
    c.appendChild(p);
  }
}

/* ====================================================
   HOME
   ==================================================== */
getById('btn-start').onclick = function() {
  renderSubjectGrid();
  showScreen('subjects');
};

getById('btn-history-home').onclick = function() {
  renderHistoryScreen();
  showScreen('history');
};

/* ====================================================
   HISTORY
   ==================================================== */
getById('back-history-to-home').onclick = function() { showScreen('home'); };

getById('btn-clear-history').onclick = function() {
  if (!confirm('Clear all history?')) return;
  try { localStorage.removeItem('3thirty_hist'); } catch(e) {}
  renderHistoryScreen();
  showToast('History cleared');
};

function renderHistoryScreen() {
  var body = getById('history-body');
  var list = getHistory();
  if (!list.length) {
    body.innerHTML = '<div class="history-empty">' +
      '<p style="font-size:2rem;margin-bottom:8px">No history yet</p>' +
      '<p style="color:var(--text-muted);font-size:0.85rem">Complete a practice exam first.</p></div>';
    return;
  }
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var e   = list[i];
    var pct = e.outOf > 0 ? Math.round(e.score / e.outOf * 100) : 0;
    var gc  = pct >= 70 ? 'grade-good' : pct >= 50 ? 'grade-ok' : 'grade-poor';
    html += '<div class="history-item">' +
      '<div class="history-item-top">' +
        '<div class="history-item-info">' +
          '<div class="history-subjects">' + (e.subjects || '') + '</div>' +
          '<div class="history-date">' + (e.date || '') + '</div>' +
        '</div>' +
        '<div class="history-score-block">' +
          '<div class="history-score-num ' + gc + '">' + e.score + '<small>/' + e.outOf + '</small></div>' +
          '<div class="history-pct">' + pct + '%</div>' +
        '</div>' +
      '</div></div>';
  }
  body.innerHTML = html;
}

/* ====================================================
   SUBJECTS
   ==================================================== */
getById('back-to-home').onclick = function() { showScreen('home'); };

function renderSubjectGrid() {
  selectedSubjects = [2];
  var grid = getById('subject-grid');
  grid.innerHTML = '';
  for (var i = 0; i < SUBJECTS.length; i++) {
    var sub  = SUBJECTS[i];
    var card = document.createElement('div');
    card.className = 'subject-card' + (sub.compulsory ? ' selected compulsory' : '');
    card.dataset.id = sub.id;
    var qc = Q_COUNTS_MAP[sub.id] || 0;
    card.innerHTML =
      '<span class="card-icon">' + sub.icon + '</span>' +
      '<span class="card-name">' + sub.title + '</span>' +
      '<span class="card-count">' + qc.toLocaleString() + ' Qs</span>' +
      (sub.compulsory ? '<span class="card-badge">Compulsory</span>' : '');
    if (!sub.compulsory) {
      (function(subId, c) {
        c.onclick = function() { toggleSubject(subId, c); };
      })(sub.id, card);
    }
    grid.appendChild(card);
  }
  updateSubjectCounter();
}

function toggleSubject(id, card) {
  var idx   = selectedSubjects.indexOf(id);
  var extra = 0;
  for (var i = 0; i < selectedSubjects.length; i++) {
    if (selectedSubjects[i] !== 2) extra++;
  }
  if (idx > -1) {
    selectedSubjects.splice(idx, 1);
    card.classList.remove('selected');
  } else {
    if (extra >= 3) { showToast('Maximum 3 optional subjects'); return; }
    selectedSubjects.push(id);
    card.classList.add('selected');
  }
  updateSubjectCounter();
}

function updateSubjectCounter() {
  var extra = 0;
  for (var i = 0; i < selectedSubjects.length; i++) {
    if (selectedSubjects[i] !== 2) extra++;
  }
  getById('subject-counter').textContent = extra + '/3 selected';
  getById('btn-continue-subjects').disabled = (extra < 1);
}

getById('btn-continue-subjects').onclick = function() {
  renderConfigScreen();
  showScreen('config');
};

/* ====================================================
   CONFIG
   ==================================================== */
getById('back-to-subjects').onclick = function() { showScreen('subjects'); };

function renderConfigScreen() {
  subjectConfigs = {};
  for (var i = 0; i < selectedSubjects.length; i++) {
    var id = selectedSubjects[i];
    subjectConfigs[id] = { filterType: 'random', filterValue: null, qCount: id === 2 ? 60 : 40 };
  }

  var body = getById('config-body');
  body.innerHTML = '';

  for (var i = 0; i < selectedSubjects.length; i++) {
    var id  = selectedSubjects[i];
    var sub = findSubject(id);
    var sec = document.createElement('div');
    sec.className = 'config-section';
    sec.innerHTML =
      '<div class="config-section-header">' +
        '<span class="card-icon">' + sub.icon + '</span>' +
        '<h3>' + sub.title + '</h3>' +
      '</div>' +
      '<div class="config-section-body">' +
        buildFilterHTML(sub) +
        buildQCountHTML(sub) +
      '</div>';
    body.appendChild(sec);
    attachFilterListeners(id, sub.compulsory);
    attachQCountListeners(id, sub.compulsory);
  }

  var tsec = document.createElement('div');
  tsec.className = 'config-section';
  var timerBtns = '';
  for (var t = 0; t < TIMER_OPTIONS.length; t++) {
    var opt = TIMER_OPTIONS[t];
    timerBtns += '<button class="timer-opt-btn' + (opt.secs === 7200 ? ' active' : '') +
      '" data-secs="' + opt.secs + '">' + opt.label + '</button>';
  }
  tsec.innerHTML =
    '<div class="config-section-header"><span class="card-icon">Time</span><h3>Timer</h3></div>' +
    '<div class="config-section-body"><label class="config-label">Exam Duration</label>' +
    '<div class="timer-group" id="timer-group">' + timerBtns + '</div></div>';
  body.appendChild(tsec);

  var tbtns = document.querySelectorAll('.timer-opt-btn');
  for (var k = 0; k < tbtns.length; k++) {
    (function(btn) {
      btn.onclick = function() {
        for (var x = 0; x < tbtns.length; x++) tbtns[x].classList.remove('active');
        btn.classList.add('active');
        selectedTimer = parseInt(btn.dataset.secs);
        updateConfigSummary();
      };
    })(tbtns[k]);
  }

  updateConfigSummary();
}

function buildFilterHTML(sub) {
  if (sub.compulsory) {
    return '<div><label class="config-label">Filter</label>' +
      '<div class="toggle-group"><button class="toggle-btn active" disabled>Random</button></div></div>';
  }
  return '<div><label class="config-label">Filter Type</label>' +
    '<div class="toggle-group" id="ft-' + sub.id + '">' +
      '<button class="toggle-btn active" data-type="random">Random</button>' +
      '<button class="toggle-btn" data-type="year">By Year</button>' +
      '<button class="toggle-btn" data-type="topic">By Topic</button>' +
    '</div>' +
    '<div id="fv-' + sub.id + '" style="margin-top:10px;display:none;">' +
      '<select class="config-select" id="fs-' + sub.id + '"><option>Loading...</option></select>' +
    '</div></div>';
}

function buildQCountHTML(sub) {
  if (sub.compulsory) {
    return '<div><label class="config-label">Questions</label>' +
      '<div class="q-count-group"><button class="q-count-btn active" disabled>60 (Fixed)</button></div></div>';
  }
  var btns = '';
  for (var i = 0; i < Q_COUNTS.length; i++) {
    var n = Q_COUNTS[i];
    btns += '<button class="q-count-btn' + (n === 40 ? ' active' : '') +
      '" data-count="' + n + '">' + n + '</button>';
  }
  return '<div><label class="config-label">Questions</label>' +
    '<div class="q-count-group" id="qc-' + sub.id + '">' + btns + '</div></div>';
}

function attachFilterListeners(id, isCompulsory) {
  if (isCompulsory) return;
  var grp  = getById('ft-' + id);
  var wrap = getById('fv-' + id);
  if (!grp) return;
  var btns = grp.querySelectorAll('.toggle-btn');
  for (var i = 0; i < btns.length; i++) {
    (function(btn, btnsRef) {
      btn.onclick = function() {
        for (var x = 0; x < btnsRef.length; x++) btnsRef[x].classList.remove('active');
        btn.classList.add('active');
        var type = btn.dataset.type;
        subjectConfigs[id].filterType  = type;
        subjectConfigs[id].filterValue = null;
        if (type === 'random') { wrap.style.display = 'none'; }
        else { wrap.style.display = 'block'; populateFilterSelect(id, type); }
        updateConfigSummary();
      };
    })(btns[i], btns);
  }
}

function attachQCountListeners(id, isCompulsory) {
  if (isCompulsory) return;
  var grp = getById('qc-' + id);
  if (!grp) return;
  var btns = grp.querySelectorAll('.q-count-btn');
  for (var i = 0; i < btns.length; i++) {
    (function(btn, btnsRef) {
      btn.onclick = function() {
        for (var x = 0; x < btnsRef.length; x++) btnsRef[x].classList.remove('active');
        btn.classList.add('active');
        subjectConfigs[id].qCount = parseInt(btn.dataset.count);
        updateConfigSummary();
      };
    })(btns[i], btns);
  }
}

function populateFilterSelect(id, type) {
  var sel = getById('fs-' + id);
  sel.innerHTML = '<option>Loading...</option>';
  loadData(id, function(data) {
    sel.innerHTML = '';
    if (type === 'year') {
      var years = [];
      for (var i = 0; i < data.questions.length; i++) {
        var y = data.questions[i].exam_year;
        if (y && years.indexOf(y) === -1) years.push(y);
      }
      years.sort();
      for (var i = 0; i < years.length; i++) {
        var opt = document.createElement('option');
        opt.value = years[i]; opt.textContent = years[i];
        sel.appendChild(opt);
      }
    } else {
      var topics = data.topics || [];
      for (var i = 0; i < topics.length; i++) {
        var opt = document.createElement('option');
        opt.value = topics[i].id; opt.textContent = topics[i].topic;
        sel.appendChild(opt);
      }
    }
    if (sel.options.length) subjectConfigs[id].filterValue = sel.options[0].value;
    sel.onchange = function() { subjectConfigs[id].filterValue = sel.value; };
  }, function() { sel.innerHTML = '<option>Could not load</option>'; });
}

function updateConfigSummary() {
  var total = 0;
  for (var id in subjectConfigs) {
    total += subjectConfigs[id].qCount || 0;
  }
  getById('config-summary').innerHTML =
    '<span>Total: <strong>' + total + ' Qs</strong></span>' +
    '<span>Score: <strong>out of 400</strong></span>';
}

getById('btn-start-exam').onclick = startExam;

/* ====================================================
   DATA LOADING (callback-based XHR, no Promises)
   ==================================================== */
function loadData(id, onSuccess, onError) {
  if (dataCache[id]) { onSuccess(dataCache[id]); return; }
  var sub = findSubject(id);
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'data/' + sub.file, true);
  xhr.responseType = 'json';
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    if (xhr.status === 200 || xhr.status === 0) {
      dataCache[id] = xhr.response;
      onSuccess(xhr.response);
    } else {
      if (onError) onError(new Error('Failed: ' + sub.file));
    }
  };
  xhr.onerror = function() { if (onError) onError(new Error('Network error')); };
  xhr.send();
}

/* ====================================================
   START EXAM (load all subjects sequentially)
   ==================================================== */
function startExam() {
  showLoading('Loading questions...');
  var ids    = selectedSubjects.slice();
  var loaded = 0;

  function loadNext(i) {
    if (i >= ids.length) { buildExam(); return; }
    loadData(ids[i], function() {
      loaded++;
      loadNext(i + 1);
    }, function(err) {
      hideLoading();
      showToast('Error loading data. Check data files.');
    });
  }
  loadNext(0);
}

function buildExam() {
  var allQ = [];
  for (var si = 0; si < selectedSubjects.length; si++) {
    var id   = selectedSubjects[si];
    var data = dataCache[id];
    var cfg  = subjectConfigs[id];
    var sub  = findSubject(id);
    var pool = data.questions.slice();

    if (cfg.filterType === 'year' && cfg.filterValue) {
      var filtered = [];
      for (var i = 0; i < pool.length; i++) {
        if (pool[i].exam_year === cfg.filterValue) filtered.push(pool[i]);
      }
      pool = filtered;
    } else if (cfg.filterType === 'topic' && cfg.filterValue) {
      var filtered = [];
      for (var i = 0; i < pool.length; i++) {
        if (String(pool[i].topic_id) === String(cfg.filterValue)) filtered.push(pool[i]);
      }
      pool = filtered;
    }

    pool = shuffleArray(pool);
    if (pool.length > cfg.qCount) pool = pool.slice(0, cfg.qCount);
    if (pool.length < cfg.qCount) showToast('Only ' + pool.length + ' Qs for ' + sub.title);

    for (var i = 0; i < pool.length; i++) {
      pool[i]._id       = id;
      pool[i]._subTitle = sub.title;
      pool[i]._passages = data.passages || {};
    }
    allQ = allQ.concat(pool);
  }

  examQuestions = allQ;
  examAnswers   = {};
  currentIdx    = 0;
  examSubmitted = false;
  examResults   = null;
  timeLeft      = selectedTimer;

  hideLoading();
  renderExamScreen();
  showScreen('exam');
  startTimer();
}

/* ====================================================
   EXAM SCREEN
   ==================================================== */
function renderExamScreen() {
  renderTabs();
  renderPalette();
  renderQuestion(0);
}

function renderTabs() {
  var tabsEl = getById('subject-tabs');
  tabsEl.innerHTML = '';
  var seen = [];
  for (var i = 0; i < examQuestions.length; i++) {
    var id = examQuestions[i]._id;
    if (seen.indexOf(id) === -1) seen.push(id);
  }
  for (var s = 0; s < seen.length; s++) {
    var id  = seen[s];
    var sub = findSubject(id);
    var btn = document.createElement('button');
    btn.className   = 'tab-btn';
    btn.textContent = sub.title.split(' ')[0];
    btn.dataset.id  = id;
    (function(subId) {
      btn.onclick = function() {
        for (var i = 0; i < examQuestions.length; i++) {
          if (examQuestions[i]._id === subId) { goTo(i); break; }
        }
      };
    })(id);
    tabsEl.appendChild(btn);
  }
  updateActiveTab();
}

function updateActiveTab() {
  var cur  = examQuestions[currentIdx];
  var btns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < btns.length; i++) {
    if (cur && parseInt(btns[i].dataset.id) === cur._id) btns[i].classList.add('active');
    else btns[i].classList.remove('active');
  }
}

function renderQuestion(idx) {
  var q = examQuestions[idx];
  if (!q) return;
  getById('q-counter').textContent = 'Q ' + (idx + 1) + ' of ' + examQuestions.length;

  var card = getById('question-card');
  card.innerHTML = '';

  var badge = document.createElement('div');
  badge.className = 'q-num-badge';
  badge.textContent = idx + 1;
  card.appendChild(badge);

  if (q.passage_id && q._passages && q._passages[q.passage_id]) {
    var pb = document.createElement('div');
    pb.className = 'passage-box';
    var ptog = document.createElement('button');
    ptog.className = 'passage-toggle';
    ptog.innerHTML = 'Read Passage <span>v</span>';
    var pcontent = document.createElement('div');
    pcontent.className = 'passage-content';
    pcontent.innerHTML = q._passages[q.passage_id];
    ptog.onclick = function() {
      pcontent.classList.toggle('open');
      ptog.querySelector('span').textContent = pcontent.classList.contains('open') ? '^' : 'v';
    };
    pb.appendChild(ptog);
    pb.appendChild(pcontent);
    card.appendChild(pb);
  }

  var qtext = document.createElement('div');
  qtext.className = 'question-text';
  qtext.innerHTML = q.question;
  card.appendChild(qtext);

  if (q.photo) {
    var img = document.createElement('img');
    img.className = 'question-image';
    img.src = 'exam_images/question/' + q.photo;
    img.onerror = function() { img.style.display = 'none'; };
    card.appendChild(img);
  }

  var opts = document.createElement('div');
  opts.className = 'options-list';
  var letters = ['a','b','c','d','e'];
  for (var i = 0; i < letters.length; i++) {
    var letter = letters[i];
    var text   = q['option_' + letter];
    if (text === null || text === undefined || String(text).trim() === '') continue;
    var btn = document.createElement('button');
    btn.className = 'option-btn' + (examAnswers[idx] === letter ? ' selected' : '');
    btn.innerHTML = '<span class="option-letter">' + letter.toUpperCase() + '</span><span>' + text + '</span>';
    (function(l) {
      btn.onclick = function() {
        examAnswers[idx] = l;
        renderQuestion(idx);
      };
    })(letter);
    opts.appendChild(btn);
  }
  card.appendChild(opts);

  updateNavBtns();
  updateActiveTab();
  updatePalette();

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([card]).catch(function() {});
  }
}

function updateNavBtns() {
  getById('btn-prev').disabled = (currentIdx === 0);
  getById('btn-next').disabled = (currentIdx === examQuestions.length - 1);
}

function goTo(idx) {
  if (idx < 0 || idx >= examQuestions.length) return;
  currentIdx = idx;
  renderQuestion(idx);
  getById('palette-panel').classList.remove('open');
}

getById('btn-prev').onclick = function() { goTo(currentIdx - 1); };
getById('btn-next').onclick = function() { goTo(currentIdx + 1); };

getById('btn-palette-toggle').onclick = function() {
  getById('palette-panel').classList.toggle('open');
};

function renderPalette() {
  var grid = getById('palette-grid');
  grid.innerHTML = '';
  for (var i = 0; i < examQuestions.length; i++) {
    var btn = document.createElement('button');
    btn.className   = 'palette-num';
    btn.textContent = i + 1;
    btn.dataset.idx = i;
    (function(idx) {
      btn.onclick = function() { goTo(idx); };
    })(i);
    grid.appendChild(btn);
  }
  updatePalette();
}

function updatePalette() {
  var btns = document.querySelectorAll('.palette-num');
  for (var i = 0; i < btns.length; i++) {
    var idx = parseInt(btns[i].dataset.idx);
    btns[i].classList.remove('answered','current');
    if (idx === currentIdx) btns[i].classList.add('current');
    else if (examAnswers[idx]) btns[i].classList.add('answered');
  }
}

/* ---- Timer ---- */
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(function() {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showToast("Time's up! Submitting...");
      setTimeout(submitExam, 1500);
    }
  }, 1000);
  updateTimerDisplay();
}

function updateTimerDisplay() {
  var m  = Math.floor(timeLeft / 60);
  var s  = timeLeft % 60;
  var el = getById('timer');
  el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  if (timeLeft < 300) el.className = 'timer danger';
  else if (timeLeft < 900) el.className = 'timer warning';
  else el.className = 'timer';
}

/* ---- Submit ---- */
getById('btn-submit-exam').onclick = function() {
  var answered = 0;
  for (var k in examAnswers) { if (examAnswers[k]) answered++; }
  if (answered === 0) { showToast('Answer at least 1 question'); return; }
  var unanswered = examQuestions.length - answered;
  getById('modal-submit-msg').textContent =
    unanswered > 0
      ? 'You have ' + unanswered + ' unanswered question' + (unanswered > 1 ? 's' : '') + '. Submit anyway?'
      : 'All answered. Submit now?';
  getById('modal-submit').classList.remove('hidden');
};

getById('modal-cancel').onclick = function() { getById('modal-submit').classList.add('hidden'); };
getById('modal-confirm').onclick = function() {
  getById('modal-submit').classList.add('hidden');
  submitExam();
};

function submitExam() {
  if (examSubmitted) return;
  examSubmitted = true;
  clearInterval(timerInterval);
  examResults = calcResults();

  var now     = new Date();
  var months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var dateStr = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear() +
                ' ' + (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' +
                (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
  var subNames = [];
  for (var i = 0; i < selectedSubjects.length; i++) {
    var s = findSubject(selectedSubjects[i]);
    if (s) subNames.push(s.title);
  }
  saveHistory({ subjects: subNames.join(', '), score: examResults.total, outOf: 400, date: dateStr });

  renderResultsScreen();
  showScreen('results');
}

/* ====================================================
   RESULTS
   ==================================================== */
function calcResults() {
  var bySubject = {};
  var count     = selectedSubjects.length;
  for (var si = 0; si < selectedSubjects.length; si++) {
    var id   = selectedSubjects[si];
    var subQ = [];
    for (var i = 0; i < examQuestions.length; i++) {
      if (examQuestions[i]._id === id) subQ.push({ q: examQuestions[i], gi: i });
    }
    var correct = 0, wrong = 0, skipped = 0;
    for (var i = 0; i < subQ.length; i++) {
      var ans = examAnswers[subQ[i].gi];
      if (!ans) skipped++;
      else if (ans === subQ[i].q.correct_answer) correct++;
      else wrong++;
    }
    var sub = findSubject(id);
    bySubject[id] = {
      title:   sub.title,
      icon:    sub.icon,
      correct: correct,
      wrong:   wrong,
      skipped: skipped,
      total:   subQ.length,
      score:   subQ.length > 0 ? Math.round(correct / subQ.length * (400 / count)) : 0
    };
  }
  var total = 0;
  for (var id in bySubject) total += bySubject[id].score;
  return { bySubject: bySubject, total: total };
}

function renderResultsScreen() {
  var scoreEl  = getById('score-display');
  var target   = examResults.total;
  var start    = Date.now();
  var duration = 1500;
  var timer    = setInterval(function() {
    var elapsed = Date.now() - start;
    var p = elapsed / duration;
    if (p >= 1) { p = 1; clearInterval(timer); }
    var e = 1 - Math.pow(1 - p, 3);
    scoreEl.textContent = Math.round(target * e);
  }, 16);

  var grid = getById('results-grid');
  grid.innerHTML = '';
  for (var id in examResults.bySubject) {
    var r   = examResults.bySubject[id];
    var pct = r.total > 0 ? Math.round(r.correct / r.total * 100) : 0;
    var card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML =
      '<span class="result-icon">' + r.icon + '</span>' +
      '<div class="result-info">' +
        '<div class="result-title">' + r.title + '</div>' +
        '<div class="result-bar-wrap"><div class="result-bar" id="rb-' + id + '" style="width:0%"></div></div>' +
        '<div class="result-stats">' + r.correct + ' correct / ' + r.wrong + ' wrong / ' + r.skipped + ' skipped</div>' +
      '</div>' +
      '<div class="result-score">' + r.score + '<small>pts</small></div>';
    grid.appendChild(card);
    (function(rid, rpct) {
      setTimeout(function() {
        var bar = getById('rb-' + rid);
        if (bar) bar.style.width = rpct + '%';
      }, 200);
    })(id, pct);
  }
}

getById('btn-review').onclick = function() { renderReviewScreen('all'); showScreen('review'); };

getById('btn-new-exam').onclick = function() {
  clearInterval(timerInterval);
  selectedSubjects = [2];
  subjectConfigs   = {};
  examQuestions    = [];
  examAnswers      = {};
  currentIdx       = 0;
  timeLeft         = 7200;
  timerInterval    = null;
  examSubmitted    = false;
  examResults      = null;
  selectedTimer    = 7200;
  showScreen('home');
};

/* ====================================================
   REVIEW
   ==================================================== */
getById('back-to-results').onclick = function() { showScreen('results'); };

var filterBtns = document.querySelectorAll('.filter-btn');
for (var fb = 0; fb < filterBtns.length; fb++) {
  (function(btn) {
    btn.onclick = function() {
      for (var x = 0; x < filterBtns.length; x++) filterBtns[x].classList.remove('active');
      btn.classList.add('active');
      renderReviewScreen(btn.dataset.filter);
    };
  })(filterBtns[fb]);
}

function renderReviewScreen(filter) {
  var body  = getById('review-body');
  body.innerHTML = '';
  var items = [];
  for (var i = 0; i < examQuestions.length; i++) {
    var ans = examAnswers[i];
    var q   = examQuestions[i];
    if (filter === 'correct'  && ans !== q.correct_answer) continue;
    if (filter === 'wrong'    && (!ans || ans === q.correct_answer)) continue;
    if (filter === 'skipped'  && ans) continue;
    items.push({ q: q, i: i });
  }

  if (!items.length) {
    body.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px 20px">No questions here.</p>';
    return;
  }

  for (var n = 0; n < items.length; n++) {
    var q   = items[n].q;
    var idx = items[n].i;
    var ans = examAnswers[idx];
    var sc, sl, sm;
    if (!ans)                        { sc='status-skipped'; sl='Skipped'; sm='-'; }
    else if (ans===q.correct_answer) { sc='status-correct'; sl='Correct'; sm='V'; }
    else                             { sc='status-wrong';   sl='Wrong';   sm='X'; }

    var optsHTML = '';
    var letters  = ['a','b','c','d','e'];
    for (var li = 0; li < letters.length; li++) {
      var letter = letters[li];
      var text   = q['option_' + letter];
      if (text === null || text === undefined || String(text).trim() === '') continue;
      var isC = (letter === q.correct_answer);
      var isW = (ans && ans === letter && !isC);
      optsHTML += '<div class="review-option' + (isC ? ' correct-opt' : '') + (isW ? ' wrong-opt' : '') + '">' +
        '<span class="review-opt-letter">' + letter.toUpperCase() + '</span><span>' + text + '</span></div>';
    }

    var passHTML = '';
    if (q.passage_id && q._passages && q._passages[q.passage_id]) {
      passHTML = '<div class="passage-box" style="margin-bottom:10px" id="pb-' + idx + '">' +
        '<button class="passage-toggle" id="pt-' + idx + '">Read Passage <span>v</span></button>' +
        '<div class="passage-content" id="pc-' + idx + '">' + q._passages[q.passage_id] + '</div></div>';
    }

    var imgHTML = q.photo
      ? '<img class="question-image" src="exam_images/question/' + q.photo + '" onerror="this.style.display=\'none\'" />'
      : '';

    var explainFields = [];
    if (q.core_concepts   && String(q.core_concepts).trim())   explainFields.push({ key:'core',    label:'Core Concept',   val: q.core_concepts   });
    if (q.step_by_step    && String(q.step_by_step).trim())    explainFields.push({ key:'step',    label:'Step by Step',   val: q.step_by_step    });
    if (q.common_pitfalls && String(q.common_pitfalls).trim()) explainFields.push({ key:'pitfall', label:'Pitfalls',       val: q.common_pitfalls });
    if (q.applications    && String(q.applications).trim())    explainFields.push({ key:'app',     label:'Applications',   val: q.applications    });

    var explainHTML = '';
    if (explainFields.length) {
      var tabBtns = '';
      for (var ei = 0; ei < explainFields.length; ei++) {
        tabBtns += '<button class="explain-tab' + (ei===0?' active':'') +
          '" data-key="' + explainFields[ei].key + '" data-idx="' + idx + '">' +
          explainFields[ei].label + '</button>';
      }
      explainHTML =
        '<button class="explain-toggle" id="et-' + idx + '">Explain <span>v</span></button>' +
        '<div class="explain-panel" id="ep-' + idx + '">' +
          '<div class="explain-tabs">' + tabBtns + '</div>' +
          '<div class="explain-content" id="ec-' + idx + '">' + explainFields[0].val + '</div>' +
        '</div>';
    }

    var div = document.createElement('div');
    div.className = 'review-item';
    div.innerHTML =
      '<div class="review-item-header">' +
        '<span class="review-badge ' + sc + '-badge">' + sm + '</span>' +
        '<span class="review-q-num">Q' + (idx+1) + ' - ' + q._subTitle + '</span>' +
        '<span class="status-badge ' + sc + '">' + sl + '</span>' +
      '</div>' +
      '<div class="review-item-body">' +
        passHTML +
        '<div class="review-question-text">' + q.question + '</div>' +
        imgHTML +
        '<div class="review-options">' + optsHTML + '</div>' +
        explainHTML +
      '</div>';
    body.appendChild(div);

    if (q.passage_id && q._passages && q._passages[q.passage_id]) {
      (function(pidx) {
        var pt = getById('pt-' + pidx);
        var pc = getById('pc-' + pidx);
        if (pt && pc) {
          pt.onclick = function() {
            pc.classList.toggle('open');
            pt.querySelector('span').textContent = pc.classList.contains('open') ? '^' : 'v';
          };
        }
      })(idx);
    }

    if (explainFields.length) {
      (function(eidx, fields) {
        var et = getById('et-' + eidx);
        var ep = getById('ep-' + eidx);
        var ec = getById('ec-' + eidx);
        if (et && ep) {
          et.onclick = function() {
            ep.classList.toggle('open');
            et.querySelector('span').textContent = ep.classList.contains('open') ? '^' : 'v';
          };
        }
        var etabs = ep ? ep.querySelectorAll('.explain-tab') : [];
        for (var ti = 0; ti < etabs.length; ti++) {
          (function(tab) {
            tab.onclick = function() {
              for (var x = 0; x < etabs.length; x++) etabs[x].classList.remove('active');
              tab.classList.add('active');
              var key = tab.dataset.key;
              for (var fi = 0; fi < fields.length; fi++) {
                if (fields[fi].key === key) { ec.textContent = fields[fi].val; break; }
              }
              if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([ec]).catch(function() {});
              }
            };
          })(etabs[ti]);
        }
      })(idx, explainFields);
    }
  }

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([body]).catch(function() {});
  }
}

/* ====================================================
   CALCULATOR
   ==================================================== */
(function() {
  var overlay   = getById('calc-overlay');
  var toggleBtn = getById('btn-calc-toggle');
  var closeBtn  = getById('calc-close');
  var exprEl    = getById('calc-expr');
  var resultEl  = getById('calc-result');
  if (!overlay || !toggleBtn) return;

  var panel = getById('calc-panel');
  if (panel) panel.onclick = function(e) { e.stopPropagation(); };

  var expr = '', input = '0', evaled = false;

  function openCalc()  { overlay.style.display = 'flex'; overlay.style.pointerEvents = 'all'; toggleBtn.classList.add('active'); }
  function closeCalc() { overlay.style.display = 'none'; overlay.style.pointerEvents = 'none'; toggleBtn.classList.remove('active'); }

  toggleBtn.onclick = function(e) {
    e.stopPropagation();
    if (overlay.style.display === 'none' || overlay.style.display === '') openCalc(); else closeCalc();
  };
  closeBtn.onclick = function(e) { e.stopPropagation(); closeCalc(); };
  overlay.onclick  = function(e) { e.stopPropagation(); if (e.target === overlay) closeCalc(); };

  function toJS(s) {
    return s.replace(/div/g,'/').replace(/mul/g,'*').replace(/minus/g,'-')
            .replace(/DIVIDE/g,'/').replace(/TIMES/g,'*').replace(/MINUS/g,'-');
  }

  function draw() {
    exprEl.textContent   = expr;
    resultEl.textContent = input;
    var len = input.length;
    resultEl.style.fontSize = len > 12 ? '1.1rem' : len > 8 ? '1.5rem' : '2rem';
  }

  function safeEval(str) {
    str = str.replace(/[^0-9+\-*\/().]/g, '');
    try {
      var result = (new Function('return (' + str + ')'))();
      return result;
    } catch(e) { return NaN; }
  }

  function press(btn) {
    var action = btn.dataset ? btn.dataset.action : null;
    var val    = btn.dataset ? btn.dataset.val : null;

    if (action === 'clear') {
      expr = ''; input = '0'; evaled = false;
    } else if (action === 'del') {
      if (evaled) { input = '0'; evaled = false; }
      else input = input.length > 1 ? input.slice(0,-1) : '0';
    } else if (action === 'sqrt') {
      var n = parseFloat(input);
      if (!isNaN(n) && n >= 0) {
        input = String(parseFloat(Math.sqrt(n).toFixed(10)));
        expr  = 'sqrt=' + input;
        evaled = true;
      } else { input = 'Error'; }
    } else if (action === 'equals') {
      if (!expr && input === '0') return;
      var full    = expr + input;
      var jsExpr  = full.replace(/x/g,'*').replace(/div/g,'/');
      var res     = safeEval(jsExpr);
      if (isNaN(res) || !isFinite(res)) { input = 'Error'; expr = ''; }
      else { input = String(parseFloat(res.toFixed(10))); expr = full + '='; evaled = true; }
    } else if (val && '+-x/'.indexOf(val) > -1) {
      if (input === 'Error') { input = '0'; expr = ''; }
      if (evaled) evaled = false;
      var last = expr.slice(-1);
      if (last && '+-x/'.indexOf(last) > -1) expr = expr.slice(0,-1) + val;
      else { expr += input + val; input = '0'; }
    } else if (val) {
      if (evaled) { expr = ''; input = '0'; evaled = false; }
      if (val === '.') {
        if (input.indexOf('.') === -1) input += '.';
      } else {
        input = input === '0' ? val : input + val;
        if (input.length > 15) return;
      }
    }
    draw();
  }

  var calcBtns = document.querySelectorAll('.calc-btn');
  for (var i = 0; i < calcBtns.length; i++) {
    (function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        press(btn);
      };
    })(calcBtns[i]);
  }

  document.onkeydown = function(e) {
    if (overlay.classList.contains('hidden')) return;
    var map = { '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
      '.':'.', '+':'+', '-':'-', '*':'*', '/':'/',
      'Enter':'eq','=':'eq','Backspace':'del','Escape':'clear' };
    var k = map[e.key];
    if (!k) return;
    e.preventDefault();
    if (k === 'eq')    press({ dataset: { action: 'equals' } });
    else if (k === 'del')   press({ dataset: { action: 'del' } });
    else if (k === 'clear') press({ dataset: { action: 'clear' } });
    else press({ dataset: { val: k } });
  };

  draw();
})();

/* ====================================================
   INIT
   ==================================================== */
initParticles();
showScreen('home');
