"use strict";

const Sio = require("socket.io");

class Padoru {
    constructor(id, name) {
        this.id = id;

        this.x = 100;
        this.y = 100;
        this.s = 250;
        this.icon = "padoruBlue";
        this.name = name;
    }
}

class Room {
    constructor(id, io) {
        this.roomId = id;
        this.io = io;
        this.padoruArr = [];
    }

    addPlayer(socket, name) {
        socket.join(this.id);
        socket.roomId = this.roomId;

        socket.emit("start", this.padoruArr);

        const padoru = new Padoru(socket.id, name);
        this.padoruArr.push(padoru);

        this.io.in(this.id).emit("new", padoru);
    }
    
    move(data, socket) {
         this.io.in(this.id).emit("move", {
            id: socket.id,
            x: data.x,
            y: data.y
        });
    }
    removePlayer(data, socket) {
        for (let i = 0; i < this.padoruArr.length; i++) {
            if (this.padoruArr[i].id == socket.id) {
                this.padoruArr.splice(i, 1);
                this.io.in(this.id).emit("dis", {id: socket.id});
                return;
            }
        }
    }
}

class Logic {
    constructor(roomId) {
        this.roomId = roomId;
        this.io = Sio().listen("300" + roomId);

        this.roomArr = [
            new Room(0, this.io)
        ];

        this.setIo();

        console.log("Server online");
    }

    setIo() {
        this.io.on('connection', socket => {
            socket.emit("show", "SERVER: Connected to w" + this.roomId);
            console.log("Client " + socket.id);

            const mainF = d => {
                if (!socket.eventsAdded) {
                    socket.on("move", data => this.move(data, socket));
                    socket.on("disconnect", data => this.disconnect(data, socket));

                    socket.eventsAdded = true;
                }

                this.connect(d, socket);
            }

            socket.on("ready", mainF);
        });
    }
    remove(socket) {
        for (const room of this.roomArr) {
            for (const padoru of room.padoruArr) {
                if (socket.id == padoru.id) {
                    return room.removePlayer(socket);
                }
            }
        }
        return Promise.resolve();
    }
    connect(data, socket) {
        console.log("connect", data, socket.id);
        this.remove(socket).then(() => {
            this.roomArr[0].addPlayer(socket, data.name);
        });
    }
    
    // events
    move(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].move(data, socket);
        }
    }
    disconnect(data, socket) {
        if (socket.roomId || socket.roomId === 0) {
            this.roomArr[socket.roomId].removePlayer(data, socket);
        }
    }
}

module.exports = Logic;