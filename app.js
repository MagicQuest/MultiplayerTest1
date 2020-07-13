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
var foond = [];
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
} 
var Food = function(x,y) {
    var self = {
        x:x,
        y:y,
        color:rgbToHex(random(0,255),random(0,255),random(0,255)),
    }
    return self;
}
var Player = function(id,color,socket) {
    var self = {
        x:250,
        y:250,
        id:id,
        score:20,
        color:color,
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
        pressingShift:false,
        name:"Player",
        maxSpeed:10,
        width:500,
        height:500,
        socket:socket,
    };
    self.update = function(){
        if(self.pressingRight) {
            self.x += self.maxSpeed;
        }
        if(self.pressingLeft) {
            self.x -= self.maxSpeed;
        }
        if(self.pressingUp) {
            self.y-= self.maxSpeed;
        }
        if(self.pressingDown) {
            self.y += self.maxSpeed;
        }
        if(self.pressingShift) {
            self.maxSpeed = 20;
        }else {
            self.maxSpeed = 10;
        }
        if(self.score >= 750) {
            self.score = 750;
        }
    };
    self.die = function() {
        self.x = random(0,self.width);
        self.y = random(0,self.height);
        self.score = 20;
    }
    return self;
};
function checkCollide(pointX, pointY, objectx, objecty, objectw, objecth) { // pointX, pointY belong to one rectangle, while the object variables belong to another rectangle
	var oTop = objecty;
	var oLeft = objectx; 
	var oRight = objectx+objectw;
	var oBottom = objecty+objecth; 

	if(pointX > oLeft && pointX < oRight){
		 if(pointY > oTop && pointY < oBottom ){
			  return true;
		 }
	}
	else
		 return false;
};
var bruh = 0;
var players = 0;
var removeFood = function(food,player) {
    player.score+=5;
    foond.splice(food,1);
}
io.sockets.on('connection',function(socket) {
    
    socket.id = bruh;
    socket.color = {
        x:random(0,255),
        y:random(0,255),
        z:random(0,255)
    }
    SOCKET_LIST[socket.id] = socket;
    var player = Player(socket.id,socket.color,socket);
    PLAYER_LIST[socket.id] = player;
    //print('socket connection');
    socket.on('disconnect',function() {
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        //print('socket disconnection')
    });
    socket.on('setSize',function(data) {
        player.width = data.width;
        player.height = data.height;
        //player.x = data.width/2;
        //player.y = data.height/2;
    });
    socket.on('addFood',function(data) {
        foond.push(Food(data.x,data.y));
    });
    
    socket.on('keyPress',function(data) {
        if(data.key != undefined) {
            data.key = data.key.toLowerCase();
            if(data.key == "w") {
                player.pressingUp = data.state;
            } if(data.key == "s") {
                player.pressingDown = data.state;
            } if(data.key == "a") {
                player.pressingLeft = data.state;
            } if(data.key == "d") {
                player.pressingRight = data.state;
            } if(data.key == "shift") {
                player.pressingShift = data.state;
            }
        }
        
    });
    socket.on('name',function(data) {
        print(data.name);
        player.name=data.name;
    });
    
    bruh++;
});
setInterval(function() {
    players = Object.keys(PLAYER_LIST).length
    //print(Object.keys(SOCKET_LIST).length);
    var pack = [];

    for(var i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];
        player.update();
        let randomCrap = 0;
        foond.forEach(food => {
            if(checkCollide(food.x,food.y,player.x-player.score/2,player.y-player.score/2,player.score,player.score)) {
                removeFood(randomCrap,player);
            }
            randomCrap++;
        });
        for(var j in PLAYER_LIST) {
            var player2 = PLAYER_LIST[j];
            if(checkCollide(player2.x,player2.y,player.x-player.score/2,player.y-player.score/2,player.score,player.score)) {
                if(player.score > player2.score) {
                    player.score += player2.score;
                    player2.die();
                    
                }else if(player2.score > player.score) {
                    player2.score += player.score;
                    player.die();
                }
            }
        }
        //socket.emit('newPosition', {
         //   x:socket.x,
        //    y:socket.y
        //});
        player.socket.emit('you',{
            x:player.x,
            y:player.y,
            w:player.pressingUp,
            s:player.pressingDown,
            a:player.pressingLeft,
            d:player.pressingRight,
            maxSpeed:player.maxSpeed,
        })
        print(player.score);
        pack.push({
            x:player.x,
            y:player.y,
            color:player.color,
            name:player.name,
            food:foond,
            size:player.score,
        });
    }
    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newData',pack);
        
    }
    
},1000/30)
