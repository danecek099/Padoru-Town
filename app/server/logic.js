"use strict";

const Sio = require("socket.io");

class Logic {
    constructor(roomId) {
        this.roomId = roomId;
        this.io = Sio().listen("300" + roomId);

        this.maxPlayers = 100;
        this.playaArr = [];

        this.connCount = 0;
        this.setIo();
    }

    setIo() {
        this.io.on('connection', (socket) => {
            socket.emit("show", "SERVER: Connected to w" + workerId);

            const mainF = () => {
                if(!socket.eventsAdded){
                    socket.on("roomSelect", data => this.connect(data, socket));

                    socket.eventsAdded = true;
                    this.connCount++;
                }
            }

            socket.on("ready", mainF);
        });
    }

    // roomInfo(){
    //     const data = {
    //         players: this.playaArr.length,
    //         conn: this.playaArr.length <= this.maxPlayers
    //     };

    //     return data;
    // }
    remove(socket) {
        for (const room of this.rooms) {
            for (const playa of room.playaArr) {
                if (socket.id == playa.id) {
                    return room.removePlayer(socket);
                }
            }
        }
        return Promise.resolve();
    }
    
    // event handlers
    connect(data, socket) {
        const room = this.rooms[data.room];
        if(room){
            const conn = room.playaArr.length <= room.maxPlayers && room.canConnect;
            // const conn = false;
            if(conn){
                this.remove(socket).then(() => {
                    this.rooms[data.room].addPlayer(socket, data.name);
                    clearInterval(socket.intr);
                })
            } else {
                socket.emit("nonono")
            }
        }
    }
}

module.exports = Logic;