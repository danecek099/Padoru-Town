"use strict";

const Sio = require("socket.io");

class Padoru {
    constructor(id, name) {
        this.id = id;

        this.x = 0;
        this.y = 0;
        this.icon = "padoruOriginal";
        this.name = name;
    }

    move(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Room {
    constructor(id, io) {
        this.roomId = id;
        this.io = io;
        this.padoruArr = [];
    }

    addPlayer(socket, name) {
        socket.join(this.roomId);
        socket.roomId = this.roomId;
        console.log("room" + this.roomId, name);

        socket.emit("room" + (this.roomId + 1), Object.values(this.padoruArr));

        const padoru = new Padoru(socket.id, name);
        this.padoruArr[padoru.id] = padoru;

        this.io.in(this.roomId).emit("new", padoru);
    }
    move(data, socket) {
         this.io.in(this.roomId).emit("move", {
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
    removePlayer(socket) {
        if (this.padoruArr[socket.id]) {
            return new Promise((jo) => {
                socket.leave(this.roomId, () => {
                    this.io.in(this.roomId).emit("dis", {
                        id: socket.id
                    });
                    delete this.padoruArr[socket.id];

                    jo();
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

        this.roomArr = [
            new Room(0, this.io),
            new Room(1, this.io),
            new Room(2, this.io),
            new Room(3, this.io),
            new Room(4, this.io)
        ];

        this.setIo();

        console.log("Server online");
    }

    setIo() {
        this.io.on('connection', socket => {
            socket.emit("show", "SERVER: Connected to w" + this.roomId);
            console.log("Client " + socket.id);

            socket.on("ready", d => {
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

                    socket.eventsAdded = true;
                }

                this.room1(d, socket);
            });
        });
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
    room1(data, socket) {
        this.remove(socket).then(() => {
            this.roomArr[0].addPlayer(socket, data.name);
        }).catch(e => console.log(socket.id, "no name"));
    }
    room2(data, socket) {
        this.remove(socket).then(() => {
            this.roomArr[1].addPlayer(socket, data.name);
        }).catch(e => console.log(socket.id, "no name"));
    }
    room3(data, socket) {
        this.remove(socket).then(() => {
            this.roomArr[2].addPlayer(socket, data.name);
        }).catch(e => console.log(socket.id, "no name"));
    }
    room4(data, socket) {
        this.remove(socket).then(() => {
            this.roomArr[3].addPlayer(socket, data.name);
        }).catch(e => console.log(socket.id, "no name"));
    }
    room5(data, socket) {
        this.remove(socket).then(() => {
            this.roomArr[4].addPlayer(socket, data.name);
        }).catch(e => console.log(socket.id, "no name"));
    }
    disconnect(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].removePlayer(socket);
        }
    }
}

module.exports = Logic;