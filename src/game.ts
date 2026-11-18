
import { Level } from "./level";
import { Player } from "./player";
import { Bot } from "./bot";
import { Sprite, Pickup, PickupType, Teleporter } from "./sprite";
import { NavGrid } from "./nav";
import { Raycaster } from "./raycaster";
import { Renderer } from "./renderer";

import { GAME, INPUT } from "./constants";

const CATCH_RADIUS = 0.5;

export class Game {
    private nav: NavGrid;
    private raycaster: Raycaster;
    private renderer: Renderer;
    private last: DOMHighResTimeStamp = 0;
    private pendingTeleport: Teleporter|null = null;

    private pages: number = 0;
    private hasKey: boolean = false;
    // TODO: Add catch consequences
    private caught: boolean = false;

    public mouseTurn: number = 0;

    constructor(
        public currentLevel: Level,
        public player: Player,
        public bots: Bot[],
        public sprites: Sprite[],
        public pickups: Pickup[],
        public readonly canvas: HTMLCanvasElement,
        private keyset: Set<string>,
    ) {
        this.renderer = new Renderer(canvas);
        this.nav = new NavGrid(currentLevel);
        this.raycaster = new Raycaster(currentLevel, this.canvas.width);
        this.nav.compute(Math.floor(this.player.x), Math.floor(this.player.y));
    }

    setLevel(level: Level) {
        // TODO: Add support for player spawn, other mapCommands
        this.currentLevel = level;
        this.nav = new NavGrid(level);
        this.raycaster = new Raycaster(this.currentLevel, this.canvas.width);

        this.nav.compute(Math.floor(this.player.x), Math.floor(this.player.y));
    }

    handleInput(dt: number) {
        if (this.keyset.has("w")) this.player.move(this.currentLevel, dt);
        else if (this.keyset.has("s")) this.player.move(this.currentLevel, -dt);

        if (this.keyset.has("a")) this.player.strafe(this.currentLevel, -dt);
        else if (this.keyset.has("d")) this.player.strafe(this.currentLevel, dt);

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
        this.renderer.drawFrame(this.player, this.currentLevel, [...this.bots, ...this.sprites, ...this.pickups], hits);

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
        // TODO: Allow different floor teleports
        this.player.x = p.tx;
        this.player.y = p.ty;
        if (p.floor === -1) this.nav.compute(Math.floor(this.player.x), Math.floor(this.player.y));
        if (p.angle) this.player.setAngle(p.angle);
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

