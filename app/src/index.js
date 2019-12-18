"use strict";

import * as PIXI from 'pixi.js';
import Smoothie from "pixi-smoothie";
import Keyboard from "pixi.js-keyboard";
import S from "./clientProperties";
import io from "socket.io-client";
import {Howl} from 'howler';
import "pixi-plugin-bump";

class Padoru {
    constructor(data) {
        this.id = data.id;

        this.x = data.x;
        this.y = data.y;
        this.s = 200;
        this.name = data.name;
        this.activeSprite = null;

        this.r = new PIXI.Container();
        this.r.x = this.x;
        this.r.y = this.y;

        this.nameText = new PIXI.Text(this.name, {
            fontSize: 16,
            fontWeight: "700",
            fill: 0xffffff
        });
        this.nameText.x = - this.nameText.width / 2;
        this.nameText.y = - this.s / 2 - 20;
        this.r.addChild(this.nameText);

        // this.border = new PIXI.Graphics();
        // this.border.lineStyle(4, 0x1b1bcf, 1);
        // this.border.drawRect(-this.s/2, -this.s/2, this.s, this.s);
        // this.r.addChild(this.border);

    }
    get dims() {
        return {
            x: this.r.x - this.s / 2,
            y: this.r.y - this.s / 2,
            xs: this.r.x + this.s / 2,
            ys: this.r.y + this.s / 2
        }
    }
    makeTexture(sprite) {
        const s = new PIXI.Sprite.from(sprite);
        s.width = this.s;
        s.height = this.s;
        s.visible = false;
        s.pivot.x = this.s / 2;
        s.pivot.y = this.s / 2;

        return s;
    }
    suicide() {
        this.r.destroy();
    }
    move(x, y) {
        if(!this.actionIntr && x != this.r.x)
            if(x > this.r.x) {
                this.setSprite("right");
            } else {
                this.setSprite("left");
            }

        this.r.x = x;
        this.r.y = y;
    }
    setSprite(type, xScale = 1) {
        this.spriteObj[type].visible = true;
        this.spriteObj[type].scale.x *= xScale;
        this.activeSprite = type;

        for (const key in this.spriteObj) {
            if (key != type && this.spriteObj.hasOwnProperty(key)) {
                this.spriteObj[key].visible = false;
                if (this.spriteObj[key].scale.x < 0) this.spriteObj[key].scale.x *= -1;
            }
        }
    }
    chat(text) {
        const textt = new PIXI.Text(text, {
            fontSize: 16,
            fontWeight: "400",
            fill: 0xffffff
        });
        textt.x = -textt.width / 2;
        textt.y = -this.s / 2 - 50;

        const chatBox = new PIXI.Graphics();
        chatBox.beginFill(0x808599);
        chatBox.alpha = .6;
        chatBox.drawRoundedRect(textt.x - 8, textt.y - 8, textt.width + 16, textt.height + 16, 5);
        chatBox.endFill();

        this.r.addChild(chatBox, textt);

        setTimeout(() => {
            chatBox.destroy();
            textt.destroy();
        }, 3000);
    }

    action1() {}

    action2() {}
}

class Present {
    constructor(x, y, xScale) {
        this.sprite = new PIXI.Sprite.from("present");
        this.sprite.x = x;
        this.sprite.y = y;
        this.sprite.pivot.x = this.sprite.width / 2;
        this.sprite.pivot.y = this.sprite.height / 2;
        this.sprite.scale.x *= xScale;
        this.gameCont.addChild(this.sprite);

        const borderH = this.gameCont.height;
        const borderW = this.gameCont.width;

        const intr = setInterval(() => {
            this.sprite.x += 35 * xScale;

            if(this.sprite.x < 0 || this.sprite.x > borderW) {
                clearInterval(intr);
                this.sprite.destroy();
            }
        }, 50);
    }
}

class PadoruOriginal extends Padoru {
    constructor(eurobeat) {
        super(eurobeat);

        this.spriteObj = {
            right: this.makeTexture("padoruOriginalRight"),
            back: this.makeTexture("padoruOriginalBack"),
            left: this.makeTexture("padoruOriginalLeft"),
            front: this.makeTexture("padoruOriginalFront"),

            presentThrow1: this.makeTexture("presentThrow1"),
            presentThrow2: this.makeTexture("presentThrow2"),
            presentThrow3: this.makeTexture("presentThrow3"),
            presentThrow4: this.makeTexture("presentThrow4")
        };
        this.spriteObj.right.visible = true;
        this.activeSprite = "right";

        for (const key in this.spriteObj) {
            if (this.spriteObj.hasOwnProperty(key)) {
                this.r.addChild(this.spriteObj[key]);
            }
        }

        this.action1Arr = [
            "right",
            "back",
            "left",
            "front",
            "right",
            "back",
            "left",
            "front",
            "right"
        ];

        this.action2Arr = [
            "presentThrow1",
            "presentThrow2",
            "presentThrow3",
            "presentThrow4"
        ];
    }

    action1() {
        if(!this.actionIntr) {
            const iterator = this.action1Arr.values();
    
            this.actionIntr = setInterval(() => {
                const result = iterator.next();
    
                if(!result.done) {
                    this.setSprite(result.value);
                } else {
                    clearInterval(this.actionIntr);
                    this.actionIntr = null;
                }
            }, 250);

            return true;
        }

        return false;
    }
    action2() {
        if (!this.actionIntr) {
            const iterator = this.action2Arr.values();

            const lastSprite = this.activeSprite;

            this.actionIntr = setInterval(() => {
                const result = iterator.next();

                if (!result.done) {
                    this.setSprite(result.value, lastSprite == "right" ? 1 : -1);
                } else {
                    this.setSprite(lastSprite);
                    clearInterval(this.actionIntr);
                    this.actionIntr = null;
                    new Present(this.r.x, this.r.y, lastSprite == "right" ? 1 : -1);
                }
            }, 200);

            return true;
        }

        return false;
    }
}

class Game {
    constructor() {
        this.renderer = new PIXI.WebGLRenderer({
            antialias: true,
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

        Present.prototype.gameCont = this.gameCont;

        this.back = null;
        this.padoru = null;
        this.padoruArr = [];
        this.spawnData = {
            x: 0,
            y: 0,
            s: 200
        };
        this.gameInitDone = false;
        this.roomUpdate = null;
        this.name = this.getName();
        this.keysInUse = false;
        this.roomIntr = null;
        
        this.b = new PIXI.extras.Bump();

        window.addEventListener("resize", this.sizr.bind(this));
        this.inp = document.getElementById("playerName");
        this.inp.value = this.name || "";
        this.playButt = document.getElementById("playButton");
        this.chatBox = document.getElementById("chatBox");
        this.chat = document.getElementById("chat");

        this.sizr();

        this.smoothie = new Smoothie({
            engine: PIXI,
            renderer: this.renderer,
            root: this.mainStage,
            update: this.update.bind(this),
            fps: 15,
            // renderFps: 60,
            properties: {
                position: true,
                rotation: false,
                alpha: false,
                scale: false,
                size: false,
                tile: false
            }
        });
        this.smoothie.start();

        const promArr = [
            new Promise((jo) => {
                const conn = () => {
                    // this.socket = io("http://localhost", {
                    this.socket = io({
                        path: "/s1",
                        transports: ['websocket'],
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

        this.padoruSound = new Howl({
            src: ['assets/padoruSound.mp3'],
            volume: .5
        });
        this.slapSound = new Howl({
            src: ['assets/slapSound.wav'],
            volume: .5
        });
        this.kannaSound = new Howl({
            src: ['assets/kanna3.mp3'],
            volume: .5
        });

        const startGame = () => {
            const inp = this.inp.value;
            if(inp == "") {
                if(!this.name)
                    this.name = this.socket.id.substr(5, 8);
            } else {
                this.name = inp;
                this.saveName(inp);
            }

            this.playButt.removeEventListener("click", startGame);
            this.setIo();
        };

        Promise.all(promArr).then(() => {
            this.playButt.classList.remove("w3-disabled");

            this.playButt.innerHTML = "Play";
            this.playButt.addEventListener("click", startGame);
        });
    }

    update() {
        Keyboard.update();
        this.roomUpdate && this.roomUpdate();

        if (this.padoru) {
            let vx = 0;
            let vy = 0;

            if (!this.keysInUse && Keyboard.isKeyDown("KeyW")) {
                vy = -S.moveSpeed;
            }
            if (!this.keysInUse && Keyboard.isKeyDown("KeyS")) {
                vy = S.moveSpeed;
            }
            if (!this.keysInUse && Keyboard.isKeyDown("KeyA")) {
                vx = -S.moveSpeed;
            }
            if (!this.keysInUse && Keyboard.isKeyDown("KeyD")) {
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
            if (this.gameCont.x > 0) {
                this.gameCont.x = 0;
            }
            
            if (dims.y < -this.gameCont.y) {
                if (this.gameCont.y + S.moveSpeed < 0) {
                    this.gameCont.y += S.moveSpeed;
                } else {
                    vy += S.moveSpeed;
                }
            }
            if (this.gameCont.y > 0) {
                this.gameCont.y = 0;
            }
            
            if (dims.xs > this.borderW - this.gameCont.x) {
                if (this.gameCont.x - S.moveSpeed > this.borderW - this.back.width) {
                    this.gameCont.x -= S.moveSpeed;
                } else {
                    vx -= S.moveSpeed;
                }
            }
            if (this.gameCont.x < this.borderW - this.back.width) {
                this.gameCont.x = this.borderW - this.back.width;
            }

            if (dims.ys > this.borderH - this.gameCont.y) {
                if (this.gameCont.y - S.moveSpeed > this.borderH - this.back.height) {
                    this.gameCont.y -= S.moveSpeed;
                } else {
                    vy -= S.moveSpeed;
                }
            }
            if (this.gameCont.y < this.borderH - this.back.height) {
                this.gameCont.y = this.borderH - this.back.height;
            }

            if (vx != 0 || vy != 0) {
                this.padoru.move(this.padoru.r.x + vx, this.padoru.r.y + vy);

                this.socket.emit("move", {
                    x: this.padoru.r.x,
                    y: this.padoru.r.y
                });
            }
        }
    }

    gameInit() {
        Keyboard.events.on('pressed_Digit1', null, (keyCode, event) => {
            if (!this.keysInUse && this.padoru.action1()) {
                this.padoruSound.play();
                this.socket.emit("action1");
            }
        });
        Keyboard.events.on('pressed_Digit2', null, (keyCode, event) => {
            if (!this.keysInUse && this.padoru.action2()) {
                this.socket.emit("action2");
            }
        });
        Keyboard.events.on('pressed_Enter', null, (keyCode, event) => {            
            if (this.chatBox.style.display == "none") {
                this.keysInUse = true;
                this.chatBox.style.display = "block";
                this.chat.focus();
            } else {
                this.keysInUse = false
                this.chatBox.style.display = "none";

                this.padoru.chat(this.chat.value);
                this.socket.emit("chat", this.chat.value);
                this.chat.value = "";
            }

        });

        this.renderer.view.style.display = "block";
        this.gameInitDone = true;
    }

    room1init(data) {
        this.padoruArr.length = 0;
        this.spawnData.x = 550;
        this.spawnData.y = 620;
        clearInterval(this.roomIntr);
        this.roomIntr = null;

        this.back = PIXI.Sprite.from("mainBack");
        this.gameCont.addChild(this.back);

        const sign = new PIXI.Sprite.from("pepeSign");
        sign.x = 900;
        sign.y = 400;
        sign.width = 150;
        sign.height = 150;
        sign.interactive = true;
        sign.buttonMode = true;
        sign.on("click", () => this.changeRoom(2));
        this.gameCont.addChild(sign);

        const classS = new PIXI.Sprite.from("classSign");
        classS.x = 300;
        classS.y = 400;
        classS.width = 150;
        classS.height = 150;
        classS.interactive = true;
        classS.buttonMode = true;
        classS.on("click", () => this.changeRoom(4));
        this.gameCont.addChild(classS);

        const beach = new PIXI.Sprite.from("beachSign");
        beach.x = 600;
        beach.y = 900;
        beach.width = 150;
        beach.height = 150;
        beach.interactive = true;
        beach.buttonMode = true;
        beach.on("click", () => this.changeRoom(5));
        this.gameCont.addChild(beach);

        this.padoru = this.newPadoru({x: 0, y: 0, icon: "padoruOriginal", name: this.name});
        this.gameCont.addChild(this.padoru.r);

        for (const p of data) {
            const padoru = this.newPadoru(p);
            this.gameCont.addChild(padoru.r);
            this.padoruArr[padoru.id] = padoru;
        }

        if(!this.gameInitDone) this.gameInit();
    }

    room2init(data) {
        this.padoruArr.length = 0;
        this.spawnData.x = 1000;
        this.spawnData.y = 650;
        clearInterval(this.roomIntr);
        this.roomIntr = null;

        this.gameCont.removeChildren();
        this.padoruArr = [];

        this.back = PIXI.Sprite.from("pepeBack");
        const backSlap = PIXI.Sprite.from("pepeBackSlap");
        backSlap.visible = false;
        this.gameCont.addChild(this.back, backSlap);

        const sign = new PIXI.Sprite.from("spawnSign");
        sign.x = 1730;
        sign.y = 760;
        sign.width = 150;
        sign.height = 150;
        sign.interactive = true;
        sign.buttonMode = true;
        sign.on("click", () => this.changeRoom(1));
        this.gameCont.addChild(sign);

        const lever = new PIXI.Sprite.from("lever");
        lever.x = 1200;
        lever.y = 370;
        lever.width = lever.height = 80;
        lever.interactive = true;
        lever.buttonMode = true;
        lever.on("click", () => {
            this.back.visible = false;
            backSlap.visible = true;
            setTimeout(() => {
                this.back.visible = true;
                backSlap.visible = false;
            }, 1100);
            this.slapSound.play();
        });
        this.gameCont.addChild(lever);
        
        const door = new PIXI.Sprite.from("door");
        door.x = 1668;
        door.y = 162;
        door.interactive = true;
        door.buttonMode = true;
        door.on("click", () => this.changeRoom(3));
        this.gameCont.addChild(door);

        this.padoru.r.x = this.spawnData.x;
        this.padoru.r.y = this.spawnData.y;
        this.gameCont.addChild(this.padoru.r);

        for (const p of data) {
            const padoru = this.newPadoru(p);
            this.gameCont.addChild(padoru.r);
            this.padoruArr[padoru.id] = padoru;
        }

        if(!this.gameInitDone) this.gameInit();
    }

    room3init(data) {
        this.padoruArr.length = 0;
        this.spawnData.x = 1300;
        this.spawnData.y = 650;
        clearInterval(this.roomIntr);
        this.roomIntr = null;

        this.gameCont.removeChildren();
        this.padoruArr = [];

        this.back = PIXI.Sprite.from("wcBack");
        this.gameCont.addChild(this.back);

        const door = new PIXI.Sprite.from("wcDoor");
        door.x = 1398;
        door.y = 167;
        door.interactive = true;
        door.buttonMode = true;
        door.on("click", () => this.changeRoom(2));
        this.gameCont.addChild(door);

        const aquaArr = [
            new PIXI.Sprite.from("aqua1"),
            new PIXI.Sprite.from("aqua2"),
            new PIXI.Sprite.from("aqua3")
        ];
        aquaArr[0].x = aquaArr[1].x = aquaArr[2].x = 1050;
        aquaArr[0].y = aquaArr[1].y = aquaArr[2].y = 180;
        aquaArr[1].visible = aquaArr[2].visible = false;
        this.gameCont.addChild(...aquaArr);
        let i = 0;
        this.roomIntr = setInterval(() => {
            aquaArr.forEach((element, index) => {
                if(i == index) element.visible = true;
                else element.visible = false;
            });

            if(++i > aquaArr.length - 1) i = 0;
        }, 150);

        this.padoru.r.x = this.spawnData.x;
        this.padoru.r.y = this.spawnData.y;
        this.gameCont.addChild(this.padoru.r);

        for (const p of data) {
            const padoru = this.newPadoru(p);
            this.gameCont.addChild(padoru.r);
            this.padoruArr[padoru.id] = padoru;
        }

        if (!this.gameInitDone) this.gameInit();
    }

    room4init(data) {
        this.padoruArr.length = 0;
        this.spawnData.x = 1230;
        this.spawnData.y = 850;
        clearInterval(this.roomIntr);
        this.roomIntr = null;

        this.back = PIXI.Sprite.from("classroomBack");
        this.gameCont.addChild(this.back);

        const sign = new PIXI.Sprite.from("spawnSign");
        sign.x = 70;
        sign.y = 850;
        sign.width = 150;
        sign.height = 150;
        sign.interactive = true;
        sign.buttonMode = true;
        sign.on("click", () => this.changeRoom(1));
        this.gameCont.addChild(sign);

        const kanna = new PIXI.Sprite.from("kanna");
        kanna.x = 600;
        kanna.y = 380;
        kanna.width = 250;
        kanna.height = 250;
        kanna.rotation = -.04;
        kanna.interactive = true;
        kanna.buttonMode = true;
        kanna.on("click", () => this.kannaSound.play());
        this.gameCont.addChild(kanna);

        this.padoru = this.newPadoru({
            x: 0,
            y: 0,
            icon: "padoruOriginal",
            name: this.name
        });
        this.gameCont.addChild(this.padoru.r);

        for (const p of data) {
            const padoru = this.newPadoru(p);
            this.gameCont.addChild(padoru.r);
            this.padoruArr[padoru.id] = padoru;
        }

        if (!this.gameInitDone) this.gameInit();
    }

    room5init(data) {
        this.padoruArr.length = 0;
        this.spawnData.x = 330;
        this.spawnData.y = 790;
        clearInterval(this.roomIntr);
        this.roomIntr = null;

        this.back = PIXI.Sprite.from("beachBack");
        this.gameCont.addChild(this.back);

        const sign = new PIXI.Sprite.from("spawnSign");
        sign.x = 100;
        sign.y = 950;
        sign.width = 150;
        sign.height = 150;
        sign.interactive = true;
        sign.buttonMode = true;
        sign.on("click", () => this.changeRoom(1));
        this.gameCont.addChild(sign);

        const aquaArr = [
            new PIXI.Sprite.from("aquaDance1"),
            new PIXI.Sprite.from("aquaDance2"),
            new PIXI.Sprite.from("aquaDance3"),
            new PIXI.Sprite.from("aquaDance4")
        ];
        aquaArr[0].x = aquaArr[1].x = aquaArr[2].x = aquaArr[3].x = 800;
        aquaArr[0].y = aquaArr[1].y = aquaArr[2].y = aquaArr[3].y = 400;
        aquaArr[0].width = aquaArr[1].width = aquaArr[2].width = aquaArr[3].width = 190;
        aquaArr[0].height = aquaArr[1].height = aquaArr[2].height = aquaArr[3].height = 250;
        aquaArr[1].visible = aquaArr[2].visible = aquaArr[3].visible = false;
        this.gameCont.addChild(...aquaArr);
        let i = 0;
        this.roomIntr = setInterval(() => {
            aquaArr.forEach((element, index) => {
                if(i == index) element.visible = true;
                else element.visible = false;
            });

            if(++i > aquaArr.length - 1) i = 0;
        }, 150);

        this.padoru = this.newPadoru({
            x: 0,
            y: 0,
            icon: "padoruOriginal",
            name: this.name
        });
        this.gameCont.addChild(this.padoru.r);

        for (const p of data) {
            const padoru = this.newPadoru(p);
            this.gameCont.addChild(padoru.r);
            this.padoruArr[padoru.id] = padoru;
        }

        if (!this.gameInitDone) this.gameInit();
    }

    setIo() {
        const s = this.socket;
        s.on("room1", data => {
            this.room1init(data);
        });
        s.on("room2", data => {
            this.room2init(data);
        });
        s.on("room3", data => {
            this.room3init(data);
        });
        s.on("room4", data => {
            this.room4init(data);
        });
        s.on("room5", data => {
            this.room5init(data);
        });
        s.on("show", data => console.log(data));
        s.on("connect", data => {
            console.log("(re)connected");
            s.emit("ready", {name: this.name});
        });
        s.on("new", data => {
            if (data.id != this.socket.id) {
                data.x = this.spawnData.x;
                data.y = this.spawnData.y;
                data.s = this.spawnData.s;

                const padoru = this.newPadoru(data);
                this.gameCont.addChild(padoru.r);
                this.padoruArr[padoru.id] = padoru;
            }
        });
        s.on("move", data => {
            if(data.id != this.socket.id) {
                this.padoruArr[data.id] && this.padoruArr[data.id].move(data.x, data.y);
            }
        });
        s.on("action1", data => {
            if(data.id != this.socket.id) {
                if(this.padoruArr[data.id]) { 
                    this.padoruArr[data.id].action1();
                    this.padoruSound.play();
                }
            }
        });
        s.on("action2", data => {
            if(data.id != this.socket.id) {
                if(this.padoruArr[data.id]) { 
                    this.padoruArr[data.id].action2();
                }
            }
        });
        s.on("chat", data => {
            if(data.id != this.socket.id) {
                if(this.padoruArr[data.id]) { 
                    this.padoruArr[data.id].chat(data.chat);
                }
            }
        });
        s.on("dis", data => {
            this.padoruArr[data.id] && this.padoruArr[data.id].suicide();
            delete this.padoruArr[data.id];
        });

        s.emit("ready", {name: this.name});
    }

    newPadoru(data) {
        if(data.x == 0 && data.y == 0) {
            data.x = this.spawnData.x;
            data.y = this.spawnData.y;
        }

        switch(data.icon) {
            case "padoruOriginal":
                return new PadoruOriginal(data);
        }
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

    changeRoom(id) {
        this.socket.emit("room" + id, {
            name: this.name
        });
    }

    test(id) {
        this.socket.emit("room" + id, {name: this.name});
    }
}

window.onload = function() {
    window.game = new Game();
}