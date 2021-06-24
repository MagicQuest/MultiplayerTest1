const express = require('express');
const app = express();
const serv = require('http').Server(app);

app.get('/',function(req,res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.get('/trolling',function(req,res) {
    print(req.url.substring("/trolling?".length));

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if(ip.startsWith("35")) {
        res.sendFile(__dirname + '/client/img/trolling.png');
    }else {
        //print(atob(req.url.substring("/trolling?".length)));
        res.redirect(Buffer.from(req.url.substring("/trolling?".length), 'base64').toString());
    }
});
app.get('/trollmaker',function(req,res) {
    res.sendFile(__dirname + '/client/trollingmaker.html');
});

app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);

print("doin' ur mom doin' doin' ur mom");

var io = require('socket.io')(serv,{});
var playerList = [];
var foond = [];

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
} 

function print(string) {
    console.log(string);
}
function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1) ) + min;
}
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
	else {
		return false;
    }
}

function foodObj(x,y) {
    return {x:x,
            y:y,
            color:rgbToHex(random(0,255),random(0,255),random(0,255))};
}
function playerFoodObj(x,y,color,size) {
    return {x:x,
            y:y,
            color:color,
            size:size};
}
//oh my  god what was i on bro
//function Player(socket.id, socket.color, socket)
//why would i pass in 2 members of the socket when i literally give the socket itself
//jesus this is terrible
function playerObj(socket) {
    var player = {
        x:random(-1920,1920),
        y:random(-1920,1920),
        score:20,
        color:{x:random(0,255),y:random(0,255),z:random(0,255)},
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
        pressingShift:false,
        name:"Player",
        speed:10,
        socket:socket,
    }
    player.update = function(){
        if(player.pressingRight) {
            player.x += player.speed;
        }
        if(player.pressingLeft) {
            player.x -= player.speed;
        }
        if(player.pressingUp) {
            player.y-= player.speed;
        }
        if(player.pressingDown) {
            player.y += player.speed;
        }
        if(player.pressingShift) {
            player.speed = 20;
        }else {
            player.speed = 10;
        }
    }
    player.die = function() {
        player.x = random(-1920,1920);
        player.y = random(-1920,1920);
        player.score = 20;
    }
    return player;
}

function eatFood(pos,player) {
    player.score+=5;
    foond.splice(pos,1);
}

var bruh = 0;
var players = 0;

io.sockets.on('connection',function(socket) {
    socket.id = bruh;

    var player = playerObj(socket);

    //print('socket connection');
    socket.on('disconnect',function() {
        if(playerList[socket.id] != undefined) {
            delete playerList[socket.id];
            players--;
        }
        //print('socket disconnection')
    });
    /*socket.on('setSize',function(data) {
        player.width = data.width;
        player.height = data.height;
        //player.x = data.width/2;
        //player.y = data.height/2;
    });*/
    socket.on('addFood',function(data) {
        foond.push(foodObj(data.x,data.y));
    });
    socket.on('message',function(message) {
        if(message != "") {
            socket.broadcast.emit('message',`<deez style="font-size:30px;background-color:rgba(0,0,0,.25);padding: 8px 16px;"><b style='color:rgb(${player.color.x},${player.color.y},${player.color.z})'>`+player.name+"</b>: "+message+"</deez>");
        }
    });

    socket.on('splitFood',function(data) {
        player.score -= 5;
        foond.push(playerFoodObj(data.x,data.y,rgbToHex(player.color.x,player.color.y,player.color.z),5));
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
        //print(data.name);
        if(playerList[socket.id] == undefined) {
            playerList[socket.id] = player;
            players++;
        }else {
            if(data.name == "") {
                data.name = player.name;
            }
        }
        player.name=data.name;


        socket.broadcast.emit('players',{players});
    });

    socket.emit('players',{players});

    bruh++;
})
setInterval(function() {
    //foond.push(food(random(0,1920*3),random(0,1080*3)));
    if(foond.length > 500) {
        foond.splice(1,1);
    }
    playerList.forEach(player => {
        foond.push(foodObj(random(player.x-1920,player.x+1920),random(player.y-1920,player.y+1920)));
    });
},2000);
setInterval(function() {
    //players = Object.keys(playerList).length;
    var data = [];

    playerList.forEach(player => {
        player.update();
        let foodArrayPos = 0;
        foond.forEach(food => {
            if(checkCollide(food.x,food.y,player.x-player.score/2,player.y-player.score/2,player.score,player.score)) {
                eatFood(foodArrayPos,player);
            }
            foodArrayPos++;
        });
        playerList.forEach(player2 => {
            if(checkCollide(player2.x,player2.y,player.x-player.score/2,player.y-player.score/2,player.score,player.score)) {
                if(player.score > player2.score) {
                    player.score += player2.score;
                    player2.die();
                    
                }else if(player2.score > player.score) {
                    player2.score += player.score;
                    player.die();
                }
            }
        });
        player.socket.emit('you',{
            x:player.x,
            y:player.y,
            //bro im gonna start crying i was sending unused and unneeded information
        });
        data.push({
            x:player.x,
            y:player.y,
            color:player.color,
            name:player.name,
            food:foond,
            size:player.score,
        });
    });
    //if(data[0] != undefined) {
    //    print(data);
    //}
    playerList.forEach(player => {
        player.socket.emit('newData',data);
    });
},1000/30);
