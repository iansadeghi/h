  'use strict';
  var DURATION = 3000;
  function getContainer() {
    var c = document.getElementById('hojreh-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'hojreh-toast-container';
      c.className = 'hojreh-toast-container';
      c.setAttribute('aria-live', 'polite');
      c.setAttribute('aria-atomic', 'false');
      document.body.appendChild(c);
    }
    return c;
  }
  function show(message, type, duration) {
    if (!message) return;
    if (typeof type === 'number') {
      duration = type;
      type = 'green';
    }
    var toastType = (type === 'yellow' || type === 'red') ? type : 'green';
    var ms = (typeof duration === 'number' && duration > 0) ? duration : DURATION;
    var container = getContainer();
    var toast = document.createElement('div');
    toast.className = 'hojreh-toast toast-' + toastType;
    toast.setAttribute('role', 'alert');
    var progress = document.createElement('div');
    progress.className = 'hojreh-toast-progress';
    progress.style.transition = 'transform ' + ms + 'ms linear';
    progress.style.transform = 'scaleX(1)';
    var body = document.createElement('div');
    body.className = 'hojreh-toast-body';
    body.textContent = message;
    toast.appendChild(progress);
    toast.appendChild(body);
    container.appendChild(toast);
    var startTime = null;
    var elapsed = 0;
    var rafId = null;
    var removeTimer = null;
    var paused = false;
    function startProgress() {
      startTime = performance.now();
      requestAnimationFrame(function () {
        progress.style.transform = 'scaleX(0)';
      });
    }
    function pauseProgress() {
      if (paused) return;
      paused = true;
      elapsed += performance.now() - startTime;
      clearTimeout(removeTimer);
      cancelAnimationFrame(rafId);
      var remaining = ms - elapsed;
      var fraction = remaining / ms;
      progress.style.transition = 'none';
      progress.style.transform = 'scaleX(' + fraction + ')';
    }
    function resumeProgress() {
      if (!paused) return;
      paused = false;
      var remaining = ms - elapsed;
      startTime = performance.now();
      requestAnimationFrame(function () {
        progress.style.transition = 'transform ' + remaining + 'ms linear';
        progress.style.transform = 'scaleX(0)';
      });
      scheduleRemove(remaining);
    }
    function scheduleRemove(after) {
      clearTimeout(removeTimer);
      removeTimer = setTimeout(function () {
        removeToast();
      }, after);
    }
    function removeToast() {
      toast.classList.add('toast-hiding');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }
    toast.addEventListener('mouseenter', function () {
      pauseProgress();
    });
    toast.addEventListener('mouseleave', function () {
      resumeProgress();
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add('toast-visible');
        startProgress();
        scheduleRemove(ms);
      });
    });
  }
export { show };