/* ============================================================
   BloodLink AI — script.js
   Vanilla JS prototype for hackathon demo
   ============================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     1. CONSTANTS & BLOOD COMPATIBILITY MATRIX
     ────────────────────────────────────────────── */

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const DONOR_COMPAT = {
    'A+':  ['A+', 'A-', 'O+', 'O-'],
    'A-':  ['A-', 'O-'],
    'B+':  ['B+', 'B-', 'O+', 'O-'],
    'B-':  ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+':  ['O+', 'O-'],
    'O-':  ['O-']
  };

  const DONOR_GIVES_TO = {
    'A+':  ['A+', 'AB+'],
    'A-':  ['A+', 'A-', 'AB+', 'AB-'],
    'B+':  ['B+', 'AB+'],
    'B-':  ['B+', 'B-', 'AB+', 'AB-'],
    'AB+': ['AB+'],
    'AB-': ['AB+', 'AB-'],
    'O+':  ['A+', 'B+', 'O+', 'AB+'],
    'O-':  ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  };

  const STORAGE_KEY = 'bloodlink_ai_state';

  /* ──────────────────────────────────────────────
     2. STATE MANAGEMENT & LOCALSTORAGE
     ────────────────────────────────────────────── */

  function defaultState() {
    return {
      donors: [
        { id: 'D-1001', name: 'Ahmed Raza Khan',  age: 28, blood: 'O-',  location: 'Lahore',     phone: '+92 300 1234567', email: 'ahmed.raza@email.com',  cnic: '4521', weight: 78, available: true,  lastDonation: '2025-11-15', medical: '' },
        { id: 'D-1002', name: 'Fatima Noor',       age: 34, blood: 'A+',  location: 'Karachi',    phone: '+92 321 9876543', email: 'fatima.noor@email.com', cnic: '8832', weight: 62, available: true,  lastDonation: '2026-02-10', medical: '' },
        { id: 'D-1003', name: 'Usman Ali Sheikh',  age: 22, blood: 'B+',  location: 'Islamabad',  phone: '+92 333 5551234', email: 'usman.ali@email.com',   cnic: '1197', weight: 85, available: false, lastDonation: '2026-06-01', medical: 'Mild hypertension, managed' },
        { id: 'D-1004', name: 'Ayesha Malik',      age: 29, blood: 'AB+', location: 'Lahore',     phone: '+92 345 7778899', email: 'ayesha.m@email.com',    cnic: '6643', weight: 58, available: true,  lastDonation: '2025-09-22', medical: '' },
        { id: 'D-1005', name: 'Hassan Tariq Butt', age: 41, blood: 'O+',  location: 'Rawalpindi', phone: '+92 312 4443322', email: 'hassan.tariq@email.com', cnic: '3308', weight: 92, available: true,  lastDonation: '2026-01-05', medical: '' }
      ],
      requests: [
        { id: '#REQ-8471', patient: 'Zainab Bibi',      blood: 'A+', units: 2, location: 'Mayo Hospital, Lahore',     urgency: 'high',     contact: '+92 300 5551122', notes: 'Surgery scheduled tomorrow morning.', status: 'completed', matchedDonor: 'D-1002', createdAt: '2026-08-28T09:14:00Z' },
        { id: '#REQ-8485', patient: 'Bilal Ahmed Shah', blood: 'B+', units: 1, location: 'Shifa Hospital, Islamabad', urgency: 'critical', contact: '+92 333 9998877', notes: 'Emergency trauma case.',              status: 'completed', matchedDonor: 'D-1003', createdAt: '2026-08-30T17:42:00Z' },
        /* One pending request so the Smart Match page has live work out of the box. */
        { id: '#REQ-8491', patient: 'Ahsan Javed',      blood: 'O+', units: 2, location: 'Jinnah Hospital, Lahore', urgency: 'critical', contact: '+92 333 4005566', notes: 'Road accident — surgery tonight.',    status: 'searching', matchedDonor: null,        createdAt: new Date(Date.now() - 5 * 3600000).toISOString() }
      ],
      matches: 2,
      nextDonorNum: 1006,
      nextReqNum: 8492
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* corrupt data — fall through */ }
    return defaultState();
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* quota exceeded — silent */ }
  }

  let state = loadState();

  /* ──────────────────────────────────────────────
     3. UTILITY HELPERS
     ────────────────────────────────────────────── */

  const $  = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return document.querySelectorAll(sel); };

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /* ──────────────────────────────────────────────
     4. TOAST NOTIFICATION HELPER
     ────────────────────────────────────────────── */

  let toastTimer = null;

  function showToast(message, type) {
    type = type || 'info';
    const toast = $('#toast');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.textContent = message;
    toast.className = 'toast toast-' + type + ' show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3800);
  }

  /* ──────────────────────────────────────────────
     5. ANIMATED COUNTERS (IntersectionObserver)
     ────────────────────────────────────────────── */

  const countedSet = new Set();

  function animateCounter(el, target) {
    if (countedSet.has(el)) { el.textContent = target; return; }
    countedSet.add(el);

    var duration = 1400;
    var start = performance.now();

    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function setupCounters() {
    var pairs = [
      { sel: '#donorCount',   val: function () { return state.donors.length; } },
      { sel: '#requestCount', val: function () { return state.requests.length; } },
      { sel: '#matchCount',   val: function () { return state.matches; } },
      { sel: '#statDonors',   val: function () { return state.donors.filter(function (d) { return d.available; }).length; } },
      { sel: '#statRequests', val: function () { return state.requests.length; } },
      { sel: '#statMatches',  val: function () { return state.matches; } },
      { sel: '#statCities',   val: function () { return new Set(state.donors.map(function (d) { return d.location.toLowerCase(); })).size; } }
    ];

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var p = pairs.find(function (t) { return t.el === entry.target; });
          if (p) animateCounter(p.el, p.val());
        }
      });
    }, { threshold: 0.3 });

    pairs.forEach(function (p) {
      var el = $(p.sel);
      if (el) { p.el = el; observer.observe(el); }
    });
  }

  function refreshAllStats() {
    var map = {
      '#donorCount':   state.donors.length,
      '#requestCount': state.requests.length,
      '#matchCount':   state.matches,
      '#statDonors':   state.donors.filter(function (d) { return d.available; }).length,
      '#statRequests': state.requests.length,
      '#statMatches':  state.matches,
      '#statCities':   new Set(state.donors.map(function (d) { return d.location.toLowerCase(); })).size
    };
    Object.keys(map).forEach(function (sel) {
      var el = $(sel);
      if (el) el.textContent = map[sel];
    });
  }

  /* ──────────────────────────────────────────────
     6. NAVBAR — Scroll Shadow & Hamburger Toggle
     ────────────────────────────────────────────── */

  function initNavbar() {
    var navbar    = $('#navbar');
    var hamburger = $('#hamburger');
    var navLinks  = $('#navLinks');

    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    });

    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  /* ──────────────────────────────────────────────
     6b. AUTO-ADVANCING INPUTS
     ────────────────────────────────────────────── */

  function initAutoAdvance(fieldIds) {
    fieldIds.forEach(function (id, index) {
      var el = document.getElementById(id);
      if (!el) return;
      var nextId = fieldIds[index + 1];
      var nextEl = nextId ? document.getElementById(nextId) : null;

      function advance() {
        if (nextEl) {
          nextEl.focus();
        }
      }

      // Enter key advances to next field (and prevents form submit)
      // Textareas keep the default behavior so Enter still inserts line breaks
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && el.tagName !== 'TEXTAREA') {
          e.preventDefault();
          advance();
        }
      });

      // Selects auto-advance on change
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', function () {
          // Small delay so the user sees the selection
          setTimeout(advance, 120);
        });
      }

      // Maxlength fields auto-advance when full (e.g. CNIC 4 digits)
      if (el.maxLength && el.maxLength > 0 && el.tagName === 'INPUT') {
        el.addEventListener('input', function () {
          if (el.value.length >= el.maxLength) {
            advance();
          }
        });
      }
    });
  }

  /* ──────────────────────────────────────────────
     7. DONOR REGISTRATION — Validation & Submit
     ────────────────────────────────────────────── */

  function setField(inputEl, errorEl, msg) {
    if (msg) {
      inputEl.classList.add('error');
      inputEl.classList.remove('valid');
      inputEl.setAttribute('aria-invalid', 'true');
      errorEl.textContent = msg;
    } else {
      inputEl.classList.remove('error');
      inputEl.classList.add('valid');
      inputEl.setAttribute('aria-invalid', 'false');
      errorEl.textContent = '';
    }
  }

  function clearFieldStates() {
    $$('#donorForm input, #donorForm select, #donorForm textarea').forEach(function (el) {
      el.classList.remove('valid', 'error');
      el.setAttribute('aria-invalid', 'false');
    });
    $$('#donorForm .error-msg').forEach(function (el) { el.textContent = ''; });
  }

  function validateDonorForm() {
    var ok = true;

    var name   = $('#donorName');
    var age    = $('#donorAge');
    var blood  = $('#donorBlood');
    var loc    = $('#donorLocation');
    var phone  = $('#donorPhone');
    var email  = $('#donorEmail');
    var cnic   = $('#donorCNIC');
    var weight = $('#donorWeight');

    if (name.value.trim().length < 2) {
      setField(name, $('#donorNameError'), 'Full name is required (min 2 characters).');
      ok = false;
    } else { setField(name, $('#donorNameError'), ''); }

    var ageVal = parseInt(age.value, 10);
    if (isNaN(ageVal) || ageVal < 18 || ageVal > 65) {
      setField(age, $('#donorAgeError'), 'Age must be between 18 and 65.');
      ok = false;
    } else { setField(age, $('#donorAgeError'), ''); }

    if (!blood.value) {
      setField(blood, $('#donorBloodError'), 'Please select a blood group.');
      ok = false;
    } else { setField(blood, $('#donorBloodError'), ''); }

    if (!loc.value.trim()) {
      setField(loc, $('#donorLocationError'), 'City / location is required.');
      ok = false;
    } else { setField(loc, $('#donorLocationError'), ''); }

    var pc = phone.value.replace(/[\s\-]/g, '');
    if (!/^(\+92|0)\d{10,11}$/.test(pc)) {
      setField(phone, $('#donorPhoneError'), 'Enter a valid Pakistani phone number.');
      ok = false;
    } else { setField(phone, $('#donorPhoneError'), ''); }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      setField(email, $('#donorEmailError'), 'Enter a valid email address.');
      ok = false;
    } else { setField(email, $('#donorEmailError'), ''); }

    if (!/^\d{4}$/.test(cnic.value.trim())) {
      setField(cnic, $('#donorCNICError'), 'Enter exactly 4 digits.');
      ok = false;
    } else { setField(cnic, $('#donorCNICError'), ''); }

    var wv = parseFloat(weight.value);
    if (isNaN(wv) || wv < 50) {
      setField(weight, $('#donorWeightError'), 'Minimum weight is 50 kg.');
      ok = false;
    } else { setField(weight, $('#donorWeightError'), ''); }

    return ok;
  }

  /* ── Duplicate donor detection (data integrity) ──
     The same person must not be registered twice. Phone numbers are
     normalized ("+92 300 1234567" and "0300-1234567" are the same number)
     so formatting differences cannot sneak a duplicate through. */
  function normalizePhone(raw) {
    var v = (raw || '').replace(/[\s\-()]/g, '');
    if (v.indexOf('+92') === 0) v = '0' + v.slice(3);
    return v;
  }

  function findDuplicateDonor(phone, email, cnic) {
    var ph = normalizePhone(phone);
    var em = (email || '').trim().toLowerCase();
    var cn = (cnic || '').trim();
    var result = { donor: null, fields: [] };

    state.donors.forEach(function (d) {
      var matched = false;
      if (ph && normalizePhone(d.phone) === ph) { result.fields.push('phone'); matched = true; }
      if (em && (d.email || '').trim().toLowerCase() === em) { result.fields.push('email'); matched = true; }
      if (cn && (d.cnic || '').trim() === cn) { result.fields.push('CNIC'); matched = true; }
      if (matched && !result.donor) result.donor = d;
    });

    return result;
  }

  function initDonorForm() {
    var form  = $('#donorForm');
    if (!form) return;
    var toggle = $('#donorAvailable');
    var label  = $('#toggleLabel');

    function syncLabel() {
      if (toggle.checked) {
        label.textContent = 'Available';
        label.classList.remove('unavailable');
      } else {
        label.textContent = 'Unavailable';
        label.classList.add('unavailable');
      }
    }
    toggle.addEventListener('change', syncLabel);
    syncLabel();

    // Auto-advance between fields
    initAutoAdvance([
      'donorName','donorAge','donorBlood','donorLocation',
      'donorPhone','donorEmail','donorCNIC','donorWeight',
      'donorLastDonation','donorMedical'
    ]);

    // Blur-based live validation
    ['donorName','donorAge','donorBlood','donorLocation','donorPhone','donorEmail','donorCNIC','donorWeight'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('blur', function () { validateDonorForm(); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateDonorForm()) {
        showToast('Please fix the highlighted errors.', 'error');
        return;
      }

      // Data integrity: reject donors already registered with the same
      // phone number, email address, or CNIC (last 4 digits).
      var dupe = findDuplicateDonor(
        $('#donorPhone').value,
        $('#donorEmail').value,
        $('#donorCNIC').value
      );
      if (dupe.donor) {
        if (dupe.fields.indexOf('phone') !== -1) {
          setField($('#donorPhone'), $('#donorPhoneError'),
            'This phone number is already registered to ' + dupe.donor.id + ' (' + dupe.donor.name + ').');
        }
        if (dupe.fields.indexOf('email') !== -1) {
          setField($('#donorEmail'), $('#donorEmailError'),
            'This email address is already registered to ' + dupe.donor.id + ' (' + dupe.donor.name + ').');
        }
        if (dupe.fields.indexOf('CNIC') !== -1) {
          setField($('#donorCNIC'), $('#donorCNICError'),
            'This CNIC is already registered to ' + dupe.donor.id + ' (' + dupe.donor.name + ').');
        }
        showToast('Duplicate donor — ' + dupe.donor.name + ' (' + dupe.donor.id +
                  ') is already registered with this ' + dupe.fields.join(' / ') + '.', 'error');
        return;
      }

      var donor = {
        id:           'D-' + state.nextDonorNum++,
        name:         $('#donorName').value.trim(),
        age:          parseInt($('#donorAge').value, 10),
        blood:        $('#donorBlood').value,
        location:     $('#donorLocation').value.trim(),
        phone:        $('#donorPhone').value.trim(),
        email:        $('#donorEmail').value.trim(),
        cnic:         $('#donorCNIC').value.trim(),
        weight:       parseFloat($('#donorWeight').value),
        available:    toggle.checked,
        lastDonation: $('#donorLastDonation').value || '',
        medical:      $('#donorMedical').value.trim()
      };

      state.donors.push(donor);
      saveState();
      form.reset();
      toggle.checked = true;
      syncLabel();
      clearFieldStates();
      refreshAllStats();
      renderDonationHistory();
      showToast('Donor ' + donor.name + ' registered! (ID: ' + donor.id + ')', 'success');
    });
  }

  /* ──────────────────────────────────────────────
     8. BLOOD REQUEST — Submit & Tracker Simulation
     ────────────────────────────────────────────── */

  function validateRequestForm() {
    var ok = true;

    var patient  = $('#patientName');
    var blood    = $('#requestBlood');
    var units    = $('#unitsNeeded');
    var location = $('#requestLocation');
    var urgency  = $('#urgency');
    var contact  = $('#contactNumber');

    if (!patient.value.trim()) {
      setField(patient, $('#patientNameError'), 'Patient name is required.'); ok = false;
    } else { setField(patient, $('#patientNameError'), ''); }

    if (!blood.value) {
      setField(blood, $('#requestBloodError'), 'Select blood group needed.'); ok = false;
    } else { setField(blood, $('#requestBloodError'), ''); }

    var uv = parseInt(units.value, 10);
    if (isNaN(uv) || uv < 1 || uv > 10) {
      setField(units, $('#unitsNeededError'), 'Units must be between 1 and 10.'); ok = false;
    } else { setField(units, $('#unitsNeededError'), ''); }

    if (!location.value.trim()) {
      setField(location, $('#requestLocationError'), 'Hospital / location is required.'); ok = false;
    } else { setField(location, $('#requestLocationError'), ''); }

    if (!urgency.value) {
      setField(urgency, $('#urgencyError'), 'Select urgency level.'); ok = false;
    } else { setField(urgency, $('#urgencyError'), ''); }

    var cc = contact.value.replace(/[\s\-]/g, '');
    if (!/^(\+92|0)\d{10,11}$/.test(cc)) {
      setField(contact, $('#contactNumberError'), 'Enter a valid phone number.'); ok = false;
    } else { setField(contact, $('#contactNumberError'), ''); }

    return ok;
  }

  function resetTracker() {
    var ids = ['step-searching', 'step-found', 'step-onway', 'step-completed'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active', 'completed', 'failed');
    });
    var search = document.getElementById('step-searching');
    if (search) {
      search.classList.add('active');
      var strong = search.querySelector('strong');
      var p = search.querySelector('p');
      if (strong) strong.textContent = 'Searching';
      if (p) p.textContent = 'Finding compatible donors near you...';
    }
    var fill = $('#trackerProgressFill');
    if (fill) {
      fill.classList.remove('failed');
      fill.style.width = '0%';
    }
  }

  function advanceTracker(stepId, pct) {
    var order = ['step-searching', 'step-found', 'step-onway', 'step-completed'];
    var idx = order.indexOf(stepId);
    order.forEach(function (id, i) {
      var el = document.getElementById(id);
      el.classList.remove('active', 'completed');
      if (i < idx) el.classList.add('completed');
      if (i === idx) el.classList.add('active');
    });
    $('#trackerProgressFill').style.width = pct + '%';
  }

  /* Terminal failure: the search ended without a single compatible donor.
     Turns the "Searching" step into a "No Match Found" step instead of
     leaving the tracker pulsing forever. */
  function failTracker() {
    var ids = ['step-searching', 'step-found', 'step-onway', 'step-completed'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active', 'completed');
    });
    var search = document.getElementById('step-searching');
    if (search) {
      search.classList.add('failed');
      var strong = search.querySelector('strong');
      var p = search.querySelector('p');
      if (strong) strong.textContent = 'No Match Found';
      if (p) p.textContent = 'Search ended — no compatible available donor.';
    }
    var fill = $('#trackerProgressFill');
    if (fill) {
      fill.classList.add('failed');
      fill.style.width = '100%';
    }
  }

  /* Pending tracker timers. Cleared whenever a new search starts or the
     request is cancelled, so simulations never overlap or get stuck. */
  var trackerTimeouts = [];
  var activeTrackedRequest = null;

  function scheduleTracker(fn, delay) {
    trackerTimeouts.push(setTimeout(fn, delay));
  }

  function clearTrackerTimeouts() {
    trackerTimeouts.forEach(function (id) { clearTimeout(id); });
    trackerTimeouts = [];
  }

  /* Medical rule: whole-blood donors must wait at least 56 days between
     donations. Donors with no recorded lastDonation are eligible. */
  function donatedWithin56Days(d) {
    if (!d.lastDonation) return false;
    var last = new Date(d.lastDonation);
    if (isNaN(last.getTime())) return false;
    return (new Date() - last) < 56 * 86400000;
  }

  function findBestDonor(requestBlood, requestCity) {
    var compat = DONOR_COMPAT[requestBlood] || [];
    return state.donors
      .filter(function (d) { return compat.indexOf(d.blood) !== -1; })  // compatible blood type
      .filter(function (d) { return d.available === true; })             // currently available only
      .filter(function (d) { return !donatedWithin56Days(d); })          // 56-day donation interval
      .map(function (d) {
        var score = 0;
        score += (d.blood === requestBlood) ? 50 : 35;
        score += (d.location.toLowerCase() === requestCity.toLowerCase()) ? 30 : 5;
        if (d.weight >= 50) score += 20;
        return { donor: d, score: Math.min(score, 100) };
      })
      .sort(function (a, b) { return b.score - a.score; });
  }

  function showNotificationOverlay(donor, req) {
    var overlay = $('#notificationOverlay');
    if (!overlay) return;
    $('#notifTitle').innerHTML = '&#127881; Match Found!';
    $('#notifMessage').textContent =
      'Compatible donor ' + donor.name + ' (' + donor.blood + ') found for ' +
      req.patient + ' at ' + req.location + '.';
    $('#smsMessage').textContent =
      'BloodLink AI: Donor match confirmed! ' + donor.name + ' (' + donor.blood +
      ') is being notified. Track status in app. Ref: ' + req.id;
    overlay.classList.add('show');
  }

  function extractCity(raw) {
    var m = raw.match(/,?\s*([A-Za-z][A-Za-z\s]*?)\s*$/);
    return m ? m[1].trim() : raw;
  }

  function initNotificationOverlay() {
    var overlay = $('#notificationOverlay');
    var closeBtn = $('#notifClose');
    if (!overlay || !closeBtn) return;

    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Match notification preview');

    closeBtn.addEventListener('click', function () { overlay.classList.remove('show'); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  }

  /* ── "No Match Found" terminal state ──────────────
     Injected into the tracker card so the user is never stuck on an
     endless "Searching" step: a retry button re-runs the AI search and
     a cancel button closes the request out. */
  function ensureNoMatchUI() {
    var tracker = $('#requestTracker');
    if (!tracker || $('#trackerNoMatch')) return;

    var box = document.createElement('div');
    box.id = 'trackerNoMatch';
    box.className = 'tracker-nomatch';
    box.style.display = 'none';
    box.innerHTML =
      '<div class="tracker-nomatch-icon">&#128683;</div>' +
      '<h4>No Match Found</h4>' +
      '<p>The AI searched the entire network but no compatible, available donor could be matched to this request right now. New donors may register at any time — retry the search or cancel the request.</p>' +
      '<div class="tracker-nomatch-actions">' +
        '<button type="button" class="btn btn-danger" id="trackerRetryBtn"><span class="btn-icon">&#8635;</span> Retry Search</button>' +
        '<button type="button" class="btn btn-outline" id="trackerCancelBtn"><span class="btn-icon">&#10006;</span> Cancel Request</button>' +
      '</div>';

    var card = tracker.querySelector('.tracker-card');
    var bar  = tracker.querySelector('.tracker-progress-bar');
    if (card && bar) card.insertBefore(box, bar.nextSibling);
    else tracker.appendChild(box);
  }

  function showNoMatchState() {
    ensureNoMatchUI();
    var box = $('#trackerNoMatch');
    if (box) box.style.display = 'block';
  }

  function hideNoMatchState() {
    var box = $('#trackerNoMatch');
    if (box) box.style.display = 'none';
  }

  /* Full matching simulation for one request: searching → found →
     on the way → completed, or the terminal "No Match Found" state. */
  function runMatchSimulation(req) {
    clearTrackerTimeouts();
    activeTrackedRequest = req;

    resetTracker();
    hideNoMatchState();
    req.status = 'searching';
    req.matchedDonor = null;
    saveState();

    var city    = extractCity(req.location);
    var matches = findBestDonor(req.blood, city);
    var best    = matches.length > 0 ? matches[0] : null;

    // Terminal state: no compatible donor anywhere in the network
    if (!best) {
      scheduleTracker(function () {
        req.status = 'no-match';
        saveState();
        failTracker();
        showNoMatchState();
        showToast('No compatible donors available for ' + req.blood + ' blood right now.', 'error');
      }, 2600);
      return;
    }

    var donor = best.donor;

    // Step 2: Donor Found
    scheduleTracker(function () {
      advanceTracker('step-found', 33);
      req.status = 'found';
      req.matchedDonor = donor.id;
      saveState();
      showToast('Compatible donor found: ' + donor.name + ' (' + donor.blood + ')', 'success');

      scheduleTracker(function () { showNotificationOverlay(donor, req); }, 700);

      // Step 3: On the Way
      scheduleTracker(function () {
        advanceTracker('step-onway', 66);
        req.status = 'onway';
        saveState();
        showToast(donor.name + ' is on the way to ' + req.location + '.', 'info');
      }, 3500);

      // Step 4: Completed
      scheduleTracker(function () {
        advanceTracker('step-completed', 100);
        req.status = 'completed';
        state.matches++;
        saveState();
        refreshAllStats();
        renderDonationHistory();
        showToast('Donation completed! ' + donor.name + ' saved a life today.', 'success');
      }, 7000);
    }, 2500);
  }

  function cancelTrackedRequest() {
    if (!activeTrackedRequest) return;
    var req = activeTrackedRequest;

    clearTrackerTimeouts();
    hideNoMatchState();
    req.status = 'cancelled';
    req.matchedDonor = null;
    saveState();
    refreshAllStats();

    var trackerEl = $('#requestTracker');
    if (trackerEl) trackerEl.style.display = 'none';
    activeTrackedRequest = null;
    showToast('Request ' + req.id + ' cancelled.', 'info');
  }

  function initRequestForm() {
    var form = $('#requestForm');
    if (!form) return;

    // Auto-advance between fields
    initAutoAdvance([
      'patientName','requestBlood','unitsNeeded',
      'requestLocation','urgency','contactNumber','additionalNotes'
    ]);

    // Wire the Retry / Cancel buttons of the "No Match Found" state
    ensureNoMatchUI();
    var retryBtn  = $('#trackerRetryBtn');
    var cancelBtn = $('#trackerCancelBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        if (!activeTrackedRequest) return;
        showToast('Retrying donor search for ' + activeTrackedRequest.id + '...', 'info');
        runMatchSimulation(activeTrackedRequest);
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', cancelTrackedRequest);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateRequestForm()) {
        showToast('Please fix the highlighted errors.', 'error');
        return;
      }

      var rawLoc = $('#requestLocation').value.trim();

      var req = {
        id:            '#REQ-' + state.nextReqNum++,
        patient:       $('#patientName').value.trim(),
        blood:         $('#requestBlood').value,
        units:         parseInt($('#unitsNeeded').value, 10),
        location:      rawLoc,
        urgency:       $('#urgency').value,
        contact:       $('#contactNumber').value.trim(),
        notes:         $('#additionalNotes').value.trim(),
        status:        'searching',
        matchedDonor:  null,
        createdAt:     new Date().toISOString()
      };

      state.requests.push(req);
      saveState();
      refreshAllStats();

      // Show tracker
      var trackerEl = $('#requestTracker');
      trackerEl.style.display = 'block';
      $('#trackerId').textContent    = req.id;
      $('#trackerBlood').textContent = req.blood + ' Blood';

      // Clear form
      form.reset();
      $$('#requestForm input, #requestForm select').forEach(function (el) {
        el.classList.remove('valid', 'error');
        el.setAttribute('aria-invalid', 'false');
      });
      $$('#requestForm .error-msg').forEach(function (el) { el.textContent = ''; });

      showToast('Blood request submitted! AI is searching for donors...', 'info');
      setTimeout(function () { trackerEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);

      // Run matching simulation (handles both success and No Match Found)
      runMatchSimulation(req);
    });
  }

  /* ──────────────────────────────────────────────
     9. AI SMART MATCHING — Pending Requests & Results
     ────────────────────────────────────────────── */

  function scoreClass(s) { return s >= 70 ? 'score-high' : s >= 45 ? 'score-medium' : 'score-low'; }
  function scoreLabel(s) { return s >= 70 ? 'High Match' : s >= 45 ? 'Medium Match' : 'Low Match'; }
  function initials(name) { return name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase(); }

  /* ── Pending requests (submitted via the Request Blood page) ──
     A request stays "pending" until it is completed or cancelled,
     no matter which pipeline (auto tracker or Smart Match) fulfils it. */
  var PENDING_STATUS_LABEL = {
    'searching': 'AI searching',
    'found':     'Donor found',
    'onway':     'Donor on the way',
    'no-match':  'No match yet'
  };

  var URGENCY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  var URGENCY_RANK  = { critical: 4, high: 3, medium: 2, low: 1 };

  function urgencyLabel(u) { return URGENCY_LABEL[u] || 'Normal'; }

  function isPendingRequest(r) {
    return r.status !== 'completed' && r.status !== 'cancelled';
  }

  /* Most urgent first; equal urgency waits the longest first. */
  function getPendingRequests() {
    return state.requests
      .filter(isPendingRequest)
      .sort(function (a, b) {
        var rankDiff = (URGENCY_RANK[b.urgency] || 0) - (URGENCY_RANK[a.urgency] || 0);
        if (rankDiff !== 0) return rankDiff;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }

  function timeAgo(iso) {
    var t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    var mins = Math.floor((Date.now() - t) / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return mins + ' minute' + (mins === 1 ? '' : 's') + ' ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24)  return hrs + ' hour' + (hrs === 1 ? '' : 's') + ' ago';
    var days = Math.floor(hrs / 24);
    return days + ' day' + (days === 1 ? '' : 's') + ' ago';
  }

  /* The request the Smart Match page currently matches against.
     null → the page runs in plain manual-filter mode. */
  var activeMatchRequest = null;
  var currentMatches = [];

  function urgencyBadge(u) {
    var cls = URGENCY_RANK[u] ? u : 'medium';
    return '<span class="urgency-badge ' + cls + '">' + urgencyLabel(u) + '</span>';
  }

  function renderPendingRequests() {
    var wrap = $('#pendingRequests');
    var list = $('#pendingRequestsList');
    if (!wrap || !list) return;

    var pending = getPendingRequests();
    if (pending.length === 0) {
      wrap.style.display = 'none';
      list.innerHTML = '';
      return;
    }

    wrap.style.display = 'block';
    var count = $('#pendingCount');
    if (count) {
      count.textContent = pending.length + ' request' + (pending.length === 1 ? '' : 's') + ' waiting for a donor';
    }

    var html = '';
    pending.forEach(function (r, i) {
      var isActive = activeMatchRequest && activeMatchRequest.id === r.id;
      var urgency  = URGENCY_RANK[r.urgency] ? r.urgency : 'medium';
      html +=
        '<div class="pending-card urgency-' + urgency + (isActive ? ' active' : '') + '"' +
             ' data-req="' + escapeHtml(r.id) + '" role="button" tabindex="0"' +
             ' aria-pressed="' + (isActive ? 'true' : 'false') + '"' +
             ' aria-label="Match donors for request ' + escapeHtml(r.id) +
               ', ' + escapeHtml(r.blood) + ' blood, ' + urgencyLabel(r.urgency) + ' urgency"' +
             ' style="animation-delay:' + (i * 0.07) + 's">' +
          '<div class="pending-blood">' + escapeHtml(r.blood) + '</div>' +
          '<div class="pending-body">' +
            '<div class="pending-top">' +
              '<span class="pending-patient">' + escapeHtml(r.patient) + '</span>' +
              '<span class="pending-id">' + escapeHtml(r.id) + '</span>' +
            '</div>' +
            '<div class="pending-meta">' +
              urgencyBadge(r.urgency) +
              '<span title="Hospital">&#127973; ' + escapeHtml(r.location) + '</span>' +
              '<span title="Units needed">&#129657; ' + r.units + ' unit' + (r.units > 1 ? 's' : '') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="pending-side">' +
            '<span class="pending-time" title="Submitted">' + timeAgo(r.createdAt) + '</span>' +
            '<span class="pending-status st-' + escapeHtml(r.status) + '">' +
              (PENDING_STATUS_LABEL[r.status] || escapeHtml(r.status)) +
            '</span>' +
          '</div>' +
        '</div>';
    });

    list.innerHTML = html;
  }

  /* Banner above the results showing which request is being matched. */
  function renderMatchContext() {
    var el = $('#matchContext');
    if (!el) return;

    if (!activeMatchRequest) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }

    var req = activeMatchRequest;
    var done = req.status === 'completed';

    el.className = 'match-context' + (done ? ' done' : '');
    el.style.display = 'flex';
    el.innerHTML =
      '<div class="match-context-main">' +
        '<div class="match-context-info">' +
          '<span class="match-context-label">' + (done ? '&#9989; Match confirmed' : '&#9889; Matching for') + '</span>' +
          '<strong>' + escapeHtml(req.id) + '</strong>' +
          '<span class="match-context-patient">' + escapeHtml(req.patient) + '</span>' +
          '<span class="match-badge blood-badge">' + escapeHtml(req.blood) + '</span>' +
          urgencyBadge(req.urgency) +
          '<span class="match-context-loc">&#127973; ' + escapeHtml(req.location) + '</span>' +
        '</div>' +
        (done ? '' : '<button type="button" class="btn-link" id="clearRequestContext">Use manual filters</button>') +
      '</div>' +
      (done
        ? '<span class="match-context-note done-note">&#127881; Request fulfilled — the donation is recorded in the history page.</span>'
        : (req.urgency === 'critical'
            ? '<span class="match-context-note">Critical request — exact blood type matches are boosted in the match score.</span>'
            : ''));

    var clearBtn = $('#clearRequestContext');
    if (clearBtn) clearBtn.addEventListener('click', clearActiveRequest);
  }

  function selectPendingRequest(req, opts) {
    opts = opts || {};
    activeMatchRequest = req;

    /* Auto-populate the manual filters so they mirror the request. */
    var bloodSel = $('#filterBlood');
    var locInput = $('#filterLocation');
    if (bloodSel) bloodSel.value = req.blood || '';
    if (locInput) locInput.value = extractCity(req.location || '');

    renderPendingRequests();
    runRequestMatch(req);

    if (!opts.silent) {
      showToast('Matching donors for ' + req.id + ' — ' + req.patient +
        ' (' + req.blood + ', ' + urgencyLabel(req.urgency) + ' urgency)', 'info');
      setTimeout(function () {
        var results = $('#matchResults');
        if (results) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }

  function clearActiveRequest() {
    activeMatchRequest = null;
    renderPendingRequests();
    renderMatchContext();
  }

  /* Scores the donor pool for one request. findBestDonor already enforces
     the shared eligibility rules (blood compatibility, availability, and
     the 56-day donation interval), so both pipelines stay consistent.
     Urgency is layered on top: critical requests boost exact blood type
     matches so they outrank compatible types from other cities. */
  function runRequestMatch(req) {
    var city = extractCity(req.location || '');
    var matches = findBestDonor(req.blood, city);

    matches = matches.map(function (m) {
      var score = m.score;
      if (req.urgency === 'critical' && m.donor.blood === req.blood) {
        score = Math.min(100, score + 20);
      }
      return { donor: m.donor, score: score };
    }).sort(function (a, b) { return b.score - a.score; });

    currentMatches = matches;
    renderMatchContext();
    renderMatchResults(matches, req.blood, {
      request: req,
      requestDone: req.status === 'completed'
    });
  }

  /* Plain manual-filter matching (no request context). */
  function runManualMatch(blood, location) {
    var matches = findBestDonor(blood, location || '');

    if (location) {
      matches = matches.map(function (m) {
        var bonus = m.donor.location.toLowerCase() === location.toLowerCase() ? 0 : -10;
        return { donor: m.donor, score: Math.max(0, Math.min(100, m.score + bonus)) };
      }).sort(function (a, b) { return b.score - a.score; });
    }

    currentMatches = matches;
    renderMatchContext();
    renderMatchResults(matches, blood, {});
  }

  function renderMatchResults(matches, filterBlood, opts) {
    opts = opts || {};
    var req = opts.request || null;
    var c = $('#matchResults');
    if (!c) return;

    if (!matches || matches.length === 0) {
      c.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">&#128528;</div>' +
          '<h3>No Compatible Donors Found</h3>' +
          '<p>' + (req
            ? 'No eligible donor for ' + escapeHtml(req.id) + ' (' + escapeHtml(req.blood) +
              ') right now. New donors become available as they register or clear the 56-day interval.'
            : 'No donors matched the selected blood group. Try a different filter or register more donors.') + '</p>' +
        '</div>';
      return;
    }

    var html =
      '<div class="results-header">' +
        '<h3>' + (filterBlood ? escapeHtml(filterBlood) + ' Compatible' : 'All') + ' Donor Matches' +
          (req ? ' for ' + escapeHtml(req.id) : '') + '</h3>' +
        (req ? urgencyBadge(req.urgency) : '') +
        '<span class="results-count">' + matches.length + ' donor' + (matches.length !== 1 ? 's' : '') + ' found</span>' +
      '</div>';

    matches.forEach(function (m, i) {
      var d = m.donor;
      var s = m.score;
      var assigned = req && opts.requestDone && req.matchedDonor === d.id;
      var exactType = req ? (d.blood === req.blood) : null;
      var at, ac;

      if (assigned)         { ac = '#16a34a'; at = 'Donating for this request'; }
      else if (d.available) { ac = '#16a34a'; at = 'Available Now'; }
      else                  { ac = '#94a3b8'; at = 'Unavailable'; }

      html +=
        '<div class="match-card' + (assigned ? ' confirmed' : '') + '" style="animation-delay:' + (i * 0.08) + 's">' +
          '<div class="match-avatar">' + escapeHtml(initials(d.name)) + '</div>' +
          '<div class="match-info">' +
            '<div class="match-name">' + escapeHtml(d.name) + '</div>' +
            '<div class="match-details">' +
              '<span class="match-badge blood-badge">' + escapeHtml(d.blood) + '</span>' +
              (req
                ? '<span class="match-badge type-badge ' + (exactType ? 'exact' : 'compat') + '">' +
                    (exactType ? 'Exact type match' : 'Compatible type') + '</span>'
                : '') +
              '<span class="match-badge location-badge">' + escapeHtml(d.location) + '</span>' +
              '<span style="color:' + ac + '">&#9679; ' + at + '</span>' +
              '<span>&#9878; ' + d.weight + ' kg</span>' +
            '</div>' +
          '</div>' +
          '<div class="match-score">' +
            '<div class="score-circle ' + scoreClass(s) + '">' + s + '%</div>' +
            '<span class="score-label">' + scoreLabel(s) + '</span>' +
          '</div>' +
          (req && !opts.requestDone
            ? '<div class="match-actions">' +
                '<button type="button" class="btn-confirm" data-donor="' + escapeHtml(d.id) + '">&#10004; Confirm Match</button>' +
              '</div>'
            : '') +
          (assigned
            ? '<div class="match-actions"><span class="match-confirmed-badge">&#10004; Donor assigned</span></div>'
            : '') +
        '</div>';
    });

    c.innerHTML = html;
  }

  /* Confirming a match on the Smart Match page completes the pending
     request and takes the donor out of the available pool — they just
     donated, so a fresh 56-day interval starts as well. */
  function confirmSmartMatch(donorId) {
    var req = activeMatchRequest;
    if (!req || req.status === 'completed') return;

    var donor = state.donors.find(function (d) { return d.id === donorId; });
    if (!donor) return;

    /* Same eligibility rules as findBestDonor, re-checked at confirm time. */
    if (donor.available !== true || donatedWithin56Days(donor)) {
      showToast(donor.name + ' is no longer eligible to donate. Re-running the search for ' + req.id + '...', 'error');
      runRequestMatch(req);
      return;
    }

    req.status = 'completed';
    req.matchedDonor = donor.id;
    donor.available = false;
    donor.lastDonation = new Date().toISOString().slice(0, 10);
    state.matches++;

    saveState();
    refreshAllStats();
    renderDonationHistory();
    renderPendingRequests();
    renderMatchContext();
    renderMatchResults(currentMatches, req.blood, { request: req, requestDone: true });

    showToast('Match confirmed! ' + donor.name + ' (' + donor.blood + ') is assigned to ' +
      req.id + ' — ' + req.patient + ' will receive blood.', 'success');
  }

  function handlePendingCardClick(card) {
    var req = state.requests.find(function (r) { return r.id === card.getAttribute('data-req'); });
    if (!req) return;

    if (!isPendingRequest(req)) {
      showToast('Request ' + req.id + ' is already ' + req.status + '.', 'info');
      renderPendingRequests();
      return;
    }

    selectPendingRequest(req);
  }

  function initMatching() {
    var findBtn   = $('#findMatches');
    var resultsEl = $('#matchResults');
    var listEl    = $('#pendingRequestsList');
    if (!findBtn || !resultsEl) return;

    findBtn.addEventListener('click', function () {
      /* Still bound to a pending request → re-run the request matching. */
      if (activeMatchRequest) {
        runRequestMatch(activeMatchRequest);
        return;
      }

      var blood    = $('#filterBlood').value;
      var location = $('#filterLocation').value.trim();

      if (!blood) {
        var pending = getPendingRequests();
        if (pending.length > 0) {
          selectPendingRequest(pending[0]);
          return;
        }
        if (state.requests.length > 0) {
          blood = state.requests[state.requests.length - 1].blood;
          showToast('Showing matches for latest request (' + blood + ' blood)', 'info');
        } else {
          showToast('Select a blood group filter or submit a blood request first.', 'error');
          return;
        }
      }

      runManualMatch(blood, location);
    });

    /* Manual filter edits leave request-matching mode. */
    var bloodEl = $('#filterBlood');
    var locEl   = $('#filterLocation');
    if (bloodEl) {
      bloodEl.addEventListener('change', function () {
        if (activeMatchRequest) clearActiveRequest();
      });
    }
    if (locEl) {
      locEl.addEventListener('input', function () {
        if (activeMatchRequest) clearActiveRequest();
      });
    }

    /* Pending request cards (delegated — the list re-renders). */
    if (listEl) {
      listEl.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.pending-card') : null;
        if (card) handlePendingCardClick(card);
      });
      listEl.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var card = e.target.closest ? e.target.closest('.pending-card') : null;
        if (!card) return;
        e.preventDefault();
        handlePendingCardClick(card);
      });
    }

    /* Confirm-match buttons on donor cards (delegated). */
    resultsEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.btn-confirm') : null;
      if (btn) confirmSmartMatch(btn.getAttribute('data-donor'));
    });

    /* Keep "time since submission" fresh while the page is open. */
    setInterval(renderPendingRequests, 60000);

    /* Boot: show pending requests and pre-select the most urgent one. */
    renderPendingRequests();
    var pending = getPendingRequests();
    if (pending.length > 0) {
      selectPendingRequest(pending[0], { silent: true });
      showToast('Pre-selected the most urgent pending request (' + pending[0].id + ', ' +
        urgencyLabel(pending[0].urgency) + ') — matches are shown below.', 'info');
    }
  }

  /* ──────────────────────────────────────────────
     10. COMPATIBILITY CHART — 8×8 Matrix
     ────────────────────────────────────────────── */

  function renderCompatibilityChart() {
    var tbody = $('#compatTableBody');
    if (!tbody) return;
    var html = '';
    BLOOD_GROUPS.forEach(function (donor) {
      html += '<tr><th scope="row">' + donor + '</th>';
      BLOOD_GROUPS.forEach(function (recipient) {
        var ok = DONOR_GIVES_TO[donor].indexOf(recipient) !== -1;
        html += ok
          ? '<td class="compat-yes">&#9989;</td>'
          : '<td class="compat-no">&#10060;</td>';
      });
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  /* ──────────────────────────────────────────────
     11. DONATION HISTORY & CERTIFICATES
     ────────────────────────────────────────────── */

  function renderDonationHistory() {
    var c = $('#donationHistory');
    if (!c) return;
    var done = state.requests.filter(function (r) { return r.status === 'completed' && r.matchedDonor; });

    if (done.length === 0) {
      c.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">&#128203;</div>' +
          '<h3>No Donations Yet</h3>' +
          '<p>Completed donations across the network will appear here after the first successful match.</p>' +
        '</div>';
      return;
    }

    var html = '';
    done.forEach(function (req, i) {
      var donor = state.donors.find(function (d) { return d.id === req.matchedDonor; });
      var dn = donor ? donor.name : 'Unknown Donor';
      var db = donor ? donor.blood : '?';

      html +=
        '<div class="history-card" style="animation-delay:' + (i * 0.1) + 's">' +
          '<div class="history-icon">&#129657;</div>' +
          '<div class="history-info">' +
            '<h4>' + escapeHtml(dn) + ' donated ' + escapeHtml(db) + ' blood</h4>' +
            '<div class="history-meta">' +
              '<span>&#128197; ' + formatDate(req.createdAt) + '</span>' +
              '<span>&#127973; ' + escapeHtml(req.location) + '</span>' +
              '<span>&#128137; ' + req.units + ' unit' + (req.units > 1 ? 's' : '') + '</span>' +
              '<span>&#128100; For: ' + escapeHtml(req.patient) + '</span>' +
            '</div>' +
          '</div>' +
          '<span class="cert-locked">&#128274; Certificate private to ' + escapeHtml(dn) + '</span>' +
        '</div>';
    });

    c.innerHTML = html;
  }

  /* Formal date helpers for the certificate (e.g. "3rd September, 2026") */
  function ordinalSuffix(n) {
    var v = n % 100;
    if (v >= 11 && v <= 13) return 'th';
    if (n % 10 === 1) return 'st';
    if (n % 10 === 2) return 'nd';
    if (n % 10 === 3) return 'rd';
    return 'th';
  }

  function formatFormalDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return formatDate(iso);
    var month = d.toLocaleDateString('en-GB', { month: 'long' });
    return d.getDate() + ordinalSuffix(d.getDate()) + ' ' + month + ', ' + d.getFullYear();
  }

  function padNumber(num, len) {
    var s = String(num);
    while (s.length < len) s = '0' + s;
    return s;
  }

  function generateCertificate(req) {
    var donor = state.donors.find(function (d) { return d.id === req.matchedDonor; });
    var dn   = donor ? donor.name : 'Unknown Donor';
    var db   = donor ? donor.blood : '?';
    var date = formatFormalDate(req.createdAt);

    var year = new Date(req.createdAt).getFullYear();
    if (isNaN(year)) year = new Date().getFullYear();
    var reqNum = parseInt(req.id.replace('#REQ-', ''), 10);
    var certNo = 'BL-' + year + '-' + padNumber(isNaN(reqNum) ? 0 : reqNum, 5);
    var unitsText = req.units === 1 ? 'one unit' : req.units + ' units';

    // Only one certificate overlay at a time
    var stale = document.getElementById('certOverlay');
    if (stale) stale.remove();

    var overlay = document.createElement('div');
    overlay.id = 'certOverlay';
    overlay.className = 'cert-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Blood donation certificate \u2014 ' + dn);

    overlay.innerHTML =
      '<div class="cert-modal">' +
        '<div class="cert-paper">' +
          '<span class="cert-corner cert-corner-tl" aria-hidden="true"></span>' +
          '<span class="cert-corner cert-corner-tr" aria-hidden="true"></span>' +
          '<span class="cert-corner cert-corner-bl" aria-hidden="true"></span>' +
          '<span class="cert-corner cert-corner-br" aria-hidden="true"></span>' +
          '<div class="cert-watermark" aria-hidden="true">&#9829;</div>' +
          '<div class="cert-inner">' +
            '<div class="cert-org">BloodLink AI &#183; Donor Network</div>' +
            '<h2 class="cert-title">Certificate of Blood Donation</h2>' +
            '<div class="cert-divider" aria-hidden="true">' +
              '<span class="cert-divider-line"></span>' +
              '<span class="cert-divider-gem">&#10070;</span>' +
              '<span class="cert-divider-line cert-divider-line-right"></span>' +
            '</div>' +
            '<p class="cert-prelude">This is to certify that</p>' +
            '<div class="cert-name">' + escapeHtml(dn) + '</div>' +
            '<p class="cert-body">has generously donated <strong class="cert-blood">' + escapeHtml(unitsText) + ' of ' + escapeHtml(db) + ' blood</strong><br>' +
              'to the patient <strong class="cert-recipient">' + escapeHtml(req.patient) + '</strong></p>' +
            '<p class="cert-meta">at <strong>' + escapeHtml(req.location) + '</strong> on <strong>' + escapeHtml(date) + '</strong></p>' +
            '<p class="cert-tribute">In grateful recognition of this selfless gift of life.</p>' +
            '<div class="cert-sign-row">' +
              '<div class="cert-signature">' +
                '<span class="cert-sign-script">Dr. A. Rahman</span>' +
                '<span class="cert-sign-line" aria-hidden="true"></span>' +
                '<span class="cert-sign-role">Medical Officer</span>' +
              '</div>' +
              '<div class="cert-seal" aria-hidden="true">' +
                '<span class="cert-seal-heart">&#9829;</span>' +
                '<span class="cert-seal-name">BloodLink AI</span>' +
                '<span class="cert-seal-sub">Official Seal</span>' +
              '</div>' +
              '<div class="cert-signature">' +
                '<span class="cert-sign-script">Shah</span>' +
                '<span class="cert-sign-line" aria-hidden="true"></span>' +
                '<span class="cert-sign-role">BloodLink AI Director</span>' +
              '</div>' +
            '</div>' +
            '<div class="cert-number">Certificate No. ' + escapeHtml(certNo) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cert-actions">' +
          '<button type="button" class="cert-btn cert-btn-print" id="certPrintBtn">&#128424;&#160; Print Certificate</button>' +
          '<button type="button" class="cert-btn cert-btn-close" id="certCloseBtn">Close</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.classList.add('cert-open');

    // Lock background scroll while the certificate is open
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function closeCert() {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('cert-open');
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    }
    function onKey(e) {
      if (e.key === 'Escape') closeCert();
    }

    overlay.querySelector('#certPrintBtn').addEventListener('click', function () {
      window.print();
    });
    overlay.querySelector('#certCloseBtn').addEventListener('click', closeCert);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeCert();
    });
    document.addEventListener('keydown', onKey);

    // Move focus into the dialog for keyboard and screen-reader users
    overlay.querySelector('#certPrintBtn').focus();
  }

  /* ──────────────────────────────────────────────
     11a. MY RECORD — Donor verification & private certificates
     ────────────────────────────────────────────── */

  var VERIFIED_KEY = 'bloodlink_verified_donor';

  function normalizeDonorId(raw) {
    var v = raw.trim().toUpperCase();
    if (/^\d+$/.test(v)) return 'D-' + v;   /* "1002"  → "D-1002" */
    return v.replace(/^D(\d)/, 'D-$1');     /* "D1002" → "D-1002" */
  }

  function findDonorById(raw) {
    var id = normalizeDonorId(raw);
    return {
      id: id,
      donor: state.donors.find(function (d) { return d.id.toUpperCase() === id; }) || null
    };
  }

  function getVerifiedDonorId() {
    try { return sessionStorage.getItem(VERIFIED_KEY); } catch (e) { return null; }
  }

  function setVerifiedDonorId(id) {
    try {
      if (id) sessionStorage.setItem(VERIFIED_KEY, id);
      else sessionStorage.removeItem(VERIFIED_KEY);
    } catch (e) { /* storage unavailable */ }
  }

  function renderMyRecord(donor) {
    var summaryEl = $('#myRecordSummary');
    var listEl    = $('#myDonations');
    if (!summaryEl || !listEl) return;

    var mine = state.requests.filter(function (r) { return r.matchedDonor === donor.id; });
    var completed = mine.filter(function (r) { return r.status === 'completed'; });
    var totalUnits = completed.reduce(function (sum, r) { return sum + r.units; }, 0);

    summaryEl.innerHTML =
      '<div class="record-profile">' +
        '<div class="match-avatar">' + escapeHtml(initials(donor.name)) + '</div>' +
        '<div class="record-profile-info">' +
          '<h3>' + escapeHtml(donor.name) + '</h3>' +
          '<div class="match-details">' +
            '<span class="match-badge blood-badge">' + escapeHtml(donor.blood) + '</span>' +
            '<span class="match-badge location-badge">' + escapeHtml(donor.location) + '</span>' +
            '<span class="match-badge id-badge">' + escapeHtml(donor.id) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="record-stats">' +
          '<div class="record-stat"><strong>' + completed.length + '</strong><span>Donations</span></div>' +
          '<div class="record-stat"><strong>' + totalUnits + '</strong><span>Units Donated</span></div>' +
          '<div class="record-stat"><strong>' + (totalUnits * 3) + '</strong><span>Lives Touched</span></div>' +
        '</div>' +
      '</div>';

    if (mine.length === 0) {
      listEl.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">&#128203;</div>' +
          '<h3>No Donations Yet</h3>' +
          '<p>Your donation record will appear here after your first successful match.</p>' +
        '</div>';
      return;
    }

    var html = '';
    mine.forEach(function (req, i) {
      var isDone = req.status === 'completed';
      html +=
        '<div class="history-card" style="animation-delay:' + (i * 0.08) + 's">' +
          '<div class="history-icon">&#129657;</div>' +
          '<div class="history-info">' +
            '<h4>' + escapeHtml(donor.blood) + ' blood for ' + escapeHtml(req.patient) + '</h4>' +
            '<div class="history-meta">' +
              '<span>&#128197; ' + formatDate(req.createdAt) + '</span>' +
              '<span>&#127973; ' + escapeHtml(req.location) + '</span>' +
              '<span>&#128137; ' + req.units + ' unit' + (req.units > 1 ? 's' : '') + '</span>' +
            '</div>' +
          '</div>' +
          (isDone
            ? '<button class="btn-certificate" data-req="' + escapeHtml(req.id) + '">&#128196; Download Certificate</button>'
            : '<span class="status-badge in-progress">&#9203; In Progress</span>') +
        '</div>';
    });
    listEl.innerHTML = html;

    listEl.querySelectorAll('.btn-certificate').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var req = state.requests.find(function (r) { return r.id === btn.dataset.req; });
        if (req) generateCertificate(req);
      });
    });
  }

  function initDonorVerification() {
    var form = $('#verifyForm');
    if (!form) return;

    var verifyCard = $('#verifyCard');
    var myRecord   = $('#myRecord');
    var idInput    = $('#verifyDonorId');
    var cnicInput  = $('#verifyCnic');

    function showMyRecord(donor) {
      renderMyRecord(donor);
      verifyCard.style.display = 'none';
      myRecord.style.display = 'block';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var entry = findDonorById(idInput.value);
      var cnic  = cnicInput.value.trim();

      if (!idInput.value.trim()) {
        setField(idInput, $('#verifyDonorIdError'), 'Enter your Donor ID (e.g. D-1002).');
        return;
      }
      if (!/^\d{4}$/.test(cnic)) {
        setField(cnicInput, $('#verifyCnicError'), 'Enter the last 4 digits of your CNIC.');
        return;
      }
      if (!entry.donor) {
        setField(idInput, $('#verifyDonorIdError'), 'Donor ID ' + entry.id + ' not found. Register as a donor first.');
        setField(cnicInput, $('#verifyCnicError'), '');
        return;
      }
      if (entry.donor.cnic !== cnic) {
        setField(idInput, $('#verifyDonorIdError'), '');
        setField(cnicInput, $('#verifyCnicError'), 'CNIC does not match Donor ID ' + entry.id + '.');
        return;
      }

      setField(idInput, $('#verifyDonorIdError'), '');
      setField(cnicInput, $('#verifyCnicError'), '');
      setVerifiedDonorId(entry.donor.id);
      showMyRecord(entry.donor);
      showToast('Welcome back, ' + entry.donor.name + '! Showing your donation record.', 'success');
      setTimeout(function () { myRecord.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200);
    });

    var switchBtn = $('#switchDonor');
    if (switchBtn) {
      switchBtn.addEventListener('click', function () {
        setVerifiedDonorId(null);
        myRecord.style.display = 'none';
        verifyCard.style.display = 'block';
        form.reset();
        $$('#verifyForm input').forEach(function (el) {
          el.classList.remove('valid', 'error');
          el.setAttribute('aria-invalid', 'false');
        });
        $$('#verifyForm .error-msg').forEach(function (el) { el.textContent = ''; });
      });
    }

    // Restore a verified session when returning to this page
    var savedId = getVerifiedDonorId();
    if (savedId) {
      var donor = state.donors.find(function (d) { return d.id === savedId; });
      if (donor) showMyRecord(donor);
      else setVerifiedDonorId(null);
    }
  }

  /* ──────────────────────────────────────────────
     11b. DARK MODE TOGGLE
     ────────────────────────────────────────────── */

  var THEME_KEY = 'bloodlink_theme';

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* storage unavailable */ }
    if (saved === 'dark') {
      document.body.classList.add('dark');
    }

    var toggle = $('#themeToggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      document.body.classList.toggle('dark');
      var isDark = document.body.classList.contains('dark');
      try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
    });
  }

  // Apply theme before DOMContentLoaded to prevent flash
  (function () {
    try {
      if (localStorage.getItem(THEME_KEY) === 'dark') {
        document.body.classList.add('dark');
      }
    } catch (e) { /* ignore */ }
  })();

  /* ──────────────────────────────────────────────
     12a. RESET DEMO DATA
     ────────────────────────────────────────────── */

  /* Wipes everything BloodLink stored in this browser (the theme
     preference is preserved) and reloads the app with fresh seed data. */
  function resetDemoData() {
    try {
      var keepTheme = localStorage.getItem(THEME_KEY);
      localStorage.clear();
      if (keepTheme !== null) localStorage.setItem(THEME_KEY, keepTheme);
    } catch (e) { /* storage unavailable */ }
    try { sessionStorage.removeItem(VERIFIED_KEY); } catch (e) { /* ignore */ }

    state = defaultState();
    saveState();
    window.location.reload();
  }

  /* Subtle button injected into every page footer so the demo can be
     restored to its seed state at any time. */
  function injectResetDemoButton() {
    var footerBottom = document.querySelector('.footer-bottom');
    if (!footerBottom || document.getElementById('resetDemoBtn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'resetDemoBtn';
    btn.className = 'reset-demo-btn';
    btn.innerHTML = '&#8635; Reset Demo Data';
    btn.title = 'Restore the original seed data (clears registered donors & requests)';
    btn.addEventListener('click', function () {
      var ok = window.confirm(
        'Reset demo data?\n\n' +
        'This clears all donors and blood requests saved in this browser and ' +
        'restores the original seed data.'
      );
      if (ok) resetDemoData();
    });
    footerBottom.appendChild(btn);
  }

  /* ──────────────────────────────────────────────
     12. BOOT
     ────────────────────────────────────────────── */

  function init() {
    initTheme();
    initNavbar();
    initDonorForm();
    initRequestForm();
    initNotificationOverlay();
    initMatching();
    renderCompatibilityChart();
    renderDonationHistory();
    initDonorVerification();
    setupCounters();
    refreshAllStats();
    injectResetDemoButton();

    if (!localStorage.getItem('bloodlink_welcomed')) {
      setTimeout(function () {
        showToast('Welcome to BloodLink AI! Explore the demo with pre-loaded data.', 'info');
        localStorage.setItem('bloodlink_welcomed', '1');
      }, 900);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
