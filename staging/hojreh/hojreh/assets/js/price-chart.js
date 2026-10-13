  'use strict';
  var RANGE_LABELS = {
    daily: 'روزانه',
    weekly: 'هفتگی',
    monthly: 'ماهانه',
    yearly: 'سالانه'
  };
  var DEFAULT_RANGES = ['daily', 'weekly', 'monthly'];
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function formatToman(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString('en-US');
  }
  function toPersianDigits(str) {
    var map = { '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹' };
    return String(str).replace(/[0-9]/g, function (d) { return map[d]; });
  }
  var PERSIAN_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  function gregorianToJalali(gy, gm, gd) {
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days = (365 * gy) + (parseInt((gy2 + 3) / 4)) - (parseInt((gy2 + 99) / 100)) +
      (parseInt((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * (parseInt(days / 12053));
    days %= 12053;
    jy += 4 * (parseInt(days / 1461));
    days %= 1461;
    if (days > 365) {
      jy += parseInt((days - 1) / 365);
      days = (days - 1) % 365;
    }
    var jm, jd;
    if (days < 186) {
      jm = 1 + parseInt(days / 31);
      jd = 1 + (days % 31);
    } else {
      jm = 7 + parseInt((days - 186) / 30);
      jd = 1 + ((days - 186) % 30);
    }
    return { jy: jy, jm: jm, jd: jd };
  }
  function formatJalaliDate(timestamp) {
    var d = new Date(timestamp);
    var j = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return toPersianDigits(j.jd) + ' ' + PERSIAN_MONTHS[j.jm - 1] + ' ' + toPersianDigits(j.jy);
  }
  function formatJalaliShort(timestamp) {
    var d = new Date(timestamp);
    var j = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return toPersianDigits(j.jd) + ' ' + PERSIAN_MONTHS[j.jm - 1];
  }
  function el(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    return node;
  }
  function htmlEl(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }
  function buildSmoothPath(pts) {
    if (pts.length < 2) {
      return pts.length === 1 ? 'M ' + pts[0].x + ' ' + pts[0].y : '';
    }
    var d = 'M ' + pts[0].x + ' ' + pts[0].y;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + p2.x + ' ' + p2.y;
    }
    return d;
  }
  function seededRandom(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
  function hashStr(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h) || 1;
  }
  var RANGE_POINT_COUNT = { daily: 24, weekly: 7 * 6, monthly: 30, yearly: 12 };
  var RANGE_STEP_MS = {
    daily: 60 * 60 * 1000,
    weekly: 4 * 60 * 60 * 1000,
    monthly: 24 * 60 * 60 * 1000,
    yearly: 30 * 24 * 60 * 60 * 1000
  };
  function movingAverageSmooth(values, windowSize) {
    var n = values.length;
    if (n <= 2 || windowSize <= 1) return values.slice();
    var half = Math.floor(windowSize / 2);
    var out = new Array(n);
    for (var i = 0; i < n; i++) {
      var lo = Math.max(0, i - half);
      var hi = Math.min(n - 1, i + half);
      var sum = 0, c = 0;
      for (var j = lo; j <= hi; j++) { sum += values[j]; c++; }
      out[i] = sum / c;
    }
    return out;
  }
  function generateMockData(itemId, range) {
    var seed = hashStr(String(itemId || 'default') + ':' + range);
    var rand = seededRandom(seed);
    var count = RANGE_POINT_COUNT[range] || 30;
    var step = RANGE_STEP_MS[range] || RANGE_STEP_MS.monthly;
    var base = 400000 + Math.floor(rand() * 200000);
    var now = Date.now();
    var totalDriftPct = -0.16 + rand() * 0.22;
    var raw = [];
    var value = base;
    var velocity = 0;
    var volatility = base * 0.006;
    for (var i = 0; i < count; i++) {
      var driftPerStep = (base * totalDriftPct) / count;
      velocity += (rand() - 0.5) * volatility;
      velocity *= 0.86;
      value += driftPerStep + velocity;
      raw.push(value);
    }
    var windowSize = count >= 20 ? 5 : 3;
    var smoothed = movingAverageSmooth(raw, windowSize);
    var points = smoothed.map(function (v, i) {
      var t = now - (count - 1 - i) * step;
      var rounded = Math.max(Math.round(v / 1000) * 1000, Math.round(base * 0.5 / 1000) * 1000);
      return { t: t, v: rounded };
    });
    return { points: points, unit: 'تومان' };
  }
  function PriceChart(container, options) {
    this.container = container;
    this.opts = Object.assign({
      itemId: '',
      itemLabel: '',
      ranges: DEFAULT_RANGES,
      defaultRange: 'weekly',
      fetchData: null,
      onRangeLabelChange: null,
      onChangeUpdate: null,
      onSwitchStart: null,
      onSwitchEnd: null
    }, options || {});
    this.currentRange = this.opts.ranges.indexOf(this.opts.defaultRange) !== -1
      ? this.opts.defaultRange
      : this.opts.ranges[0];
    this.data = null;
    this._boundMove = this._onPointerMove.bind(this);
    this._boundLeave = this._onPointerLeave.bind(this);
    this._cache = {};
    this._buildSkeleton();
  }
  PriceChart.prototype._buildSkeleton = function () {
    var root = htmlEl('div', 'hpc');
    var plotWrap = htmlEl('div', 'hpc-plot-wrap is-loading');
    var svg = el('svg', { class: 'hpc-svg', viewBox: '0 0 600 220' });
    var defs = el('defs');
    var gradId = 'hpcAreaGradient_' + Math.random().toString(36).slice(2);
    var grad = el('linearGradient', { id: gradId, x1: '0', y1: '0', x2: '0', y2: '1' });
    var stop1 = el('stop', { offset: '0%', 'stop-color': 'var(--chart-accent-soft)', 'stop-opacity': '0.18' });
    var stop2 = el('stop', { offset: '100%', 'stop-color': 'var(--chart-accent-soft)', 'stop-opacity': '0' });
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    var glowGradId = 'hpcGlowGrad_' + Math.random().toString(36).slice(2);
    var glowGrad = el('linearGradient', { id: glowGradId, x1: '0', y1: '0', x2: '0', y2: '1' });
    var glowStop1 = el('stop', { offset: '0%', 'stop-color': 'var(--black)', 'stop-opacity': '0.07' });
    var glowStop2 = el('stop', { offset: '40%', 'stop-color': 'var(--black)', 'stop-opacity': '0.015' });
    var glowStop3 = el('stop', { offset: '100%', 'stop-color': 'var(--black)', 'stop-opacity': '0' });
    glowGrad.appendChild(glowStop1);
    glowGrad.appendChild(glowStop2);
    glowGrad.appendChild(glowStop3);
    defs.appendChild(glowGrad);
    var glowFilterId = 'hpcGlowFilter_' + Math.random().toString(36).slice(2);
    var glowFilter = el('filter', { id: glowFilterId, x: '0%', y: '0%', width: '100%', height: '100%', filterUnits: 'objectBoundingBox' });
    var glowBlur = el('feGaussianBlur', { stdDeviation: '6 2' });
    glowFilter.appendChild(glowBlur);
    defs.appendChild(glowFilter);
    svg.appendChild(defs);
    var gridGroup = el('g', { class: 'hpc-grid' });
    svg.appendChild(gridGroup);
    var glowAreaPath = el('path', { class: 'hpc-area-glow' });
    glowAreaPath.setAttribute('fill', 'url(#' + glowGradId + ')');
    glowAreaPath.style.filter = 'url(#' + glowFilterId + ')';
    svg.appendChild(glowAreaPath);
    var areaPath = el('path', { class: 'hpc-area-fill' });
    areaPath.setAttribute('fill', 'url(#' + gradId + ')');
    svg.appendChild(areaPath);
    var linePath = el('path', { class: 'hpc-line-path' });
    svg.appendChild(linePath);
    var cursorLine = el('line', { class: 'hpc-cursor-line', x1: 0, y1: 0, x2: 0, y2: 220 });
    svg.appendChild(cursorLine);
    var cursorHalo = el('circle', { class: 'hpc-cursor-dot-halo', r: 10 });
    svg.appendChild(cursorHalo);
    var cursorDot = el('circle', { class: 'hpc-cursor-dot', r: 4.5 });
    svg.appendChild(cursorDot);
    var hitArea = el('rect', { class: 'hpc-hit-area', x: 0, y: 0, width: 600, height: 220 });
    svg.appendChild(hitArea);
    plotWrap.appendChild(svg);
    var tooltip = htmlEl('div', 'hpc-tooltip');
    var tooltipPrice = htmlEl('div', 'hpc-tooltip-price', '');
    var tooltipDate = htmlEl('div', 'hpc-tooltip-date', '');
    tooltip.appendChild(tooltipPrice);
    tooltip.appendChild(tooltipDate);
    plotWrap.appendChild(tooltip);
    var chartSpinner = htmlEl('div', 'hpc-spinner-wrap');
    chartSpinner.appendChild(htmlEl('div', 'hpc-spinner'));
    plotWrap.appendChild(chartSpinner);
    var emptyState = htmlEl('div', 'hpc-empty');
    emptyState.appendChild(htmlEl('span', 'hpc-empty-text', 'داده‌ای برای نمایش وجود ندارد'));
    plotWrap.appendChild(emptyState);
    var stats = htmlEl('div', 'hpc-stats');
    var statMin = htmlEl('span', 'hpc-stat');
    statMin.appendChild(htmlEl('span', 'hpc-stat-dot is-min'));
    statMin.appendChild(document.createTextNode('کمترین: '));
    var statMinVal = htmlEl('span', 'hpc-stat-value', '—');
    statMin.appendChild(statMinVal);
    var statMax = htmlEl('span', 'hpc-stat');
    statMax.appendChild(htmlEl('span', 'hpc-stat-dot is-max'));
    statMax.appendChild(document.createTextNode('بیشترین: '));
    var statMaxVal = htmlEl('span', 'hpc-stat-value', '—');
    statMax.appendChild(statMaxVal);
    stats.appendChild(statMin);
    stats.appendChild(statMax);
    var ranges = htmlEl('div', 'hpc-ranges');
    var rangePill = htmlEl('div', 'hpc-range-pill');
    ranges.appendChild(rangePill);
    var rangeBtns = {};
    this.opts.ranges.forEach(function (rk) {
      var btn = htmlEl('button', 'hpc-range-btn', RANGE_LABELS[rk] || rk);
      btn.type = 'button';
      btn.dataset.range = rk;
      rangeBtns[rk] = btn;
      ranges.appendChild(btn);
    });
    root.appendChild(plotWrap);
    root.appendChild(stats);
    root.appendChild(ranges);
    this.container.innerHTML = '';
    this.container.appendChild(root);
    this.el = {
      root: root,
      plotWrap: plotWrap,
      svg: svg,
      gridGroup: gridGroup,
      areaPath: areaPath,
      linePath: linePath,
      glowAreaPath: glowAreaPath,
      cursorLine: cursorLine,
      cursorHalo: cursorHalo,
      cursorDot: cursorDot,
      hitArea: hitArea,
      tooltip: tooltip,
      tooltipPrice: tooltipPrice,
      tooltipDate: tooltipDate,
      chartSpinner: chartSpinner,
      emptyState: emptyState,
      statMinVal: statMinVal,
      statMaxVal: statMaxVal,
      ranges: ranges,
      rangePill: rangePill,
      rangeBtns: rangeBtns
    };
    this._setActiveRangeBtn(false);
    this._bindEvents();
    this._setupResizeObserver();
  };
  PriceChart.prototype._bindEvents = function () {
    var self = this;
    this.el.hitArea.addEventListener('mousemove', this._boundMove);
    this.el.hitArea.addEventListener('mouseleave', this._boundLeave);
    this.el.hitArea.addEventListener('touchmove', this._boundMove, { passive: true });
    this.el.hitArea.addEventListener('touchend', this._boundLeave);
    Object.keys(this.el.rangeBtns).forEach(function (rk) {
      self.el.rangeBtns[rk].addEventListener('click', function () {
        if (rk === self.currentRange) return;
        self.setRange(rk);
      });
    });
  };
  PriceChart.prototype._movePillToBtn = function (btn, animate) {
    if (!btn) return;
    var pill = this.el.rangePill;
    var wrap = this.el.ranges;
    var btnRect = btn.getBoundingClientRect();
    var wrapRect = wrap.getBoundingClientRect();
    if (!wrapRect.width) return;
    var left = btnRect.left - wrapRect.left;
    var width = btnRect.width;
    var height = btnRect.height;
    var top = btnRect.top - wrapRect.top;
    if (animate === false) {
      pill.classList.add('is-instant');
    } else {
      pill.classList.remove('is-instant');
    }
    pill.style.width = width + 'px';
    pill.style.height = height + 'px';
    pill.style.transform = 'translate(' + left + 'px,' + top + 'px)';
    if (animate === false) {
      void pill.offsetWidth;
      pill.classList.remove('is-instant');
    }
  };
  PriceChart.prototype._setActiveRangeBtn = function (animate) {
    var self = this;
    var activeBtn = null;
    Object.keys(this.el.rangeBtns).forEach(function (rk) {
      var isActive = rk === self.currentRange;
      self.el.rangeBtns[rk].classList.toggle('is-active', isActive);
      if (isActive) activeBtn = self.el.rangeBtns[rk];
    });
    if (typeof this.opts.onRangeLabelChange === 'function') {
      this.opts.onRangeLabelChange(RANGE_LABELS[this.currentRange] || '', this.currentRange);
    }
    var self2 = this;
    requestAnimationFrame(function () {
      self2._movePillToBtn(activeBtn, animate);
    });
  };
  PriceChart.prototype._fetch = function (range) {
    var self = this;
    var cacheKey = range;
    if (this._cache[cacheKey]) {
      return Promise.resolve(this._cache[cacheKey]);
    }
    var promise;
    if (typeof this.opts.fetchData === 'function') {
      promise = Promise.resolve(this.opts.fetchData(this.opts.itemId, range));
    } else {
      promise = new Promise(function (resolve) {
        setTimeout(function () {
          resolve(generateMockData(self.opts.itemId, range));
        }, 320 + Math.random() * 260);
      });
    }
    return promise.then(function (data) {
      self._cache[cacheKey] = data;
      return data;
    });
  };
  PriceChart.prototype.setRange = function (range) {
    if (this.opts.ranges.indexOf(range) === -1) return;
    this.currentRange = range;
    this._setActiveRangeBtn(true);
    this.load();
  };
  PriceChart.prototype.load = function () {
    var self = this;
    var isFirstLoad = !this.data;
    if (isFirstLoad) {
      this.el.plotWrap.classList.add('is-loading');
      this.el.plotWrap.classList.remove('is-empty');
      return this._fetch(this.currentRange).then(function (data) {
        self.data = data;
        self.el.plotWrap.classList.remove('is-loading');
        if (!data || !data.points || !data.points.length) {
          self.el.plotWrap.classList.add('is-empty');
          return;
        }
        self._render(data, true);
      }).catch(function () {
        self.el.plotWrap.classList.remove('is-loading');
        self.el.plotWrap.classList.add('is-empty');
      });
    }
    this.el.plotWrap.classList.add('is-switching');
    this.el.statMinVal.classList.add('hpc-skeleton');
    this.el.statMaxVal.classList.add('hpc-skeleton');
    if (typeof this.opts.onSwitchStart === 'function') this.opts.onSwitchStart();
    return new Promise(function (resolve) {
      setTimeout(resolve, 220);
    }).then(function () {
      return self._fetch(self.currentRange);
    }).then(function (data) {
      self.data = data;
      self.el.plotWrap.classList.remove('is-empty');
      if (!data || !data.points || !data.points.length) {
        self.el.plotWrap.classList.remove('is-switching');
        self.el.plotWrap.classList.add('is-empty');
        self.el.statMinVal.classList.remove('hpc-skeleton');
        self.el.statMaxVal.classList.remove('hpc-skeleton');
        if (typeof self.opts.onSwitchEnd === 'function') self.opts.onSwitchEnd();
        return;
      }
      self._render(data, true);
      self.el.plotWrap.classList.remove('is-switching');
      self.el.statMinVal.classList.remove('hpc-skeleton');
      self.el.statMaxVal.classList.remove('hpc-skeleton');
      if (typeof self.opts.onSwitchEnd === 'function') self.opts.onSwitchEnd();
    }).catch(function () {
      self.el.plotWrap.classList.remove('is-switching');
      self.el.plotWrap.classList.add('is-empty');
      self.el.statMinVal.classList.remove('hpc-skeleton');
      self.el.statMaxVal.classList.remove('hpc-skeleton');
      if (typeof self.opts.onSwitchEnd === 'function') self.opts.onSwitchEnd();
    });
  };
  PriceChart.prototype._measure = function () {
    var rect = this.el.plotWrap.getBoundingClientRect();
    var W = Math.max(1, Math.round(rect.width));
    var H = Math.max(1, Math.round(rect.height));
    this.el.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    this.el.hitArea.setAttribute('width', W);
    this.el.hitArea.setAttribute('height', H);
    this.el.cursorLine.setAttribute('y2', H);
    return { W: W, H: H };
  };
  PriceChart.prototype._setupResizeObserver = function () {
    var self = this;
    if (typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver(function () {
      if (self.data) self._render(self.data, false);
      var activeBtn = self.el.rangeBtns[self.currentRange];
      if (activeBtn) self._movePillToBtn(activeBtn, false);
    });
    this._resizeObserver.observe(this.el.plotWrap);
    this._resizeObserver.observe(this.el.ranges);
  };
  PriceChart.prototype._render = function (data, animateEntrance) {
    var dims = this._measure();
    var W = dims.W, H = dims.H;
    var PAD_X = 4;
    var PAD_TOP = Math.max(20, Math.round(H * 0.12));
    var PAD_BOTTOM = Math.max(6, Math.round(H * 0.03));
    var points = data.points;
    var values = points.map(function (p) { return p.v; });
    var min = data.min != null ? data.min : Math.min.apply(null, values);
    var max = data.max != null ? data.max : Math.max.apply(null, values);
    if (min === max) { min -= 1; max += 1; }
    var range = max - min;
    var n = points.length;
    var stepX = n > 1 ? (W - PAD_X * 2) / (n - 1) : 0;
    var coords;
    if (n === 1) {
      var midY = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (1 - (points[0].v - min) / range);
      coords = [{ x: W / 2, y: midY, t: points[0].t, v: points[0].v }];
    } else {
      coords = points.map(function (p, i) {
        var x = PAD_X + i * stepX;
        var y = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (1 - (p.v - min) / range);
        return { x: x, y: y, t: p.t, v: p.v };
      });
    }
    this._coords = coords;
    this._plotMeta = { W: W, H: H, PAD_TOP: PAD_TOP, PAD_BOTTOM: PAD_BOTTOM };
    var linePath = n === 1
      ? 'M ' + (coords[0].x - 14) + ' ' + coords[0].y + ' L ' + (coords[0].x + 14) + ' ' + coords[0].y
      : buildSmoothPath(coords);
    this.el.linePath.setAttribute('d', linePath);
    var areaStartX = n === 1 ? coords[0].x - 14 : coords[0].x;
    var areaEndX = n === 1 ? coords[0].x + 14 : coords[n - 1].x;
    var areaPath = linePath +
      ' L ' + areaEndX + ' ' + H +
      ' L ' + areaStartX + ' ' + H + ' Z';
    this.el.areaPath.setAttribute('d', areaPath);
    this.el.glowAreaPath.setAttribute('d', areaPath);
    this.el.gridGroup.innerHTML = '';
    var first = values[0];
    var last = values[values.length - 1];
    var changePercent = data.changePercent != null
      ? data.changePercent
      : (first !== 0 ? ((last - first) / first) * 100 : 0);
    this._renderSummary(changePercent, last);
    this.el.statMinVal.textContent = formatToman(min) + ' ' + (data.unit || 'تومان');
    this.el.statMaxVal.textContent = formatToman(max) + ' ' + (data.unit || 'تومان');
    if (animateEntrance) {
      var animTargets = [this.el.linePath, this.el.glowAreaPath, this.el.areaPath];
      animTargets.forEach(function (node) {
        node.classList.remove('hpc-enter');
        void node.getBBox && node.getBBox();
        node.classList.add('hpc-enter');
      });
    }
  };
  PriceChart.prototype._renderSummary = function (changePercent, lastValue) {
    var rounded = Math.round(Math.abs(changePercent) * 100) / 100;
    var isUp = changePercent > 0.0001;
    var isDown = changePercent < -0.0001;
    var direction = isUp ? 'up' : (isDown ? 'down' : 'flat');
    var arrow = isUp
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>'
      : (isDown
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>'
        : '');
    var pctText = '٪' + toPersianDigits(rounded.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    var label = isUp ? 'افزایش' : (isDown ? 'کاهش' : 'ثابت');
    var html = arrow + '<span>' + pctText + ' ' + label + '</span>';
    if (typeof this.opts.onChangeUpdate === 'function') {
      this.opts.onChangeUpdate({
        percent: rounded,
        direction: direction,
        html: html,
        rangeLabel: RANGE_LABELS[this.currentRange] || ''
      });
    }
  };
  PriceChart.prototype._onPointerMove = function (evt) {
    if (!this._coords || !this._coords.length) return;
    var rect = this.el.svg.getBoundingClientRect();
    var clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    var scaleX = this._plotMeta.W / rect.width;
    var localX = (clientX - rect.left) * scaleX;
    var coords = this._coords;
    var closest = coords[0];
    var closestDist = Math.abs(coords[0].x - localX);
    for (var i = 1; i < coords.length; i++) {
      var dist = Math.abs(coords[i].x - localX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = coords[i];
      }
    }
    this.el.plotWrap.classList.add('is-hovering');
    this.el.cursorLine.setAttribute('x1', closest.x);
    this.el.cursorLine.setAttribute('x2', closest.x);
    this.el.cursorLine.setAttribute('y1', this._plotMeta.PAD_TOP - 10);
    this.el.cursorHalo.setAttribute('cx', closest.x);
    this.el.cursorHalo.setAttribute('cy', closest.y);
    this.el.cursorDot.setAttribute('cx', closest.x);
    this.el.cursorDot.setAttribute('cy', closest.y);
    var rectReal = this.el.plotWrap.getBoundingClientRect();
    var pxX = (closest.x / this._plotMeta.W) * rectReal.width;
    var pxY = (closest.y / this._plotMeta.H) * rectReal.height;
    var tooltipEl = this.el.tooltip;
    var ttWidth = tooltipEl.offsetWidth || 150;
    var ttHalf = ttWidth / 2;
    var margin = 6;
    var clampedX = pxX;
    var translateX = -50;
    if (pxX - ttHalf < margin) {
      clampedX = margin;
      translateX = 0;
    } else if (pxX + ttHalf > rectReal.width - margin) {
      clampedX = rectReal.width - margin;
      translateX = -100;
    }
    var ttHeight = tooltipEl.offsetHeight || 50;
    var clampedY = pxY;
    var translateY = '-100% - 10px';
    if (pxY - ttHeight - 10 < margin) {
      translateY = '10px';
    }
    this.el.tooltip.style.transform = 'translate(' + translateX + '%, calc(' + translateY + '))';
    this.el.tooltip.style.left = clampedX + 'px';
    this.el.tooltip.style.top = clampedY + 'px';
    this.el.tooltipPrice.textContent = formatToman(closest.v) + ' ' + ((this.data && this.data.unit) || 'تومان');
    this.el.tooltipDate.textContent = this._formatDateForRange(closest.t);
  };
  PriceChart.prototype._formatDateForRange = function (t) {
    if (this.currentRange === 'daily') {
      var d = new Date(t);
      var hh = ('0' + d.getHours()).slice(-2);
      var mm = ('0' + d.getMinutes()).slice(-2);
      return toPersianDigits(hh) + ':' + toPersianDigits(mm) + ' - ' + formatJalaliShort(t);
    }
    return formatJalaliDate(t);
  };
  PriceChart.prototype._onPointerLeave = function () {
    this.el.plotWrap.classList.remove('is-hovering');
  };
  PriceChart.prototype.destroy = function () {
    this.el.hitArea.removeEventListener('mousemove', this._boundMove);
    this.el.hitArea.removeEventListener('mouseleave', this._boundLeave);
    this.el.hitArea.removeEventListener('touchmove', this._boundMove);
    this.el.hitArea.removeEventListener('touchend', this._boundLeave);
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    this.container.innerHTML = '';
  };
  const priceChart = {
    create: function (container, options) {
      return new PriceChart(container, options);
    },
    generateMockData: generateMockData
  };
export { priceChart };