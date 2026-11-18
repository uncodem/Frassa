
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

export class Game {
    private nav: NavGrid;
    private raycaster: Raycaster;
    private renderer: Renderer;
    private last: DOMHighResTimeStamp = 0;
    private pendingTeleport: Teleporter|null = null;
    private currentFloor: FloorState;

    private pages: number = 0;
    private hasKey: boolean = false;
    // TODO: Add catch consequences
    private caught: boolean = false;

    public bots: Bot[];
    public sprites: Sprite[];
    public pickups: Pickup[];

    public mouseTurn: number = 0;

    constructor(
        private floors: FloorState[],
        public player: Player,
        public readonly canvas: HTMLCanvasElement,
        private keyset: Set<string>,
    ) {
        this.renderer = new Renderer(canvas);

        for (const floor of this.floors) {
            floor.nav = new NavGrid(floor.level);
            floor.raycaster = new Raycaster(floor.level, this.canvas.width);
        }

        this.currentFloor = this.floors[0]!;
        this.nav = this.currentFloor.nav!;
        this.raycaster = this.currentFloor.raycaster!;
        this.nav.compute(Math.floor(this.player.x), Math.floor(this.player.y));

        this.bots = this.currentFloor.bots;
        this.sprites = this.currentFloor.sprites;
        this.pickups = this.currentFloor.pickups;
    }

    setLevel(floorNum: number) {
        if (floorNum < 0 || floorNum >= this.floors.length) throw new Error("Invalid floor destination");
        this.currentFloor = this.floors[floorNum]!;
        ({
            bots: this.bots, 
            sprites: this.sprites,
            pickups: this.pickups,
        } = this.currentFloor);
        this.nav = this.currentFloor.nav!;
        this.raycaster = this.currentFloor.raycaster!;
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

    public update = (timestamp: DOMHighResTimeStamp) => {
        const dt = Math.min((timestamp - this.last) / 1000, INPUT.MAX_DT);
        this.last = timestamp;

        let ox = Math.floor(this.player.x), oy = Math.floor(this.player.y);

        this.handleInput(dt);

        if (Math.floor(this.player.x) !== ox || Math.floor(this.player.y) !== oy) this.nav.compute(Math.floor(this.player.x), Math.floor(this.player.y));

        if (this.mouseTurn !== 0) {
            this.player.turn(this.mouseTurn);
            this.mouseTurn = 0;
        }

        this.collectPickups();
        this.caught = false;
        for (const bot of this.bots) {
            bot.update(dt, this.nav, this.player);
            this.checkCaught(bot);
        }

        const hits = this.raycaster.getFrame(this.player.x, this.player.y, this.player.camera);
        this.renderer.drawFrame(this.player, this.currentFloor.level, [...this.bots, ...this.sprites, ...this.pickups], hits);

        this.renderer.ctx.font = "24px monospace";
        this.renderer.ctx.fillStyle = "white";
        this.renderer.ctx.fillText(`Pages: ${this.pages}${this.hasKey ? " | key" : ""}`, 8, 32);
        this.renderer.ctx.fillStyle = "red";
        this.renderer.ctx.fillText(`${this.caught ? "Caught!" : ""}`, 8, 52);

        if (this.pendingTeleport) {
            this.handleTeleport(this.pendingTeleport);
            this.pendingTeleport = null;
        }

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

    private checkCaught(b: Bot) {
        if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < GAME.CATCH_RADIUS)
            this.caught = true;
    }

}

