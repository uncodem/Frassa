import { Howl, Howler } from "howler";
import { getSound, SoundId } from "./asset";
import type { Phase } from "./game";
import type { Bot } from "./bot";
import type { NavGrid } from "./nav";
import type { Player } from "./player";

export function playSfx(id: SoundId, volume = 1, rate = 1) {
    const howl = getSound(id); if (!howl) return;
    const sid = howl.play();
    howl.volume(volume, sid);
    howl.rate(rate, sid);
}

let current: { howl: Howl; sid: number } | null = null;

export function stopMusic(fadeMs = 400) {
    if (!current) return;
    const { howl, sid } = current;
    current = null;
    howl.fade(howl.volume(sid) as number, 0, fadeMs, sid);
    howl.once("fade", () => howl.stop(sid), sid);
}

export function playMusic(id: SoundId) {
    stopMusic();
    const howl = getSound(id); if (!howl) return;
    current = { howl, sid: howl.play() };
}

const HEAR = 16;
const CENTER_RADIUS = 1.0;
const SMOOTH = 12;

interface Voice { sid: number, vol: number, pan: number };
const voices = new Map<Bot, Voice>();

export function updateChase(bots: Bot[], nav: NavGrid, player: Player, dt: number) {
    const howl = getSound(SoundId.Chase); if (!howl) return;
    const k = 1 - Math.exp(-dt * SMOOTH);   // frame-rate independent easing
    const seen = new Set<Bot>();

    for (const b of bots) {
        let v = voices.get(b);
        if (!v) {
            v = { sid: howl.play(), vol: 0, pan: 0 };
            howl.volume(0, v.sid);
            voices.set(b, v);
        }
        seen.add(b);

        // volume: walking distance through the maze (unchanged)
        const d = nav.dist[Math.floor(b.y) * nav.width + Math.floor(b.x)]!;
        const targetVol = d < 0 ? 0 : Math.max(0, 1 - d / HEAR) ** 2;

        // pan: component of the player->bot direction along the player's right vector
        const dx = b.x - player.x, dy = b.y - player.y;
        const len = Math.hypot(dx, dy);
        const targetPan = len < 1e-6 ? 0
            : ((dx * -player.dy + dy * player.dx) / len) * Math.min(1, len / CENTER_RADIUS);

        v.vol += (targetVol - v.vol) * k;
        v.pan += (targetPan - v.pan) * k;
        howl.volume(v.vol, v.sid);
        howl.stereo(v.pan, v.sid);
    }

    // bots not on this floor: fade out rather than cut
    for (const [b, v] of voices) {
        if (seen.has(b)) continue;
        v.vol += (0 - v.vol) * k;
        howl.volume(v.vol, v.sid);
    }
}

export function stopChase() {
    getSound(SoundId.Chase)?.stop();
    voices.clear();
}

export function onPhase(p: Phase, prev: Phase) {
    switch (p) {
        case "title":   stopChase(); playMusic(SoundId.Title); break;
        case "playing": if (prev === "paused") void Howler.ctx?.resume(); else stopMusic(); break;
        case "paused":  void Howler.ctx?.suspend(); break;
        case "won":     stopChase(); playMusic(SoundId.Win); break;
        case "lost":    stopChase(); playSfx(SoundId.Catch); playMusic(SoundId.Lose); break;
    }
}
