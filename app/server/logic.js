"use strict";

const Sio = require("socket.io");

class Padoru {
    constructor(id, name, icon) {
        this.id = id;

        this.x = 0;
        this.y = 0;
        this.icon = icon || "padoruOriginal";
        this.name = name;
    }

    move(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Room {
    constructor(id, io, x, y) {
        this.roomId = id;
        this.io = io;
        this.x = x;
        this.y = y;
        this.padoruArr = [];

        this.goldR = false;
        setInterval(() => {
            if(!this.goldR) {
                const x = Math.random() * ((this.x - 200) - 200) + 200;
                const y = Math.random() * ((this.y - 200) - 200) + 200;

                this.goldR = {x, y};
                this.io.in(this.roomId).emit("gold", {x, y});
            }
        }, 10000);
    }

    addPlayer(socket, data) {
        socket.join(this.roomId);
        socket.roomId = this.roomId;
        // console.log("room" + this.roomId, data.name);

        socket.emit("room" + (this.roomId + 1), {
            padoru: Object.values(this.padoruArr),
            gold: this.goldR
        });

        const padoru = new Padoru(socket.id, data.name, data.icon || null, data.allGold || null);
        this.padoruArr[padoru.id] = padoru;

        this.io.in(this.roomId).emit("new", padoru);
    }
    move(data, socket) {
        this.io.in(this.roomId).volatile.emit("move", {
            id: socket.id,
            x: data.x,
            y: data.y
        });

        this.padoruArr[socket.id] && this.padoruArr[socket.id].move(data.x, data.y);
    }
    action1(data, socket) {
        this.io.in(this.roomId).emit("action1", {
            id: socket.id
        });
    }
    action2(data, socket) {
        this.io.in(this.roomId).emit("action2", {
            id: socket.id
        });
    }
    chat(data, socket) {
        this.io.in(this.roomId).emit("chat", {
            id: socket.id,
            chat: data
        });
    }
    padoruChange(data, socket) {
        this.padoruArr[socket.id].icon = data.icon;

        this.io.in(this.roomId).emit("padoruChange", {
            id: socket.id,
            icon: data.icon
        });
    }
    gold(data, socket) {
        if(this.goldR) {
            this.goldR = false;
            this.io.in(this.roomId).emit("gotGold", {id: socket.id});
        }
    }
    removePlayer(socket) {
        if (this.padoruArr[socket.id]) {
            return new Promise((jo) => {
                socket.leave(this.roomId, () => {
                    this.io.in(this.roomId).emit("dis", {
                        id: socket.id
                    });
                    
                    jo(this.padoruArr[socket.id]);
                    delete this.padoruArr[socket.id];
                });
            });
        }

        return Promise.resolve();
    }
}

class Logic {
    constructor(roomId) {
        this.roomId = roomId;
        this.io = Sio().listen("300" + roomId);

        this.connCount = 0;

        this.roomArr = [
            new Room(0, this.io, 1920, 1080),
            new Room(1, this.io, 1980, 1020),
            new Room(2, this.io, 1920, 1080),
            new Room(3, this.io, 2048, 1152),
            new Room(4, this.io, 2048, 1152)
        ];

        this.setIo();

        console.log(`Server ${this.roomId} online`);

        let time = Date.now();
        setInterval(() => {
            let time2 = Date.now();
            console.log(`[${this.roomId}] ${this.connCount} conn, delta ${time2 - time}`);
            time = time2;
        }, 3000);
    }

    setIo() {
        this.io.on('connection', socket => {

            // if(this.connCount > 0) {
            //     socket.emit("show", `SERVER: Server ${this.roomId} full`);
            //     return;
            // }

            socket.emit("show", "SERVER: Connected to w" + this.roomId);
            // console.log("Client", socket.id);

            socket.on("ready", data => this.ready(data, socket));
        });
    }
    ready(d, socket) {
        // console.log("Ready", socket.id);
        if (!socket.eventsAdded) {
            socket.on("move", data => this.move(data, socket));
            socket.on("disconnect", data => this.disconnect(data, socket));
            socket.on("action1", data => this.action1(data, socket));
            socket.on("action2", data => this.action2(data, socket));
            socket.on("room1", data => this.room1(data, socket));
            socket.on("room2", data => this.room2(data, socket));
            socket.on("room3", data => this.room3(data, socket));
            socket.on("room4", data => this.room4(data, socket));
            socket.on("room5", data => this.room5(data, socket));
            socket.on("chat", data => this.chat(data, socket));
            socket.on("padoruChange", data => this.padoruChange(data, socket));
            socket.on("gold", data => this.gold(data, socket));

            socket.eventsAdded = true;
        }

        this.connCount++;

        this.room1(d, socket);
    }
    remove(socket) {
        if (socket.roomId || socket.roomId === 0) {
            return this.roomArr[socket.roomId].removePlayer(socket);
        }
        return Promise.resolve();
    }
    
    // events
    move(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].move(data, socket);
        }
    }
    action1(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].action1(data, socket);
        }
    }
    action2(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].action2(data, socket);
        }
    }
    chat(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].chat(data, socket);
        }
    }
    padoruChange(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].padoruChange(data, socket);
        }
    }
    gold(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].gold(data, socket);
        }
    }
    room1(data, socket) {
        this.remove(socket).then(padoru => {
            if(padoru) {
                this.roomArr[0].addPlayer(socket, {
                    name: data.name,
                    icon: padoru.icon
                });
            } else {
                this.roomArr[0].addPlayer(socket, {name: data.name});
            }
        }).catch(e => console.log(socket.id, "no name"));
    }
    room2(data, socket) {
        this.remove(socket).then(padoru => {
            if (padoru) {
                this.roomArr[1].addPlayer(socket, {
                    name: data.name,
                    icon: padoru.icon
                });
            } else {
                this.roomArr[1].addPlayer(socket, {
                    name: data.name
                });
            }
        }).catch(e => console.log(socket.id, "no name"));
    }
    room3(data, socket) {
        this.remove(socket).then(padoru => {
            if (padoru) {
                this.roomArr[2].addPlayer(socket, {
                    name: data.name,
                    icon: padoru.icon
                });
            } else {
                this.roomArr[2].addPlayer(socket, {
                    name: data.name
                });
            }
        }).catch(e => console.log(socket.id, "no name"));
    }
    room4(data, socket) {
        this.remove(socket).then(padoru => {
            if (padoru) {
                this.roomArr[3].addPlayer(socket, {
                    name: data.name,
                    icon: padoru.icon
                });
            } else {
                this.roomArr[3].addPlayer(socket, {
                    name: data.name
                });
            }
        }).catch(e => console.log(socket.id, "no name"));
    }
    room5(data, socket) {
        this.remove(socket).then(padoru => {
            if (padoru) {
                this.roomArr[4].addPlayer(socket, {
                    name: data.name,
                    icon: padoru.icon
                });
            } else {
                this.roomArr[4].addPlayer(socket, {
                    name: data.name
                });
            }
        }).catch(e => console.log(socket.id, "no name"));
    }
    disconnect(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].removePlayer(socket);
            // console.log("Dis", socket.id);
            this.connCount--;
        }
    }
}

process.on("message", id => {
    new Logic(id);
});

module.exports = Logic;