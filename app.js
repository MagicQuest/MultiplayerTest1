const express = require('express');
const app = express();
const serv = require('http').Server(app);
const print = function(string) {
    console.log(string);
};
function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1) ) + min;
}
app.get('/',function(req,res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 666);

print("doin' ur mom doin' doin' ur mom");

var io = require('socket.io')(serv,{});
var SOCKET_LIST = {};
var PLAYER_LIST = {};

var Player = function(id,color) {
    var self = {
        x:250,
        y:250,
        id:id,
        color:color,
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
        maxSpeed:10,
    };
    self.updatePosition = function(){
        if(self.pressingRight)
            self.x += self.maxSpeed;
        if(self.pressingLeft)
            self.x -= self.maxSpeed;
        if(self.pressingUp)
            self.y-= self.maxSpeed;
        if(self.pressingDown)
            self.y += self.maxSpeed;
    };
    return self;
};

var bruh = 0;
io.sockets.on('connection',function(socket) {
    
    socket.id = bruh;
    socket.color = {
        x:random(0,255),
        y:random(0,255),
        z:random(0,255)
    }
    SOCKET_LIST[socket.id] = socket;
    var player = Player(socket.id,socket.color);
    PLAYER_LIST[socket.id] = player;
    //print('socket connection');
    socket.on('disconnect',function() {
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        //print('socket disconnection')
    });
    socket.on('keyPress',function(data) {
        if(data.key == "w") {
            player.pressingUp = data.state;
        }else if(data.key == "s") {
            player.pressingDown = data.state;
        }else if(data.key == "a") {
            player.pressingLeft = data.state;
        }else if(data.key == "d") {
            player.pressingRight = data.state;
        }
    })
    
    bruh++;
});
setInterval(function() {
    print(Object.keys(SOCKET_LIST).length);
    var pack = [];

    for(let i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];
        player.updatePosition();
        //socket.emit('newPosition', {
         //   x:socket.x,
        //    y:socket.y
        //});
        pack.push({
            x:player.x,
            y:player.y,
            color:player.color
        });
    }
    for(let i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newData',pack);
        
    }
    
},1000/30)