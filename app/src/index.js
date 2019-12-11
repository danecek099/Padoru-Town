"use strict";

import * as PIXI from 'pixi.js';
import Smoothie from "pixi-smoothie";
import Keyboard from "pixi.js-keyboard";
import S from "./clientProperties";
import io from "socket.io-client";

class Padoru {
    constructor(x, y, s, icon) {
        this.x = x;
        this.y = y;
        this.s = s;
        this.icon = icon;

        this.r = new PIXI.Container();
        this.sprite = new PIXI.Sprite.from(icon);
        this.sprite.width = this.s;
        this.sprite.height = this.s;
        this.r.addChild(this.sprite);

        this.r.x = this.x;
        this.r.y = this.y;
        this.r.radius = this.s / 2 + 2;
        this.circular = true;
    }
    get dims() {
        return {
            x: this.r.x,
            y: this.r.y,
            xs: this.r.x + this.s,
            ys: this.r.y + this.s
        }
    }
}

class Game {
    constructor() {
        this.renderer = new PIXI.WebGLRenderer({
            // antialias: true,
            powerPreference: "high-performance",
            resolution: S.resolution,
        });
        this.renderer.view.style.position = "absolute";
        // this.renderer.view.style.display = "block";
        this.renderer.view.style.zIndex = 1;
        this.renderer.autoResize = true;
        this.renderer.resize(window.innerWidth, window.innerHeight);
        this.renderer.plugins.interaction.moveWhenInside = true;

        this.renderer.view.style.display = "none";
        document.body.appendChild(this.renderer.view);

        this.mainStage = new PIXI.Container();
        this.gameCont = new PIXI.Container();
        this.mainStage.addChild(this.gameCont);

        this.back = null;
        this.padoru = null;

        window.addEventListener("resize", this.sizr.bind(this));
        this.inp = document.getElementById("nameInput");
        this.playButt = document.getElementById("playButton");
        this.loginContainer = document.getElementById("loginContainer");

        this.sizr();

        this.smoothie = new Smoothie({
            engine: PIXI,
            renderer: this.renderer,
            root: this.mainStage,
            update: this.update.bind(this),
            fps: 15,
            renderFps: 60,
            properties: {
                position: true,
                rotation: false,
                alpha: false,
                scale: false,
                size: false,
                tile: false
            }
        })
        this.smoothie.start();

        const promArr = [
            // new Promise((jo) => {
            //     const conn = () => {
            //         this.socket = io({
            //             path: "/s1", 
            //             transports: ['websocket'],
            //             // parser: JSONParser
            //         });

            //         const intr = setInterval(() => {
            //             clearInterval(intr);
            //             this.socket.close();
            //             console.log("new conn try");
                        
            //             conn();
            //         }, 3000);
    
            //         this.socket.on("connect", () => {
            //             clearInterval(intr);
            //             jo();
            //         });
            //     }

            //     conn();

            // }),
            new Promise((jo) => {
                S.importList.forEach(a => PIXI.loader.add(a.name, a.dir));
                let progress = 0;
                PIXI.loader.onProgress.add(() => {
                    progress++;
                    const percent = progress / S.importList.length * 100;
                    // console.log(percent);
                });
                PIXI.loader.load((loader, resources) => {
                    jo();
                });
            })
        ];

        const startGame = () => {
            this.gameInit();
            this.setIo();

            this.playButt.removeEventListener("click", startGame);
        };

        Promise.all(promArr).then(() => {
            // this.gameInit();
            // this.setIo();
            this.playButt.classList.remove("w3-disabled");
            this.playButt.addEventListener("click", startGame);
        });
    }

    update() {
        Keyboard.update();

        if (Keyboard.isKeyDown("KeyW")) {
            this.padoru.r.y -= S.moveSpeed;
        }
        if (Keyboard.isKeyDown("KeyS")) {
            this.padoru.r.y += S.moveSpeed;
        }
        if (Keyboard.isKeyDown("KeyA")) {
            this.padoru.r.x -= S.moveSpeed;
        }
        if (Keyboard.isKeyDown("KeyD")) {
            this.padoru.r.x += S.moveSpeed;
        }

        if(this.padoru) {
            const dims = this.padoru.dims;
            
            if(dims.x < -this.gameCont.x) {
                if (this.gameCont.x + S.moveSpeed < 0) {
                    this.gameCont.x += S.moveSpeed;
                } else {
                    this.padoru.r.x += S.moveSpeed;
                }
            }
            
            if(dims.y < -this.gameCont.y) {
                if (this.gameCont.y + S.moveSpeed < 0) {
                    this.gameCont.y += S.moveSpeed;
                } else {
                    this.padoru.r.y += S.moveSpeed;
                }
            }
            
            if (dims.xs > this.borderW - this.gameCont.x) {
                if (this.gameCont.x - S.moveSpeed > this.borderW - this.back.width) {
                    this.gameCont.x -= S.moveSpeed;
                } else {
                    this.padoru.r.x -= S.moveSpeed;
                }
            }

            if (dims.ys > this.borderH - this.gameCont.y) {
                if (this.gameCont.y - S.moveSpeed > this.borderH - this.back.height) {
                    this.gameCont.y -= S.moveSpeed;
                } else {
                    this.padoru.r.y -= S.moveSpeed;
                }
            }
        }

        if (this.gameCont.left) { // doleva
            this.gameCont.vx = S.moveSpeed;
            this.gameCont.changed = true;
        }
        if (this.gameCont.up) { // nahoru
            this.gameCont.vy = S.moveSpeed;
            this.gameCont.changed = true;
        }
        if (this.gameCont.right) { // doprava
            this.gameCont.vx = -S.moveSpeed;
            this.gameCont.changed = true;
        }
        if (this.gameCont.down) { // dolu
            this.gameCont.vy = -S.moveSpeed;
            this.gameCont.changed = true;
        }
        if (!this.gameCont.changed) {
            this.gameCont.vx = this.gameCont.vy = 0;
        } else {
            this.gameCont.x += this.gameCont.vx;
            this.gameCont.y += this.gameCont.vy;

            if (this.gameCont.x > 0) this.gameCont.x = 0;
            if (this.gameCont.y > 0) this.gameCont.y = 0;
            if (this.gameCont.x < this.borderW - this.back.width) this.gameCont.x = this.borderW - this.back.width;
            if (this.gameCont.y < this.borderH - this.back.height) this.gameCont.y = this.borderH - this.back.height;

            this.gameCont.vx = this.gameCont.vy = 0;
        }
    }

    gameInit() {
        this.renderer.style.display = "block";
        this.loginContainer.style.display = "none";

        this.back = PIXI.Sprite.from("mainBack");
        this.gameCont.addChild(this.back);

        this.padoru = new Padoru(100, 100, 250, "padoruBlue");
        this.gameCont.addChild(this.padoru.r);
    }

    setIo() {
        const s = this.socket;
        s.on("start", (data) => {
            // console.log("start");

            this.initGame();

            data.a.forEach((data) => {
                this.antBase(data);
            });
            data.g.forEach((gameO) => {
                this.gameObject(gameO);
            });
        });

        const name = this.getName();
        this.inp.value = name ? name : this.socket.id.substr(5, 8);

        s.emit("ready");
    }

    sizr() {
        console.log("resize");
        const aspectRatio = this.renderer.width / this.renderer.height;
        if (aspectRatio > 1) this.scaleRatio = this.renderer.height / S.visibleArea;
        else this.scaleRatio = this.renderer.width / S.visibleArea;

        this.scaleRatioRes = this.scaleRatio * S.resolution;
        this.borderW = this.renderer.width / this.scaleRatioRes;
        this.borderH = this.renderer.height / this.scaleRatioRes;

        this.mainStage.scale.set(this.scaleRatio, this.scaleRatio);
    }
}

window.game = new Game();