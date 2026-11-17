import { Level, TileType, TILE_DATA } from "./level";
import type { TileProperties } from "./level";
import { Raycaster } from "./raycaster";
import { Renderer } from "./renderer";
import { Player } from "./player";
import { Sprite } from "./sprite";
import { loadAssets, tryGetTexture, TextureId } from "./asset";

// ---------------------------------------------------------------------------
// Model. Mirrors the loader's ParsedWorld:
//   { width, height, tiles: number[], commands: MapCommand[] }
//   { type: "player"; x; y; angle? }
//   { type: "bot"; x; y; behavior?; speed?; texture? }
//   { type: "pickup"; kind: "page" | "key"; x; y }
//   { type: "sprite"; x; y; texture?; worldHeight? }
//   { type: "stairs"; x; y; to }
// Coordinates are whole tile units; the game's spawner adds 0.5.
// Optional fields are omitted from the file when unset.
// ---------------------------------------------------------------------------

type EntType = "player" | "sprite" | "bot" | "pickup" | "stairs";
type Tool = "paint" | "rect" | "fill" | "pick" | "select" | "player" | "sprite" | "bot" | "pickup" | "stairs" | "cam";
type PickupKind = "page" | "key";

// Every field exists on every entity so editing stays simple; only the fields that
// belong to the entity's type are exported (and null means "omit, use loader default").
interface EntFields {
    texture: string | null;      // sprite, bot
    worldHeight: number | null;  // sprite
    angle: number | null;        // player, radians
    behavior: string | null;     // bot
    speed: number | null;        // bot
    kind: PickupKind;            // pickup
    to: number;                  // stairs: destination floor index
}
interface Ent extends EntFields {
    type: EntType;
    x: number;
    y: number;
}
interface Doc {
    width: number;
    height: number;
    tiles: number[];
    ents: Ent[];
}
interface Cell { x: number; y: number }

const MAX_SIZE = 100;
const STORAGE_KEY = "nextbot-editor-doc-v2";
const PW = 480, PH = 270;

const ORDER: EntType[] = ["player", "pickup", "stairs", "sprite", "bot"];

const BASE: EntFields = { texture: null, worldHeight: null, angle: null, behavior: null, speed: null, kind: "page", to: 0 };
const DEFAULTS: Record<EntType, EntFields> = {
    player: { ...BASE },
    sprite: { ...BASE, worldHeight: 0.6 },
    bot: { ...BASE },
    pickup: { ...BASE },
    stairs: { ...BASE },
};
// Values used for newly placed entities (editable in the panel when nothing is selected).
const placeDefaults: Record<EntType, EntFields> = {
    player: { ...DEFAULTS.player },
    sprite: { ...DEFAULTS.sprite },
    bot: { ...DEFAULTS.bot },
    pickup: { ...DEFAULTS.pickup },
    stairs: { ...DEFAULTS.stairs },
};

const ENT_STYLE: Record<EntType, { color: string; letter: string }> = {
    player: { color: "#3fe06a", letter: "P" },
    sprite: { color: "#ffb02e", letter: "S" },
    bot: { color: "#ff4d4d", letter: "B" },
    pickup: { color: "#f2e04a", letter: "G" },
    stairs: { color: "#b77bff", letter: "T" },
};
function entLetter(e: Ent): string {
    return e.type === "pickup" ? (e.kind === "key" ? "K" : "G") : ENT_STYLE[e.type].letter;
}

const TEXTURE_IDS = Object.values(TextureId) as string[];
const TILE_IDS = Object.keys(TILE_DATA).map(Number).sort((a, b) => a - b);

function tileProps(id: number): TileProperties | undefined {
    return (TILE_DATA as Record<number, TileProperties>)[id];
}
function tileName(id: number): string {
    const e = Object.entries(TileType).find(([, v]) => v === id);
    return e ? e[0] : `Tile${id}`;
}
function isSolidId(id: number): boolean {
    return tileProps(id)?.solid ?? true;
}

function mk(type: EntType, x: number, y: number, f: EntFields = DEFAULTS[type]): Ent {
    return { type, x, y, ...f };
}

function blankDoc(w: number, h: number, border: boolean): Doc {
    const tiles = new Array<number>(w * h).fill(TileType.Empty);
    const ents: Ent[] = [];
    if (border) {
        for (let x = 0; x < w; x++) { tiles[x] = TileType.Wall; tiles[(h - 1) * w + x] = TileType.Wall; }
        for (let y = 0; y < h; y++) { tiles[y * w] = TileType.Wall; tiles[y * w + w - 1] = TileType.Wall; }
        ents.push(mk("player", Math.min(1, w - 1), Math.min(1, h - 1)));
    }
    return { width: w, height: h, tiles, ents };
}

// ---------------------------------------------------------------------------
// Persistence / import / export
// ---------------------------------------------------------------------------

function validDoc(d: unknown): d is Doc {
    const o = d as Doc;
    if (!o || typeof o.width !== "number" || typeof o.height !== "number") return false;
    if (!Array.isArray(o.tiles) || o.tiles.length !== o.width * o.height) return false;
    if (!Array.isArray(o.ents)) return false;
    return o.tiles.every((t) => tileProps(t) !== undefined);
}

function loadStored(): Doc | null {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (!s) return null;
        const d = JSON.parse(s) as unknown;
        return validDoc(d) ? d : null;
    } catch { return null; }
}

function persist(s: string) {
    try { localStorage.setItem(STORAGE_KEY, s); } catch { /* storage unavailable */ }
}

// JSON.stringify skips undefined values, so unset optionals simply don't appear.
function entCommand(e: Ent): Record<string, unknown> {
    switch (e.type) {
        case "player":
            return { type: "player", x: e.x, y: e.y, angle: e.angle ?? undefined };
        case "bot":
            return { type: "bot", x: e.x, y: e.y, behavior: e.behavior ?? undefined, speed: e.speed ?? undefined, texture: e.texture ?? undefined };
        case "pickup":
            return { type: "pickup", kind: e.kind, x: e.x, y: e.y };
        case "sprite":
            return { type: "sprite", x: e.x, y: e.y, texture: e.texture ?? undefined, worldHeight: e.worldHeight ?? undefined };
        case "stairs":
            return { type: "stairs", x: e.x, y: e.y, to: e.to };
    }
}

function exportJSON(d: Doc): string {
    const rows: string[] = [];
    for (let y = 0; y < d.height; y++) rows.push("    " + d.tiles.slice(y * d.width, (y + 1) * d.width).join(","));
    const ordered = [...d.ents].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
    const cmds = ordered.map((e) => "    " + JSON.stringify(entCommand(e)));
    return [
        "{",
        `  "width": ${d.width},`,
        `  "height": ${d.height},`,
        `  "tiles": [`,
        rows.join(",\n"),
        "  ],",
        `  "commands": [`,
        cmds.join(",\n"),
        "  ]",
        "}",
        "",
    ].join("\n");
}

function parseDoc(text: string): { doc: Doc; notes: string[] } {
    const d = JSON.parse(text) as {
        width?: unknown; height?: unknown; tiles?: unknown; commands?: unknown;
    };
    const W = d.width, H = d.height;
    if (typeof W !== "number" || typeof H !== "number" || !Number.isInteger(W) || !Number.isInteger(H)
        || W < 1 || H < 1 || W > MAX_SIZE || H > MAX_SIZE) {
        throw new Error(`width/height must be integers from 1 to ${MAX_SIZE}`);
    }
    if (!Array.isArray(d.tiles) || d.tiles.length !== W * H) {
        throw new Error(`tiles must be an array of width*height (${W * H}) numbers`);
    }
    const tiles = d.tiles as number[];
    for (const t of tiles) if (tileProps(t) === undefined) throw new Error(`unknown tile id ${String(t)}`);

    const notes: string[] = [];
    const ents: Ent[] = [];
    const optNum = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const optStr = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
    const cmds = Array.isArray(d.commands) ? (d.commands as Record<string, unknown>[]) : [];
    let skipped = 0, extraPlayers = 0;

    for (const c of cmds) {
        const x = Math.floor(optNum(c.x) ?? 0), y = Math.floor(optNum(c.y) ?? 0);
        const add = (t: EntType, f: Partial<EntFields>) => { ents.push(mk(t, x, y, { ...DEFAULTS[t], ...f })); };
        switch (c.type) {
            case "player":
                if (ents.some((e) => e.type === "player")) { extraPlayers++; break; }
                add("player", { angle: optNum(c.angle) });
                break;
            case "sprite":
                add("sprite", { texture: optStr(c.texture), worldHeight: optNum(c.worldHeight) });
                break;
            case "bot":
                add("bot", { behavior: optStr(c.behavior), speed: optNum(c.speed), texture: optStr(c.texture) });
                break;
            case "pickup":
                add("pickup", { kind: c.kind === "key" ? "key" : "page" });
                break;
            case "stairs":
                add("stairs", { to: Math.floor(optNum(c.to) ?? 0) });
                break;
            default:
                skipped++;
        }
    }
    if (skipped) notes.push(`${skipped} unknown command(s) skipped`);
    if (extraPlayers) notes.push(`${extraPlayers} extra player spawn(s) dropped`);
    return { doc: { width: W, height: H, tiles: tiles.slice(), ents }, notes };
}

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const mapCanvas = $<HTMLCanvasElement>("map");
const mctx = mapCanvas.getContext("2d")!;
const previewCanvas = $<HTMLCanvasElement>("preview");
const paletteEl = $<HTMLDivElement>("palette");
const propsEl = $<HTMLDivElement>("props");
const checksEl = $<HTMLUListElement>("checks");
const posEl = $<HTMLSpanElement>("pos");
const msgEl = $<HTMLSpanElement>("msg");
const brushInput = $<HTMLInputElement>("brush");
const mwInput = $<HTMLInputElement>("mw");
const mhInput = $<HTMLInputElement>("mh");
const angleInput = $<HTMLInputElement>("angle");
const followInput = $<HTMLInputElement>("follow");
const fileInput = $<HTMLInputElement>("file");

let msgTimer = 0;
function flash(text: string, kind: "ok" | "err" = "ok") {
    msgEl.textContent = text;
    msgEl.className = kind;
    window.clearTimeout(msgTimer);
    msgTimer = window.setTimeout(() => { msgEl.textContent = ""; }, 5000);
}

try {
    await loadAssets();
} catch (e) {
    flash(`Asset load failed: ${(e as Error).message}`, "err");
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let doc: Doc = loadStored() ?? blankDoc(24, 24, true);
let tool: Tool = "paint";
let tile: number = TileType.Wall;
let selected: Ent | null = null;
let hover: Cell | null = null;

let zoom = 20, panX = 20, panY = 20;
let cssW = 0, cssH = 0;
let fitted = false;

let mapDirty = true, levelDirty = true, previewDirty = true;
const markDirty = () => { mapDirty = levelDirty = previewDirty = true; };

const undoStack: string[] = [];
const redoStack: string[] = [];
let lastSnap = JSON.stringify(doc);

const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < doc.width && y < doc.height;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clampCell = (c: Cell): Cell => ({ x: clamp(c.x, 0, doc.width - 1), y: clamp(c.y, 0, doc.height - 1) });

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

let lastSpawnKey = "";

function onDocChanged() {
    markDirty();
    mwInput.value = String(doc.width);
    mhInput.value = String(doc.height);
    renderProps();
    runChecks();
    followSpawn(false);
}

function commit() {
    const s = JSON.stringify(doc);
    if (s === lastSnap) return;
    undoStack.push(lastSnap);
    if (undoStack.length > 200) undoStack.shift();
    redoStack.length = 0;
    lastSnap = s;
    persist(s);
    onDocChanged();
}

function restore(s: string) {
    doc = JSON.parse(s) as Doc;
    lastSnap = s;
    selected = null;
    persist(s);
    onDocChanged();
}

function undo() {
    const s = undoStack.pop();
    if (s === undefined) return;
    redoStack.push(lastSnap);
    restore(s);
}
function redo() {
    const s = redoStack.pop();
    if (s === undefined) return;
    undoStack.push(lastSnap);
    restore(s);
}

function replaceDoc(d: Doc) {
    doc = d;
    selected = null;
    commit();
    onDocChanged();
    fit();
}

// ---------------------------------------------------------------------------
// Editing operations
// ---------------------------------------------------------------------------

function brushCells(cx: number, cy: number, fn: (x: number, y: number) => void) {
    const n = clamp(Math.floor(Number(brushInput.value)) || 1, 1, 9);
    const half = Math.floor(n / 2);
    for (let dy = -half; dy < n - half; dy++)
        for (let dx = -half; dx < n - half; dx++)
            if (inb(cx + dx, cy + dy)) fn(cx + dx, cy + dy);
}

function paintAt(cx: number, cy: number) {
    brushCells(cx, cy, (x, y) => { doc.tiles[y * doc.width + x] = tile; });
    markDirty();
}

function removeEntsAt(x: number, y: number) {
    const before = doc.ents.length;
    doc.ents = doc.ents.filter((e) => !(e.x === x && e.y === y));
    if (selected && !doc.ents.includes(selected)) selected = null;
    return before !== doc.ents.length;
}

function eraseAt(cx: number, cy: number) {
    brushCells(cx, cy, (x, y) => {
        doc.tiles[y * doc.width + x] = TileType.Empty;
        removeEntsAt(x, y);
    });
    markDirty();
}

function line(a: Cell, b: Cell, fn: (x: number, y: number) => void) {
    let x0 = a.x, y0 = a.y;
    const dx = Math.abs(b.x - x0), dy = -Math.abs(b.y - y0);
    const sx = x0 < b.x ? 1 : -1, sy = y0 < b.y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
        fn(x0, y0);
        if (x0 === b.x && y0 === b.y) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

function floodFill(x: number, y: number, to: number) {
    if (!inb(x, y)) return;
    const from = doc.tiles[y * doc.width + x]!;
    if (from === to) return;
    const stack: number[] = [y * doc.width + x];
    while (stack.length) {
        const i = stack.pop()!;
        if (doc.tiles[i] !== from) continue;
        doc.tiles[i] = to;
        const cx = i % doc.width, cy = (i / doc.width) | 0;
        if (cx > 0) stack.push(i - 1);
        if (cx < doc.width - 1) stack.push(i + 1);
        if (cy > 0) stack.push(i - doc.width);
        if (cy < doc.height - 1) stack.push(i + doc.width);
    }
    markDirty();
}

function fillRect(a: Cell, b: Cell, to: number) {
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
    const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) doc.tiles[y * doc.width + x] = to;
    markDirty();
}

function entityAt(x: number, y: number): Ent | null {
    for (let i = doc.ents.length - 1; i >= 0; i--) {
        const e = doc.ents[i]!;
        if (e.x === x && e.y === y) return e;
    }
    return null;
}

function placeEnt(type: EntType, x: number, y: number) {
    if (!inb(x, y)) return;
    if (type === "player") {
        doc.ents = doc.ents.filter((e) => e.type !== "player");
        selected = null;
    }
    const f = placeDefaults[type];
    const e = mk(type, x, y, f);
    doc.ents.push(e);
    selected = e;
    markDirty();
}

function resizeDoc(w: number, h: number) {
    w = clamp(Math.floor(w) || 1, 1, MAX_SIZE);
    h = clamp(Math.floor(h) || 1, 1, MAX_SIZE);
    const tiles = new Array<number>(w * h).fill(TileType.Empty);
    for (let y = 0; y < Math.min(h, doc.height); y++)
        for (let x = 0; x < Math.min(w, doc.width); x++)
            tiles[y * w + x] = doc.tiles[y * doc.width + x]!;
    const ents = doc.ents.filter((e) => e.x < w && e.y < h);
    const dropped = doc.ents.length - ents.length;
    doc = { width: w, height: h, tiles, ents };
    selected = null;
    commit();
    onDocChanged();
    if (dropped) flash(`Resized; ${dropped} entity(ies) fell outside the map and were removed`, "err");
}

// ---------------------------------------------------------------------------
// Tools / palette UI
// ---------------------------------------------------------------------------

const TOOL_KEYS: Record<string, Tool> = {
    b: "paint", r: "rect", f: "fill", i: "pick", v: "select", p: "player", s: "sprite", o: "bot", k: "pickup", t: "stairs", c: "cam",
};

function setTool(t: Tool) {
    tool = t;
    document.querySelectorAll<HTMLButtonElement>("#tools button").forEach((b) =>
        b.classList.toggle("active", b.dataset.tool === t));
    mapCanvas.style.cursor = t === "select" ? "default" : "crosshair";
    mapDirty = true;
}
document.querySelectorAll<HTMLButtonElement>("#tools button").forEach((b) =>
    b.addEventListener("click", () => setTool(b.dataset.tool as Tool)));

function refreshPalette() {
    for (const b of Array.from(paletteEl.children) as HTMLElement[])
        b.classList.toggle("active", Number(b.dataset.id) === tile);
}

function buildPalette() {
    paletteEl.replaceChildren();
    for (const id of TILE_IDS) {
        const p = tileProps(id)!;
        const b = document.createElement("button");
        b.className = "tile";
        b.dataset.id = String(id);
        const sw = document.createElement("canvas");
        sw.width = sw.height = 32;
        const g = sw.getContext("2d")!;
        g.imageSmoothingEnabled = false;
        const tex = p.texture ? tryGetTexture(p.texture) : undefined;
        if (tex) g.drawImage(tex, 0, 0, 32, 32);
        else { g.fillStyle = p.solid ? p.color : "#1b1b23"; g.fillRect(0, 0, 32, 32); }
        const label = document.createElement("span");
        label.textContent = `${id} ${tileName(id)}` + (p.solid ? ` · h${p.height}` : " · open") + (p.transparent ? " · glass" : "");
        b.append(sw, label);
        b.addEventListener("click", () => {
            tile = id;
            if (tool !== "paint" && tool !== "rect" && tool !== "fill") setTool("paint");
            refreshPalette();
        });
        paletteEl.append(b);
    }
    refreshPalette();
}

// ---------------------------------------------------------------------------
// Entity property forms
// ---------------------------------------------------------------------------

function row(label: string, input: HTMLElement): HTMLLabelElement {
    const l = document.createElement("label");
    l.className = "row";
    const s = document.createElement("span");
    s.textContent = label;
    l.append(s, input);
    return l;
}

function numberInput(value: number, step: number, min: number | undefined, on: (v: number) => void) {
    const i = document.createElement("input");
    i.type = "number";
    i.step = String(step);
    if (min !== undefined) i.min = String(min);
    i.value = String(value);
    i.addEventListener("change", () => {
        const v = parseFloat(i.value);
        if (Number.isFinite(v)) on(v);
    });
    return i;
}

function textureSelect(value: string | null, on: (v: string | null) => void) {
    const s = document.createElement("select");
    const none = new Option("(none: use color)", "");
    s.add(none);
    const ids = [...TEXTURE_IDS];
    if (value && !ids.includes(value)) ids.push(value);
    for (const id of ids) s.add(new Option(TEXTURE_IDS.includes(id) ? id : `${id} (unknown)`, id));
    s.value = value ?? "";
    s.addEventListener("change", () => on(s.value === "" ? null : s.value));
    return s;
}

function entityFields(target: EntFields, type: EntType, onChange: () => void): HTMLElement {
    const box = document.createElement("div");
    // Optional numbers: an empty field means "omit from the file, use the loader's default".
    const optNumber = (label: string, key: "worldHeight" | "speed" | "angle", step: number, min?: number) => {
        const i = document.createElement("input");
        i.type = "number";
        i.step = String(step);
        if (min !== undefined) i.min = String(min);
        i.placeholder = "default";
        i.value = target[key] === null ? "" : String(target[key]);
        i.addEventListener("change", () => {
            const v = parseFloat(i.value);
            target[key] = Number.isFinite(v) ? v : null;
            onChange();
        });
        box.append(row(label, i));
    };
    const texture = () => box.append(row("Texture", textureSelect(target.texture, (v) => { target.texture = v; onChange(); })));

    switch (type) {
        case "sprite":
            texture();
            optNumber("Visual height", "worldHeight", 0.05, 0.05);
            break;
        case "bot": {
            texture();
            const beh = document.createElement("input");
            beh.type = "text";
            beh.placeholder = "default";
            beh.value = target.behavior ?? "";
            beh.addEventListener("change", () => { target.behavior = beh.value.trim() || null; onChange(); });
            box.append(row("Behavior", beh));
            optNumber("Speed", "speed", 0.25, 0);
            break;
        }
        case "pickup": {
            const s = document.createElement("select");
            s.add(new Option("page", "page"));
            s.add(new Option("key", "key"));
            s.value = target.kind;
            s.addEventListener("change", () => { target.kind = s.value === "key" ? "key" : "page"; onChange(); });
            box.append(row("Kind", s));
            break;
        }
        case "stairs":
            box.append(row("To floor", numberInput(target.to, 1, 0, (v) => { target.to = Math.max(0, Math.round(v)); onChange(); })));
            break;
        case "player": {
            optNumber("Angle (rad)", "angle", 0.1);
            const b = document.createElement("button");
            b.textContent = "Use preview angle";
            b.addEventListener("click", () => { target.angle = Math.round(pv.camera.a * 100) / 100; onChange(); });
            box.append(b);
            break;
        }
    }
    return box;
}

function renderProps() {
    propsEl.replaceChildren();
    if (selected) {
        const e = selected;
        const head = document.createElement("div");
        head.innerHTML = `<b>${e.type}</b>`;
        propsEl.append(head);
        propsEl.append(row("Tile X", numberInput(e.x, 1, 0, (v) => { e.x = clamp(Math.round(v), 0, doc.width - 1); commit(); })));
        propsEl.append(row("Tile Y", numberInput(e.y, 1, 0, (v) => { e.y = clamp(Math.round(v), 0, doc.height - 1); commit(); })));
        propsEl.append(entityFields(e, e.type, commit));
        const del = document.createElement("button");
        del.textContent = "Delete (Del)";
        del.addEventListener("click", deleteSelected);
        propsEl.append(del);
    } else {
        const h = document.createElement("p");
        h.className = "hint";
        h.textContent = "Nothing selected. These are the defaults for newly placed entities (Select tool picks existing ones).";
        propsEl.append(h);
        for (const t of ["sprite", "bot", "pickup", "stairs"] as const) {
            const hd = document.createElement("div");
            hd.style.marginTop = "8px";
            hd.innerHTML = `<b>New ${t}</b>`;
            propsEl.append(hd, entityFields(placeDefaults[t], t, () => {}));
        }
    }
}

function deleteSelected() {
    if (!selected) return;
    doc.ents = doc.ents.filter((e) => e !== selected);
    selected = null;
    commit();
    onDocChanged();
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function runChecks() {
    const items: { kind: "warn" | "ok"; text: string }[] = [];
    const players = doc.ents.filter((e) => e.type === "player");
    if (players.length === 0) items.push({ kind: "warn", text: "No player spawn. The loader needs exactly one." });

    for (const e of doc.ents) {
        if (!inb(e.x, e.y)) { items.push({ kind: "warn", text: `${e.type} at (${e.x}, ${e.y}) is outside the map` }); continue; }
        if (isSolidId(doc.tiles[e.y * doc.width + e.x]!))
            items.push({ kind: "warn", text: `${e.type} at (${e.x}, ${e.y}) is inside a solid tile` });
        if (e.texture && !TEXTURE_IDS.includes(e.texture))
            items.push({ kind: "warn", text: `${e.type} at (${e.x}, ${e.y}) uses unknown texture "${e.texture}"` });
    }

    const p = players[0];
    if (p && inb(p.x, p.y) && !isSolidId(doc.tiles[p.y * doc.width + p.x]!)) {
        const W = doc.width, H = doc.height;
        const seen = new Uint8Array(W * H);
        const q: number[] = [p.y * W + p.x];
        seen[q[0]!] = 1;
        for (let h = 0; h < q.length; h++) {
            const i = q[h]!, x = i % W, y = (i / W) | 0;
            const nb: [number, number][] = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
            for (const [nx, ny] of nb) {
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                const j = ny * W + nx;
                if (seen[j] || isSolidId(doc.tiles[j]!)) continue;
                seen[j] = 1;
                q.push(j);
            }
        }
        const unreachable = doc.ents.filter((e) => e.type !== "player" && inb(e.x, e.y) && !seen[e.y * W + e.x]);
        if (unreachable.length)
            items.push({ kind: "warn", text: `${unreachable.length} entity(ies) can't be reached from the player spawn` });
        let open = 0;
        for (let i = 0; i < W * H; i++) if (!isSolidId(doc.tiles[i]!)) open++;
        const reach = q.length;
        if (reach < open) items.push({ kind: "warn", text: `${open - reach} open tile(s) are cut off from the spawn` });
    }

    if (items.length === 0) items.push({ kind: "ok", text: "No problems found." });
    checksEl.replaceChildren(...items.map((it) => {
        const li = document.createElement("li");
        li.className = it.kind;
        li.textContent = it.text;
        return li;
    }));
}

// ---------------------------------------------------------------------------
// Preview (first person, uses the game's Raycaster + Renderer)
// ---------------------------------------------------------------------------

// turnSpeed = 1 so Player.turn(x) turns by x radians.
const pv = new Player(2.5, 2.5, 0.3, 0.3, 3, 1);
const renderer = new Renderer(previewCanvas);
let level: Level;
let raycaster: Raycaster;
let previewSprites: Sprite[] = [];
const pvKeys = new Set<string>();

function rebuild() {
    const rows: TileType[][] = [];
    for (let y = 0; y < doc.height; y++)
        rows.push(doc.tiles.slice(y * doc.width, (y + 1) * doc.width) as TileType[]);
    level = new Level(rows);
    raycaster = new Raycaster(level, PW);
    previewSprites = doc.ents
        .filter((e) => e.type === "sprite" || e.type === "bot" || e.type === "pickup")
        .map((e) => {
            const tex = e.texture && TEXTURE_IDS.includes(e.texture) ? (e.texture as TextureId) : undefined;
            const height = e.type === "bot" ? 1 : e.type === "pickup" ? 0.4 : (e.worldHeight ?? 0.6);
            const color = e.type === "pickup" ? (e.kind === "key" ? "gold" : "#f2f0d0") : "magenta";
            return new Sprite(e.x + 0.5, e.y + 0.5, 0.3, 0.3, tex, color, height);
        });
    levelDirty = false;
}

function setPreviewAngle(a: number) {
    pv.turn(a - pv.camera.a);
    previewDirty = mapDirty = true;
}

function followSpawn(force: boolean) {
    const p = doc.ents.find((e) => e.type === "player");
    const key = p ? `${p.x},${p.y},${p.angle}` : "";
    const moved = key !== lastSpawnKey;
    lastSpawnKey = key;
    if (p && (force || (moved && followInput.checked))) {
        pv.x = p.x + 0.5;
        pv.y = p.y + 0.5;
        if (p.angle !== null) setPreviewAngle(p.angle);
        previewDirty = mapDirty = true;
    }
}

function drawPreview() {
    const hits = raycaster.getFrame(pv.x, pv.y, pv.camera);
    renderer.drawFrame(pv, level, previewSprites, hits);
    const deg = Math.round((pv.camera.a * 180) / Math.PI) % 360;
    if (document.activeElement !== angleInput && Number(angleInput.value) !== deg) angleInput.value = String(deg);
}

angleInput.addEventListener("input", () => setPreviewAngle((Number(angleInput.value) * Math.PI) / 180));

previewCanvas.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        pvKeys.add(k);
        e.preventDefault();
    }
});
previewCanvas.addEventListener("keyup", (e) => pvKeys.delete(e.key.toLowerCase()));
previewCanvas.addEventListener("blur", () => pvKeys.clear());

let pvDragging = false;
previewCanvas.addEventListener("pointerdown", (e) => {
    previewCanvas.focus();
    previewCanvas.setPointerCapture(e.pointerId);
    pvDragging = true;
});
previewCanvas.addEventListener("pointermove", (e) => {
    if (!pvDragging) return;
    pv.turn(e.movementX * 0.006);
    previewDirty = mapDirty = true;
});
previewCanvas.addEventListener("pointerup", () => { pvDragging = false; });

// ---------------------------------------------------------------------------
// Map drawing
// ---------------------------------------------------------------------------

const dpr = () => window.devicePixelRatio || 1;

function fit() {
    const m = 14;
    zoom = clamp(Math.floor(Math.min((cssW - 2 * m) / doc.width, (cssH - 2 * m) / doc.height)), 4, 64);
    panX = Math.round((cssW - doc.width * zoom) / 2);
    panY = Math.round((cssH - doc.height * zoom) / 2);
    mapDirty = true;
}

new ResizeObserver(() => {
    const r = mapCanvas.getBoundingClientRect();
    cssW = r.width;
    cssH = r.height;
    mapCanvas.width = Math.max(1, Math.round(cssW * dpr()));
    mapCanvas.height = Math.max(1, Math.round(cssH * dpr()));
    if (!fitted && cssW > 0) { fitted = true; fit(); }
    mapDirty = true;
}).observe(mapCanvas);

function drawMap() {
    const c = mctx;
    c.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    c.fillStyle = "#101014";
    c.fillRect(0, 0, cssW, cssH);
    c.imageSmoothingEnabled = false;

    const { width: W, height: H, tiles } = doc;
    const x0 = Math.max(0, Math.floor(-panX / zoom)), x1 = Math.min(W - 1, Math.floor((cssW - panX) / zoom));
    const y0 = Math.max(0, Math.floor(-panY / zoom)), y1 = Math.min(H - 1, Math.floor((cssH - panY) / zoom));

    c.font = `bold ${Math.max(9, Math.floor(zoom * 0.45))}px system-ui, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";

    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const id = tiles[y * W + x]!;
            const p = tileProps(id);
            const px = panX + x * zoom, py = panY + y * zoom;
            if (!p) { c.fillStyle = "#f0f"; c.fillRect(px, py, zoom, zoom); continue; }
            const tex = p.texture ? tryGetTexture(p.texture) : undefined;
            if (tex) c.drawImage(tex, px, py, zoom, zoom);
            else { c.fillStyle = p.solid ? p.color : "#1b1b23"; c.fillRect(px, py, zoom, zoom); }
            if (p.transparent) {
                c.strokeStyle = "rgba(120,220,255,0.9)";
                c.lineWidth = 1;
                c.strokeRect(px + 1.5, py + 1.5, zoom - 3, zoom - 3);
            }
            if (p.solid && p.height !== 1 && zoom >= 14) {
                c.fillStyle = "#000";
                c.fillText(String(p.height), px + zoom / 2 + 1, py + zoom / 2 + 1);
                c.fillStyle = "#fff";
                c.fillText(String(p.height), px + zoom / 2, py + zoom / 2);
            }
        }
    }

    if (zoom >= 10) {
        c.strokeStyle = "rgba(255,255,255,0.08)";
        c.lineWidth = 1;
        c.beginPath();
        for (let x = x0; x <= x1 + 1; x++) { const px = Math.round(panX + x * zoom) + 0.5; c.moveTo(px, panY + y0 * zoom); c.lineTo(px, panY + (y1 + 1) * zoom); }
        for (let y = y0; y <= y1 + 1; y++) { const py = Math.round(panY + y * zoom) + 0.5; c.moveTo(panX + x0 * zoom, py); c.lineTo(panX + (x1 + 1) * zoom, py); }
        c.stroke();
    }
    c.strokeStyle = "#8a8aa0";
    c.lineWidth = 1;
    c.strokeRect(panX + 0.5, panY + 0.5, W * zoom, H * zoom);

    // entities
    for (const e of doc.ents) {
        if (!inb(e.x, e.y)) continue;
        const cx = panX + (e.x + 0.5) * zoom, cy = panY + (e.y + 0.5) * zoom, r = zoom * 0.38;
        const col = ENT_STYLE[e.type].color;
        const tex = e.texture ? tryGetTexture(e.texture as TextureId) : undefined;
        if (tex) {
            c.drawImage(tex, cx - r, cy - r, r * 2, r * 2);
            c.strokeStyle = col;
            c.lineWidth = 2;
            c.strokeRect(cx - r, cy - r, r * 2, r * 2);
        } else {
            c.fillStyle = col;
            c.beginPath();
            c.arc(cx, cy, r, 0, Math.PI * 2);
            c.fill();
            if (zoom >= 14) { c.fillStyle = "#000"; c.fillText(entLetter(e), cx, cy + 1); }
        }
        if (e === selected) {
            c.strokeStyle = "#fff";
            c.lineWidth = 2;
            c.strokeRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);
        }
    }

    // preview camera
    {
        const a = pv.camera.a, fov = pv.camera.FOV;
        const cx = panX + pv.x * zoom, cy = panY + pv.y * zoom;
        c.strokeStyle = "rgba(90,220,255,0.35)";
        c.lineWidth = 1;
        c.beginPath();
        for (const s of [-1, 1]) {
            c.moveTo(cx, cy);
            c.lineTo(cx + Math.cos(a + (s * fov) / 2) * zoom * 3, cy + Math.sin(a + (s * fov) / 2) * zoom * 3);
        }
        c.stroke();
        const dx = Math.cos(a), dy = Math.sin(a), s = zoom * 0.3;
        c.fillStyle = "#5adcff";
        c.beginPath();
        c.moveTo(cx + dx * s * 1.4, cy + dy * s * 1.4);
        c.lineTo(cx - dx * s * 0.8 - dy * s * 0.8, cy - dy * s * 0.8 + dx * s * 0.8);
        c.lineTo(cx - dx * s * 0.8 + dy * s * 0.8, cy - dy * s * 0.8 - dx * s * 0.8);
        c.closePath();
        c.fill();
    }

    // hover / tool ghosts
    if (hover) {
        c.lineWidth = 1;
        if (drag?.kind === "rect" && drag.start) {
            const a = clampCell(drag.start), b = clampCell(hover);
            const rx = Math.min(a.x, b.x), ry = Math.min(a.y, b.y);
            const rw = Math.abs(a.x - b.x) + 1, rh = Math.abs(a.y - b.y) + 1;
            c.fillStyle = "rgba(255,255,255,0.18)";
            c.fillRect(panX + rx * zoom, panY + ry * zoom, rw * zoom, rh * zoom);
            c.strokeStyle = "#fff";
            c.strokeRect(panX + rx * zoom + 0.5, panY + ry * zoom + 0.5, rw * zoom, rh * zoom);
        } else if (inb(hover.x, hover.y)) {
            c.strokeStyle = "#fff";
            c.fillStyle = "rgba(255,255,255,0.15)";
            if (tool === "paint") {
                const n = clamp(Math.floor(Number(brushInput.value)) || 1, 1, 9), half = Math.floor(n / 2);
                c.fillRect(panX + (hover.x - half) * zoom, panY + (hover.y - half) * zoom, n * zoom, n * zoom);
            } else {
                c.fillRect(panX + hover.x * zoom, panY + hover.y * zoom, zoom, zoom);
                c.strokeRect(panX + hover.x * zoom + 0.5, panY + hover.y * zoom + 0.5, zoom, zoom);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Map pointer input
// ---------------------------------------------------------------------------

type Drag =
    | { kind: "pan"; sx: number; sy: number }
    | { kind: "paint" | "erase"; last: Cell }
    | { kind: "rect"; start: Cell }
    | { kind: "move"; ent: Ent; last: Cell };
let drag: (Drag & { start?: Cell }) | null = null;
let spaceDown = false;

function localPos(e: PointerEvent | WheelEvent) {
    const r = mapCanvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}
const cellAt = (px: number, py: number): Cell => ({ x: Math.floor((px - panX) / zoom), y: Math.floor((py - panY) / zoom) });

mapCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

mapCanvas.addEventListener("pointerdown", (e) => {
    mapCanvas.setPointerCapture(e.pointerId);
    const p = localPos(e);
    const c = cellAt(p.x, p.y);

    if (e.button === 1 || (e.button === 0 && spaceDown)) {
        drag = { kind: "pan", sx: p.x - panX, sy: p.y - panY };
        mapCanvas.style.cursor = "grabbing";
        e.preventDefault();
        return;
    }
    if (e.button === 2) {
        if (inb(c.x, c.y)) eraseAt(c.x, c.y);
        drag = { kind: "erase", last: clampCell(c) };
        return;
    }
    if (e.button !== 0) return;

    switch (tool) {
        case "paint":
            if (inb(c.x, c.y)) paintAt(c.x, c.y);
            drag = { kind: "paint", last: clampCell(c) };
            break;
        case "rect":
            drag = { kind: "rect", start: clampCell(c) };
            break;
        case "fill":
            floodFill(c.x, c.y, tile);
            commit();
            break;
        case "pick":
            if (inb(c.x, c.y)) { tile = doc.tiles[c.y * doc.width + c.x]!; refreshPalette(); }
            break;
        case "select": {
            const ent = inb(c.x, c.y) ? entityAt(c.x, c.y) : null;
            selected = ent;
            renderProps();
            mapDirty = true;
            if (ent) drag = { kind: "move", ent, last: c };
            break;
        }
        case "player":
        case "sprite":
        case "bot":
        case "pickup":
        case "stairs":
            placeEnt(tool, c.x, c.y);
            commit();
            onDocChanged();
            break;
        case "cam":
            if (inb(c.x, c.y)) {
                pv.x = c.x + 0.5;
                pv.y = c.y + 0.5;
                previewDirty = mapDirty = true;
            }
            break;
    }
});

mapCanvas.addEventListener("pointermove", (e) => {
    const p = localPos(e);
    const c = cellAt(p.x, p.y);
    hover = c;
    const t = inb(c.x, c.y) ? tileName(doc.tiles[c.y * doc.width + c.x]!) : "-";
    posEl.textContent = `(${c.x}, ${c.y}) ${t} · ${tool} · tile ${tile} (${tileName(tile)}) · zoom ${zoom}px`;
    mapDirty = true;
    if (!drag) return;

    switch (drag.kind) {
        case "pan":
            panX = p.x - drag.sx;
            panY = p.y - drag.sy;
            break;
        case "paint":
        case "erase": {
            const cc = clampCell(c);
            const fn = drag.kind === "paint" ? paintAt : eraseAt;
            line(drag.last, cc, fn);
            drag.last = cc;
            break;
        }
        case "move": {
            const cc = clampCell(c);
            if (cc.x !== drag.last.x || cc.y !== drag.last.y) {
                drag.ent.x = cc.x;
                drag.ent.y = cc.y;
                drag.last = cc;
                markDirty();
            }
            break;
        }
        case "rect":
            break;
    }
});

function endDrag(e: PointerEvent) {
    if (!drag) return;
    const d = drag;
    drag = null;
    mapCanvas.style.cursor = tool === "select" ? "default" : "crosshair";
    if (d.kind === "rect") {
        const p = localPos(e);
        fillRect(d.start, clampCell(cellAt(p.x, p.y)), tile);
    }
    if (d.kind !== "pan") { commit(); renderProps(); }
    mapDirty = true;
}
mapCanvas.addEventListener("pointerup", endDrag);
mapCanvas.addEventListener("pointercancel", endDrag);
mapCanvas.addEventListener("pointerleave", () => { if (!drag) { hover = null; mapDirty = true; } });

mapCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = localPos(e);
    const wx = (p.x - panX) / zoom, wy = (p.y - panY) / zoom;
    zoom = clamp(Math.round(zoom * Math.pow(1.1, -e.deltaY / 100)), 4, 80);
    panX = p.x - wx * zoom;
    panY = p.y - wy * zoom;
    mapDirty = true;
}, { passive: false });

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

window.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t === previewCanvas) {
        if (!((e.ctrlKey || e.metaKey) && t.tagName !== "INPUT")) return;
    }
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); redo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === " ") { spaceDown = true; e.preventDefault(); return; }
    if (k === "delete" || k === "backspace") { deleteSelected(); return; }
    if (k === "[") { brushInput.value = String(Math.max(1, Number(brushInput.value) - 1)); mapDirty = true; return; }
    if (k === "]") { brushInput.value = String(Math.min(9, Number(brushInput.value) + 1)); mapDirty = true; return; }
    const tl = TOOL_KEYS[k];
    if (tl) setTool(tl);
});
window.addEventListener("keyup", (e) => { if (e.key === " ") spaceDown = false; });

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

$<HTMLButtonElement>("undo").addEventListener("click", undo);
$<HTMLButtonElement>("redo").addEventListener("click", redo);
$<HTMLButtonElement>("fit").addEventListener("click", fit);
$<HTMLButtonElement>("resize").addEventListener("click", () => resizeDoc(Number(mwInput.value), Number(mhInput.value)));
$<HTMLButtonElement>("newmap").addEventListener("click", () => {
    if (!confirm("Replace the current map with a new bordered one? (Undo can bring it back.)")) return;
    const w = clamp(Math.floor(Number(mwInput.value)) || 24, 1, MAX_SIZE);
    const h = clamp(Math.floor(Number(mhInput.value)) || 24, 1, MAX_SIZE);
    replaceDoc(blankDoc(w, h, true));
});

function download(name: string, text: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$<HTMLButtonElement>("export").addEventListener("click", () => {
    download("map.json", exportJSON(doc));
    flash("Exported map.json");
});
$<HTMLButtonElement>("copy").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(exportJSON(doc));
        flash("Copied JSON to clipboard");
    } catch {
        flash("Clipboard unavailable; use Export instead", "err");
    }
});
$<HTMLButtonElement>("import").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    fileInput.value = "";
    if (!f) return;
    try {
        const { doc: d, notes } = parseDoc(await f.text());
        replaceDoc(d);
        flash(notes.length ? `Imported (${notes.join("; ")})` : `Imported ${f.name}`, notes.length ? "err" : "ok");
    } catch (err) {
        flash(`Import failed: ${(err as Error).message}`, "err");
    }
});

followInput.addEventListener("change", () => followSpawn(true));

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let lastT = performance.now();
function frame(t: number) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;

    if (levelDirty) rebuild();

    if (pvKeys.size) {
        const k = pvKeys;
        if (k.has("w") || k.has("arrowup")) pv.move(level, dt);
        else if (k.has("s") || k.has("arrowdown")) pv.move(level, -dt);
        if (k.has("a")) pv.strafe(level, -dt);
        else if (k.has("d")) pv.strafe(level, dt);
        if (k.has("q") || k.has("arrowleft")) pv.turn(-dt * 2);
        else if (k.has("e") || k.has("arrowright")) pv.turn(dt * 2);
        previewDirty = mapDirty = true;
    }

    if (mapDirty) { drawMap(); mapDirty = false; }
    if (previewDirty) { drawPreview(); previewDirty = false; }
    requestAnimationFrame(frame);
}

buildPalette();
setTool("paint");
mwInput.value = String(doc.width);
mhInput.value = String(doc.height);
renderProps();
runChecks();
followSpawn(true);
rebuild();
requestAnimationFrame(frame);
