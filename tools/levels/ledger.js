import { LEVEL_METADATA } from '../../src/levels/metadata.js';
const LEVELS = LEVEL_METADATA.map(level => ({
  ...level, alt: level.altCode, sound: level.hint.sound, tool: level.hint.tool,
  hint: level.hint.text, mech: level.description, keys: level.references,
}));
      // ── Render quick table ──
      const quickTable = document.getElementById("quick-table");
      const cardsWrap = document.getElementById("cards");

      LEVELS.forEach((lvl, i) => {
        const n = i + 1;

        const row = document.createElement("a");
        row.href = "#lvl-" + lvl.key;
        row.className = "quick-row";
        row.dataset.search = (lvl.name + " " + lvl.key + " " + lvl.code + " " + (lvl.alt || "")).toLowerCase();
        row.innerHTML =
          '<span class="quick-num">' + String(n).padStart(2, "0") + '</span>' +
          '<span class="quick-name">' + lvl.name + '</span>' +
          '<span class="quick-alt">' + (lvl.alt ? "alt: " + lvl.alt : "") + '</span>' +
          '<span class="quick-code">' + lvl.code + '</span>';
        quickTable.appendChild(row);

        const card = document.createElement("section");
        card.className = "level-card sketch-frame";
        card.id = "lvl-" + lvl.key;
        card.dataset.search = row.dataset.search;

        let badges = "";
        if (lvl.sound) badges += '<span class="mini-badge">🔊 sound</span>';
        if (lvl.tool) badges += '<span class="mini-badge">🔧 tool</span>';

        let keysHtml = lvl.keys.map((k) => "<li>" + escapeHtml(k) + "</li>").join("");

        card.innerHTML =
          '<div class="level-card-head">' +
            '<div class="level-title">' +
              '<span class="level-num">CHAMBER ' + String(n).padStart(2, "0") + '</span>' +
              '<h2 class="level-name">' + lvl.name + '</h2>' +
            '</div>' +
            '<div class="code-block">' +
              '<span class="code-value" title="Click to copy">' + lvl.code + '</span>' +
              (lvl.alt ? '<span class="code-alt">alt: ' + lvl.alt + '</span>' : '') +
              '<button class="copy-btn">copy</button>' +
            '</div>' +
          '</div>' +
          (badges ? '<div class="badges-row">' + badges + '</div>' : '') +
          '<p class="clue-line">' + escapeHtml(lvl.hint) + '</p>' +
          '<div class="mech-label">How it solves</div>' +
          '<p class="mech-text">' + escapeHtml(lvl.mech) + '</p>' +
          '<div class="keys-label">Where it lives in the code</div>' +
          '<ul class="keys-list">' + keysHtml + '</ul>';

        cardsWrap.appendChild(card);

        const copyBtn = card.querySelector(".copy-btn");
        const doCopy = async () => {
          try {
            await navigator.clipboard.writeText(lvl.code);
            copyBtn.textContent = "copied";
            copyBtn.classList.add("done");
          } catch {
            copyBtn.textContent = "select code to copy";
          }
          setTimeout(() => {
            copyBtn.textContent = "copy";
            copyBtn.classList.remove("done");
          }, 1200);
        };
        copyBtn.addEventListener("click", doCopy);
        card.querySelector(".code-value").addEventListener("click", doCopy);
      });

      function escapeHtml(s) {
        const d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
      }

      // ── Filter ──
      const filterInput = document.getElementById("filter-input");
      filterInput.addEventListener("input", () => {
        const q = filterInput.value.trim().toLowerCase();
        document.querySelectorAll(".quick-row").forEach((el) => {
          el.hidden = q && !el.dataset.search.includes(q);
        });
        document.querySelectorAll(".level-card").forEach((el) => {
          el.hidden = q && !el.dataset.search.includes(q);
        });
      });
