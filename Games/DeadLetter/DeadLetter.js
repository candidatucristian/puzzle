// A turning grille: four disjoint rotations expose every cell exactly once.
// The envelope supplies the starting corner and the clockwise reading order.
const DL_MESSAGE = "THEWORDISLANTERN";
const DL_HOLES = [[0, 0], [0, 1], [0, 2], [1, 1]];

class DeadLetterScene extends Phaser.Scene {
  constructor() {
    super({ key: "DeadLetter" });
  }

  static holesAt(turn) {
    return DL_HOLES.map(([row, col]) => {
      for (let i = 0; i < ((turn % 4) + 4) % 4; i++) {
        [row, col] = [col, 3 - row];
      }
      return row * 4 + col;
    }).sort((a, b) => a - b);
  }

  static letterGrid() {
    const grid = Array(16);
    for (let turn = 0; turn < 4; turn++) {
      DeadLetterScene.holesAt(turn).forEach((cell, i) => {
        grid[cell] = DL_MESSAGE[turn * 4 + i];
      });
    }
    return grid;
  }

  create() {
    window.mainScene = this;
    window.initGlobalAudio?.(this);
    this._turn = 0;
    this._placed = false;
    this._busy = false;
    this._traces = [null, null, null, null];
    this._timers = [];
    this._inject();
    this._resize = () => this._layout();
    this.events.on("canvas_resized", this._resize);
    this.events.once("shutdown", this.shutdown, this);
    this._layout();
    this._render();
  }

  _inject() {
    this._dom?.remove();
    const overlay = document.createElement("div");
    overlay.id = "dead-letter";
    overlay.className = "scene-dom-overlay";
    const grid = DeadLetterScene.letterGrid();
    const letters = grid.map((letter, i) =>
      `<text x="${99 + (i % 4) * 64}" y="${119 + Math.floor(i / 4) * 64}">${letter}</text>`,
    ).join("");
    const holes = DL_HOLES.map(([row, col]) =>
      `<rect x="${72 + col * 64}" y="${79 + row * 64}" width="54" height="54" rx="2" fill="black"/>`,
    ).join("");
    overlay.innerHTML = `
      <div class="dl-stage">
        <svg class="dl-room" viewBox="0 0 900 650" aria-hidden="true">
          <defs>
            <radialGradient id="dl-pool"><stop stop-color="#655538" stop-opacity=".18"/><stop offset="1" stop-color="#131418" stop-opacity="0"/></radialGradient>
            <pattern id="dl-hatch" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 9L9 0" stroke="#c5bcaa" stroke-opacity=".055"/></pattern>
          </defs>
          <ellipse cx="433" cy="346" rx="420" ry="300" fill="url(#dl-pool)"/>
          <path d="M19 114L881 111 890 566 10 573Z" fill="#151619" stroke="#b7b1a2" stroke-opacity=".2"/>
          <path d="M16 576L891 570M34 592L872 586M25 115L19 574M875 113L884 571" fill="none" stroke="#c5bcaa" stroke-opacity=".12"/>
          <path d="M40 551L151 548M170 554L357 550M627 541L839 543M60 130L327 126" stroke="#c5bcaa" stroke-opacity=".09"/>
          <path d="M31 115L43 649M870 112L858 649M43 622L857 618" fill="none" stroke="#c5bcaa" stroke-opacity=".1"/>
          <g transform="translate(743 469) rotate(12) scale(.65)">
            <path d="M0 0L127 0 129 106 0 104Z" fill="#202024" stroke="#ada18a" stroke-opacity=".35"/>
            <path d="M1 3L63 51 127 2M1 103L45 64M128 105L83 65" fill="none" stroke="#ada18a" stroke-opacity=".3"/>
            <circle cx="64" cy="54" r="15" fill="#5b302b"/><circle cx="64" cy="54" r="11" fill="none" stroke="#ba8870" stroke-opacity=".4"/>
            <path d="M58 55L62 59 70 49" fill="none" stroke="#ba8870" stroke-opacity=".6"/>
          </g>
          <g transform="translate(53 441) rotate(-13)">
            <path d="M0 0L134 4 142 63 4 58Z" fill="url(#dl-hatch)" stroke="#b7b1a2" stroke-opacity=".3"/>
            <path d="M10 15L100 18M12 26L125 30M15 38L86 42" stroke="#b7b1a2" stroke-opacity=".15"/>
          </g>
          <path d="M244 505L248 507 295 361 291 359Z" fill="#82735b"/><path d="M244 505L242 518 248 507" fill="#b7aa90"/>
          <g class="dl-spare-stencil" transform="translate(86 457) rotate(-9)">
            <path d="M15 0H116V116H0V15Z M10 12h22v22H10Z M39 12h22v22H39Z M68 12h22v22H68Z M39 41h22v22H39Z" fill="#111317" fill-rule="evenodd" stroke="#8f8671" stroke-width="1"/>
            <path d="M12 6H27M98 104H108V95" fill="none" stroke="#8f8671" stroke-opacity=".5"/>
          </g>
        </svg>
        <header class="dl-header"><p>CHAMBER XVII · DEAD LETTER OFFICE</p><h2>Some words survive the fire.</h2></header>
        <aside class="dl-note">
          <span class="dl-pin"></span><p class="dl-note-title">To the finder,</p>
          <p>Lay the night<br>over the letter.</p>
          <p>Cut corner first.<br>Follow the clock.</p>
          <p>Four impressions.<br>Read left to right.</p>
          <span class="dl-signature">— the night clerk</span>
        </aside>
        <div class="dl-paper">
          <svg viewBox="0 0 390 415" role="img" aria-label="An intercepted letter: a four by four grid of letters, covered by a rotating stencil with four windows.">
            <defs>
              <mask id="dl-cutouts" maskUnits="userSpaceOnUse" x="42" y="50" width="305" height="307">
                <rect x="42" y="50" width="305" height="307" fill="white"/>${holes}
              </mask>
            </defs>
            <path d="M25 21L350 14 371 29 368 389 24 398 17 382Z" fill="#08090b" opacity=".65" transform="translate(5 7)"/>
            <path d="M25 21L350 14 371 29 368 389 24 398 17 382Z" fill="#d0c4a5" stroke="#5d5648" stroke-width="2"/>
            <path d="M350 15L348 34 370 29M31 365L355 360M35 371L349 369" fill="none" stroke="#776a51" stroke-opacity=".5"/>
            <path d="M31 26L30 339M357 40L355 343M33 350L355 347" fill="none" stroke="#776a51" stroke-opacity=".2"/>
            <text class="dl-paper-label" x="195" y="43">UNDELIVERED / 04</text>
            <g class="dl-letters">${letters}</g>
            <g class="dl-grid-lines" fill="none" stroke="#76694f" stroke-opacity=".23">
              <path d="M67 74H323V330H67ZM131 74V330M195 74V330M259 74V330M67 138H323M67 202H323M67 266H323"/>
            </g>
            <text class="dl-paper-label" x="195" y="382">RETURN TO SENDER</text>
            <g class="dl-stencil">
              <path d="M63 52H344V354H46V70Z" fill="#16191c" stroke="#817b6e" stroke-width="2" mask="url(#dl-cutouts)"/>
              <path d="M66 58H338V348H52V74Z" fill="none" stroke="#c4baa3" stroke-opacity=".19"/>
              <path d="M70 61L83 61M324 329L330 329 330 340" fill="none" stroke="#b7aa90" stroke-opacity=".55"/>
              <text x="195" y="346" class="dl-stencil-label">NIGHT SHIFT</text>
            </g>
          </svg>
          <button class="dl-place-hit" type="button" aria-label="Place or lift the stencil"></button>
        </div>
        <aside class="dl-ledger"><h3>IMPRESSIONS</h3><p>Keep what the paper reveals.</p>
          ${["I", "II", "III", "IV"].map((n, i) => `<div class="dl-impression"><span>${n}</span><output data-trace="${i}">· · · ·</output></div>`).join("")}
          <div class="dl-compass" aria-hidden="true">I → II → III → IV</div>
        </aside>
        <div class="dl-controls">
          <button type="button" data-action="place">PLACE STENCIL</button>
          <button type="button" data-action="turn" disabled>TURN ↻</button>
          <button type="button" data-action="trace" disabled>TAKE IMPRESSION</button>
        </div>
        <p class="dl-status" role="status" aria-live="polite"></p>
      </div>`;
    document.getElementById("game-container").appendChild(overlay);
    this._dom = overlay;
    this._stencil = overlay.querySelector(".dl-stencil");
    this._status = overlay.querySelector(".dl-status");
    overlay.querySelector('[data-action="place"]').addEventListener("click", () => this._place());
    overlay.querySelector(".dl-place-hit").addEventListener("click", () => this._place());
    overlay.querySelector('[data-action="turn"]').addEventListener("click", () => this._rotate());
    overlay.querySelector('[data-action="trace"]').addEventListener("click", () => this._trace());
  }

  _layout() {
    if (!this._dom) return;
    const scale = Math.min(this.scale.width / 900, this.scale.height / 650);
    this._dom.style.setProperty("--dl-scale", scale);
  }

  _place() {
    if (this._busy) return;
    this._placed = !this._placed;
    window.playClick?.(this);
    this._render();
  }

  _rotate() {
    if (!this._placed || this._busy) return;
    this._busy = true;
    this._turn++;
    window.playClick?.(this);
    this._render();
    // Phaser owns the delay, so leaving/replaying the scene cancels it.
    this._timers.push(this.time.delayedCall(420, () => {
      this._busy = false;
      this._render();
    }));
  }

  _trace() {
    if (!this._placed || this._busy) return;
    const position = this._turn % 4;
    const grid = DeadLetterScene.letterGrid();
    this._traces[position] = DeadLetterScene.holesAt(position).map((i) => grid[i]).join("");
    window.playClick?.(this);
    this._render();
    const note = this._dom.querySelector(`[data-trace="${position}"]`);
    note.classList.remove("dl-ink-in");
    void note.offsetWidth;
    note.classList.add("dl-ink-in");
  }

  _render() {
    if (!this._dom) return;
    this._dom.classList.toggle("dl-placed", this._placed);
    this._stencil.style.transform = `rotate(${this._turn * 90}deg)`;
    this._dom.querySelector('[data-action="place"]').textContent = this._placed ? "LIFT STENCIL" : "PLACE STENCIL";
    this._dom.querySelector('[data-action="place"]').disabled = this._busy;
    this._dom.querySelector(".dl-place-hit").disabled = this._busy;
    for (const action of ["turn", "trace"]) {
      this._dom.querySelector(`[data-action="${action}"]`).disabled = !this._placed || this._busy;
    }
    this._traces.forEach((trace, i) => {
      const out = this._dom.querySelector(`[data-trace="${i}"]`);
      out.textContent = trace ? trace.split("").join(" ") : "· · · ·";
      out.parentElement.classList.toggle("dl-current", this._placed && i === this._turn % 4);
    });
    this._status.textContent = this._traces.every(Boolean)
      ? "The clerk left you a word. Execute it."
      : this._busy ? "The clock turns…"
      : this._placed ? `POSITION ${["I", "II", "III", "IV"][this._turn % 4]} · Only the windows can be trusted.`
      : "A letter. A piece of black card. Something between them.";
  }

  shutdown() {
    this.events.off("canvas_resized", this._resize);
    this._timers.forEach((timer) => timer.remove(false));
    this._timers = [];
    this._dom?.remove();
    this._dom = null;
  }
}
