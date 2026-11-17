
import { Level } from "./level";
import { Player } from "./player";
import { Bot } from "./bot";
import { Sprite, Pickup } from "./sprite";
import { NavGrid } from "./nav";
import { Raycaster } from "./raycaster";
import { Renderer } from "./renderer";

import type { PickupKind } from "./sprite";

export class Game {
    private nav: NavGrid;
    private raycaster: Raycaster;
    private renderer: Renderer;
    private last: DOMHighResTimeStamp = 0;

    private pages: number = 0;
    private hasKey: boolean = false;
    
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
        const dt = Math.min((timestamp - this.last) / 1000, 0.05);
        this.last = timestamp;

        let ox = Math.floor(this.player.x), oy = Math.floor(this.player.y);

        this.handleInput(dt);

        if (Math.floor(this.player.x) !== ox || Math.floor(this.player.y) !== oy) this.nav.compute(Math.floor(this.player.x), Math.floor(this.player.y));

        if (this.mouseTurn !== 0) {
            this.player.turn(this.mouseTurn);
            this.mouseTurn = 0;
        }

        for (const bot of this.bots) bot.update(dt, this.nav);

        const hits = this.raycaster.getFrame(this.player.x, this.player.y, this.player.camera);
        this.renderer.drawFrame(this.player, this.currentLevel, [...this.bots, ...this.sprites], hits);

        window.requestAnimationFrame(this.update);
    }

    private collectPickups() {
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            if (Math.hypot(p.x - this.player.x, p.y - this.player.y) > PICKUP_RADIUS) continue;
            this.pickups.splice(i, 1);
            this.onPickup(p.kind);
        }
    }

    private onPickup(kind: PickupType) {
        switch (kind) {
            case PickupType.Page: this.pages++; break;
            case PickupType.Key: this.hasKey = true;
        }
    }

}

