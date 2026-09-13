(function () {
  "use strict";

  /* ---------- mobile TOC toggle ---------- */
  var toggle = document.getElementById("tocToggle");
  var toc = document.getElementById("toc");

  if (toggle && toc) {
    toggle.addEventListener("click", function () {
      var isOpen = toc.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    toc.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        toc.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("click", function (event) {
      var isInsideToc = toc.contains(event.target);
      var isToggleBtn = toggle.contains(event.target);
      if (!isInsideToc && !isToggleBtn) {
        toc.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- active chapter highlighting ---------- */
  var chapters = Array.prototype.slice.call(document.querySelectorAll(".chapter"));
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc__list a"));

  if (chapters.length && tocLinks.length && "IntersectionObserver" in window) {
    var linkById = {};
    tocLinks.forEach(function (link) {
      linkById[link.getAttribute("href").slice(1)] = link;
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = linkById[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            tocLinks.forEach(function (l) { l.classList.remove("is-active"); });
            link.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );

    chapters.forEach(function (chapter) { observer.observe(chapter); });
  }

  /* ---------- lightweight HTML syntax highlighting ---------- */
  function highlightHtml(raw) {
    var esc = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    var stash = [];

    var work = esc.replace(/&lt;!--[\s\S]*?--&gt;/g, function (m) {
      stash.push('<span class="tok-comment">' + m + "</span>");
      return "\u0000" + (stash.length - 1) + "\u0000";
    });

    work = work.replace(/"[^"]*"/g, function (m) {
      stash.push('<span class="tok-str">' + m + "</span>");
      return "\u0000" + (stash.length - 1) + "\u0000";
    });

    work = work.replace(/(\s)([a-zA-Z-]+)(=)/g, function (m, p1, p2, p3) {
      return p1 + '<span class="tok-attr">' + p2 + "</span>" + p3;
    });

    work = work.replace(/(&lt;\/?)([a-zA-Z][a-zA-Z0-9-]*)/g, function (m, p1, p2) {
      return p1 + '<span class="tok-tag">' + p2 + "</span>";
    });

    work = work.replace(/\u0000(\d+)\u0000/g, function (m, i) {
      return stash[Number(i)];
    });

    return work;
  }

  var codeBlocks = document.querySelectorAll("code.lang-html");
  codeBlocks.forEach(function (block) {
    block.innerHTML = highlightHtml(block.textContent);
  });
})();
