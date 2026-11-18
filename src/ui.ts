import type { Game, Phase, FloorState } from "./game";
import type { Player } from "./player";

const LOCKOUT_MS = 1500;
const BEST_KEY = "nextbot-best-time";
const el = (id: string) => document.getElementById(id) as HTMLElement;

const screens: Record<Phase, HTMLElement | null> = {
    boot: el("start-overlay"),
    title: el("title-screen"),
    playing: null,
    paused: el("pause-screen"),
    won: el("win-screen"),
    lost: el("lose-screen"),
};

const startBtn = el("start-btn") as HTMLButtonElement;
const bestTimeEl = el("best-time");
const winTimeEl = el("win-time");

function loadBest(): number | null {
    try {
        const v = localStorage.getItem(BEST_KEY);
        const n = v === null ? NaN : Number(v);
        return Number.isFinite(n) ? n : null;
    } catch { return null; }   // storage can throw (private window, blocked site data)
}

function saveBest(sec: number) {
    try { localStorage.setItem(BEST_KEY, String(sec)); } catch { /* ignore */ }
}

function fmt(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export interface Rebuilt { floors: FloorState[]; player: Player }

export function initUI(game: Game, canvas: HTMLCanvasElement, rebuild: () => Rebuilt) {
    // Phase -> which screen is visible. The only place screens are shown or hidden.
    game.onPhaseChange = (p: Phase) => {
        for (const s of Object.values(screens)) s?.classList.add("hidden");
        screens[p]?.classList.remove("hidden");

        // While the pointer is locked, clicks go to the canvas and the cursor is hidden.
        if (p === "paused" || p === "won" || p === "lost") document.exitPointerLock();

        if (p === "title") {
            const best = loadBest();
            bestTimeEl.textContent = best === null ? "" : `Best time: ${fmt(best)}`;
        }
        if (p === "won") {
            const t = game.elapsed;
            const best = loadBest();
            const isBest = best === null || t < best;
            if (isBest) saveBest(t);
            winTimeEl.textContent = isBest ? `Time: ${fmt(t)} (new best!)` : `Time: ${fmt(t)} | Best: ${fmt(best)}`;
        }
    };
    game.setPhase("boot");

    // 1) The start button: the first real gesture. Audio context resume goes here later.
    startBtn.disabled = false;
    startBtn.textContent = "Click to Start";
    startBtn.addEventListener("click", (e) => {
        e.stopPropagation();   // otherwise this same click bubbles to the document handler below
        game.setPhase("title");
    });

    // 2) Everything after that goes through one document-level handler.
    //    (With the pointer locked, click events still bubble up from the canvas to here.)
    document.addEventListener("click", () => {
        switch (game.phase) {
            case "title":
                game.startRun();
                canvas.requestPointerLock();   // must happen inside the click
                break;
            case "paused":
                game.resume();
                canvas.requestPointerLock();
                break;
            case "won":
            case "lost": {
                if (performance.now() - game.phaseSince < LOCKOUT_MS) return;
                const fresh = rebuild();
                game.reset(fresh.floors, fresh.player);   // goes back to the title phase
                break;
            }
            case "boot":
            case "playing":
                break;
        }
    });

    // Esc unlocks the pointer: treat it as a pause so the timer and bots stop.
    document.addEventListener("pointerlockchange", () => {
        if (!document.pointerLockElement && game.phase === "playing") game.setPhase("paused");
    });
    // If the lock request is refused (Chrome blocks re-locking for about a second after Esc),
    // don't leave the player in a running game with dead mouse look.
    document.addEventListener("pointerlockerror", () => {
        if (game.phase === "playing") game.setPhase("paused");
    });
}
