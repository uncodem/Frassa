import { Howl, Howler } from "howler";
import { getSound, SoundId } from "./asset";
import type { Phase } from "./game";
import type { Bot } from "./bot";
import type { NavGrid } from "./nav";

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
const voices = new Map<Bot, number>();

export function updateChase(bots: Bot[], nav: NavGrid) {
    const howl = getSound(SoundId.Chase); if (!howl) return;
    const seen = new Set<Bot>();
    for (const b of bots) {
        let sid = voices.get(b);
        if (sid === undefined) { sid = howl.play(); howl.volume(0, sid); voices.set(b, sid); }
        seen.add(b);
        const d = nav.dist[Math.floor(b.y) * nav.width + Math.floor(b.x)]!;
        howl.volume(d < 0 ? 0 : Math.max(0, 1 - d / HEAR) ** 2, sid);
        // later: howl.stereo(Math.sin(angleToBotRelativeToPlayer), sid);
    }
    for (const [b, sid] of voices) if (!seen.has(b)) howl.volume(0, sid);
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
