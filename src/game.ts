
import { Level } from "./level";
import { Player } from "./player";
import { Bot } from "./bot";
import { Sprite, Pickup, PickupType, Teleporter } from "./sprite";
import { NavGrid } from "./nav";
import { Raycaster } from "./raycaster";
import { Renderer } from "./renderer";

import { GAME, INPUT } from "./constants";

const CATCH_RADIUS = 0.5;

export interface FloorState {
    level: Level;
    bots: Bot[];
    sprites: Sprite[];
    pickups: Pickup[];
    nav?: NavGrid;
    raycaster?: Raycaster;
}

export type Phase = "boot" | "title" | "playing" | "paused" | "won" | "lost";

export class Game {
    private renderer: Renderer;
    private last: DOMHighResTimeStamp = 0;
    private pendingTeleport: Teleporter|null = null;
    private currentFloor!: FloorState;

    public phase: Phase = "boot";
    public phaseSince: number = 0;
    public elapsed: number = 0;
    public onPhaseChange: (p: Phase) => void = () => {};

    private pages: number = 0;
    private hasKey: boolean = false;

    public mouseTurn: number = 0;

    get raycaster(): Raycaster { return this.currentFloor.raycaster!; }
    get nav(): NavGrid { return this.currentFloor.nav!; }
    get bots(): Bot[] { return this.currentFloor.bots; }
    get sprites(): Sprite[] { return this.currentFloor.sprites; }
    get pickups(): Pickup[] { return this.currentFloor.pickups; }

    constructor(
        private floors: FloorState[],
        public player: Player,
        public readonly canvas: HTMLCanvasElement,
        private keyset: Set<string>,
    ) {
        this.renderer = new Renderer(canvas);
        this.load(floors, player);
    }

    private load(floors: FloorState[], player: Player) {
        this.floors = floors;
        this.player = player;

        for (const floor of this.floors) {
            floor.nav = new NavGrid(floor.level);
            floor.raycaster = new Raycaster(floor.level, this.canvas.width);
        }

        this.pages = 0;
        this.hasKey = false;
        this.elapsed = 0;
        this.mouseTurn = 0;
        this.pendingTeleport = null;

        this.setLevel(0);
    }

    public reset(floors: FloorState[], player: Player) {
        this.load(floors, player);
        this.setPhase("title");
    }

    public setPhase(p: Phase) {
        this.phase = p;
        this.phaseSince = performance.now();
        this.onPhaseChange(p);
    }

    public startRun() { this.elapsed = 0; this.mouseTurn = 0; this.setPhase("playing"); }
    public resume() { this.mouseTurn = 0; this.setPhase("playing"); }
    public win() { this.setPhase("won"); }
    public lose() { this.setPhase("lost"); }

    setLevel(floorNum: number) {
        if (floorNum < 0 || floorNum >= this.floors.length) throw new Error("Invalid floor destination");
        this.currentFloor = this.floors[floorNum]!;
        this.nav.compute(Math.floor(this.player.x), Math.floor(this.player.y));
    }

    handleInput(dt: number) {
        const level = this.currentFloor.level
        if (this.keyset.has("w")) this.player.move(level, dt);
        else if (this.keyset.has("s")) this.player.move(level, -dt);

        if (this.keyset.has("a")) this.player.strafe(level, -dt);
        else if (this.keyset.has("d")) this.player.strafe(level, dt);

        if (this.keyset.has("arrowleft")) this.player.turn(-dt);
        else if (this.keyset.has("arrowright")) this.player.turn(dt);
    }

    private step(dt: number) {
        this.elapsed += dt;

        let ox = Math.floor(this.player.x), oy = Math.floor(this.player.y);

        this.handleInput(dt);

        if (Math.floor(this.player.x) !== ox || Math.floor(this.player.y) !== oy) this.nav.compute(Math.floor(this.player.x), Math.floor(this.player.y));

        if (this.mouseTurn !== 0) {
            this.player.turn(this.mouseTurn);
            this.mouseTurn = 0;
        }

        this.collectPickups();
        let caught = false;
        for (const bot of this.bots) {
            bot.update(dt, this.nav, this.player);
            if (this.checkCaught(bot)) caught = true;
        }

        if (caught) {
            this.pendingTeleport = null;
            this.lose();
        }

        if (this.pendingTeleport) {
            this.handleTeleport(this.pendingTeleport);
            this.pendingTeleport = null;
        }

    }

    private draw() {
        const hits = this.raycaster.getFrame(this.player.x, this.player.y, this.player.camera);
        this.renderer.drawFrame(this.player, this.currentFloor.level, [...this.bots, ...this.sprites, ...this.pickups], hits);

        if (this.phase === "playing") {
            this.renderer.ctx.font = "24px monospace";
            this.renderer.ctx.fillStyle = "white";
            this.renderer.ctx.fillText(`Pages: ${this.pages}${this.hasKey ? " | key" : ""}`, 8, 32);
        } else if (this.phase === "paused") {
            this.renderer.ctx.fillStyle = "rgba(0,0,0,0.7)";
            this.renderer.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
            this.renderer.ctx.font = "24px monospace";
            this.renderer.ctx.fillStyle = "white";
            this.renderer.ctx.fillText("Paused", 8, 32);
        }
    }

    public update = (timestamp: DOMHighResTimeStamp) => {
        const dt = Math.min((timestamp - this.last) / 1000, INPUT.MAX_DT);
        this.last = timestamp;

        if (this.phase === "playing") this.step(dt);
        this.draw();

        window.requestAnimationFrame(this.update);
    }

    private collectPickups() {
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i]!;
            if (Math.hypot(p.x - this.player.x, p.y - this.player.y) > GAME.PICKUP_RADIUS) continue;

            if (p.kind === PickupType.Teleporter) {
                this.pendingTeleport ??= p as Teleporter;
                continue;
            }

            this.pickups.splice(i, 1);
            this.onPickup(p);
        }
    }

    private handleTeleport(p: Teleporter) {
        this.player.x = p.tx;
        this.player.y = p.ty;
        if (p.angle !== undefined) this.player.setAngle(p.angle);

        if (p.floor === -1) this.nav.compute(Math.floor(this.player.x), Math.floor(this.player.y));
        else this.setLevel(p.floor);
    }

    private onPickup(p: Pickup) {
        switch (p.kind) {
            case PickupType.Page: this.pages++; break;
            case PickupType.Key: this.hasKey = true; break;
        }
    }

    private checkCaught(b: Bot): boolean {
        return (Math.hypot(b.x - this.player.x, b.y - this.player.y) < GAME.CATCH_RADIUS);
    }

}

