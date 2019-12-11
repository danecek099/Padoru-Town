"use strict";

import * as PIXI from 'pixi.js';
import Smoothie from "pixi-smoothie";
import Keyboard from "pixi.js-keyboard";
import S from "./clientProperties";
import io from "socket.io-client";

class Padoru {
    constructor(data) {
        this.id = data.id;

        this.x = data.x;
        this.y = data.y;
        this.s = data.s;
        this.icon = data.icon;
        this.name = data.name;

        this.r = new PIXI.Container();
        this.sprite = new PIXI.Sprite.from(this.icon);
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
    suicide() {
        this.r.destroy();
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
        this.padoruArr = [];
        this.name = this.getName();

        window.addEventListener("resize", this.sizr.bind(this));
        this.inp = document.getElementById("playerName");
        this.inp.value = this.name || "";
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
            new Promise((jo) => {
                const conn = () => {
                    this.socket = io("http://localhost", {
                        path: "/s1",
                        transports: ['websocket'],
                        // parser: JSONParser
                    });

                    const intr = setInterval(() => {
                        clearInterval(intr);
                        this.socket.close();
                        console.log("new conn try");
                        
                        conn();
                    }, 3000);
    
                    this.socket.on("connect", () => {
                        clearInterval(intr);
                        jo();
                    });
                }

                conn();

            }),
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
            // this.gameInit();
            this.setIo();

            if(!this.name) {
                const inp = this.inp.value;
                if(inp == "") {
                    this.name = this.socket.id.substr(5, 8);
                } else {
                    this.name = inp;
                    this.saveName(inp);
                }
            }

            this.playButt.removeEventListener("click", startGame);
        };

        Promise.all(promArr).then(() => {
            this.playButt.classList.remove("w3-disabled");
            this.playButt.addEventListener("click", startGame);
        });
    }

    update() {
        Keyboard.update();

        if (this.padoru) {
            let vx = 0;
            let vy = 0;

            if (Keyboard.isKeyDown("KeyW")) {
                vy = -S.moveSpeed;
            }
            if (Keyboard.isKeyDown("KeyS")) {
                vy = S.moveSpeed;
            }
            if (Keyboard.isKeyDown("KeyA")) {
                vx = -S.moveSpeed;
            }
            if (Keyboard.isKeyDown("KeyD")) {
                vx = S.moveSpeed;
            }
            
            const dims = this.padoru.dims;

            if (dims.x < -this.gameCont.x) {
                if (this.gameCont.x + S.moveSpeed < 0) {
                    this.gameCont.x += S.moveSpeed;
                } else {
                    vx += S.moveSpeed;
                }
            }
            
            if (dims.y < -this.gameCont.y) {
                if (this.gameCont.y + S.moveSpeed < 0) {
                    this.gameCont.y += S.moveSpeed;
                } else {
                    vy += S.moveSpeed;
                }
            }
            
            if (dims.xs > this.borderW - this.gameCont.x) {
                if (this.gameCont.x - S.moveSpeed > this.borderW - this.back.width) {
                    this.gameCont.x -= S.moveSpeed;
                } else {
                    vx -= S.moveSpeed;
                }
            }

            if (dims.ys > this.borderH - this.gameCont.y) {
                if (this.gameCont.y - S.moveSpeed > this.borderH - this.back.height) {
                    this.gameCont.y -= S.moveSpeed;
                } else {
                    vy -= S.moveSpeed;
                }
            }

            if (vx != 0 || vy != 0) {
                this.padoru.r.x += vx;
                this.padoru.r.y += vy;

                this.socket.emit("move", {
                    x: this.padoru.r.x,
                    y: this.padoru.r.y
                });
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

    gameInit(data) {
        this.back = PIXI.Sprite.from("mainBack");
        this.gameCont.addChild(this.back);

        this.padoru = new Padoru({
            id: this.socket.id,
            x: 100,
            y: 100,
            s: 250,
            icon: "padoruBlue",
            name: this.name
        });
        this.gameCont.addChild(this.padoru.r);

        for (const p of data) {
            const padoru = new Padoru(p);
            this.gameCont.addChild(padoru.r);
            this.padoruArr.push(padoru);
        }

        this.renderer.view.style.display = "block";
        this.loginContainer.style.display = "none";
    }

    setIo() {
        const s = this.socket;
        s.on("start", (data) => {
            console.log("start", data);

            this.gameInit(data);
        });
        s.on("show", data => console.log(data));
        s.on("connect", data => {
            console.log("(re)connected");
            s.emit("ready");
        });
        s.on("new", data => {
            if (data.id != this.socket.id) {
                console.log("new", data);
    
                const padoru = new Padoru(data);
                this.gameCont.addChild(padoru.r);
                this.padoruArr.push(padoru);
            }
        });
        s.on("move", data => {
            if(data.id != this.socket.id) {
                console.log("move", data);
            }
        });
        s.on("dis", data => {
            console.log("dis", data);

            for (let i = 0; i < this.padoruArr.length; i++) {
                console.log(i, this.padoru[i]);
                if (this.padoruArr[i].id == data.id) {
                    console.log(i, this.padoru[i]);
                    this.padoru[i].suicide();
                    this.padoruArr.splice(i, 1);
                    return;
                }
            }
        });

        s.emit("ready", {name: this.name});
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

    getName() {
        const cookie = document.cookie.replace(/(?:(?:^|.*;\s*)playaName\s*\=\s*([^;]*).*$)|^.*$/, "$1");

        return cookie ? cookie : null;
    }

    saveName(name) {
        document.cookie = `playaName=${name}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
    }

    test() {
        this.padoru.suicide();
        this.padoru = new Padoru(100, 100, 250, "padoruBlue");
        this.gameCont.addChild(this.padoru.r);
    }
}

window.onload = function() {
    window.game = new Game();
}