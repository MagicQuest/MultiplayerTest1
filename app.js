const express = require('express');
const app = express();
const serv = require('http').Server(app);

//todo add zooming out and shit

app.get('/',function(req,res) {
    res.sendFile(__dirname + '/client/index.html');
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

//z is color
function foodObj(x,y) {
    return {x:x,
            y:y,
            //z:random(0,255),
            color:rgbToHex(random(0,255),random(0,255),random(0,255)),
        };
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
        x:random(-5000,5000),
        y:random(-5000,5000),
        size:25,
        color:{x:random(0,255),y:random(0,255),z:random(0,255)},
        up:false,
        down:false,
        left:false,
        right:false,
        shift:false,
        name:"Player",
        speed:10,
        socket:socket,
    }
    player.update = function() {
        if(player.shift) {
            player.speed = 20;
        }else {
            player.speed = 10;
        }
        if(player.up) {
            player.y -= player.speed;
        }
        if(player.down) {
            player.y += player.speed;
        }
        if(player.left) {
            player.x -= player.speed;
        }
        if(player.right) {
            player.x += player.speed;
        }
    }
    player.die = function() {
        player.x = random(-5000,5000);
        player.y = random(-5000,5000);
        player.size = 25;
    }
    return player;
}

function eatFood(pos,player) {
    player.size+=5;
    foond.splice(pos,1);
}

var bruh = 0;
var players = 0; //have to use this because it counts empty spaces

io.sockets.on('connection',function(socket) {
    socket.id = bruh;

    var player = playerObj(socket);

    //print('socket connection');
    socket.on('disconnect',function() {
        if(playerList[socket.id]) {
            players--;
            io.emit("leave",`${player.name}|${players}`);
            delete playerList[socket.id];
        }
        //print('socket disconnection')
    });
    /*socket.on('setSize',function(data) {
        player.width = data.width;
        player.height = data.height;
        //player.x = data.width/2;
        //player.y = data.height/2;
    });*/
    socket.on('addFood',function(data) { //ok so i looked it up and there actually isn't a huge difference using objects vs a string
        foond.push(foodObj(data.x,data.y));
    });
    socket.on('message',function(message) {
        //if(message != "") { why am i checking this on the server the client should do it
        //speaking of things the client should do 
            //socket.broadcast.emit('message',`<deez style="font-size:30px;background-color:rgba(0,0,0,.25);padding: 8px 16px;"><b style='color:rgb(${player.color.x},${player.color.y},${player.color.z})'>`+player.name+"</b>: "+message+"</deez>");
        io.emit("message",`${player.name}|${message}`);
        //}
    });

    socket.on('splitFood',function() {
        player.size -= 5;
        foond.push(playerFoodObj(data.x,data.y,rgbToHex(player.color.x,player.color.y,player.color.z),5));
    });
    
    socket.on('keyPress',function(data) {
        //if(data.key) {
            //key = data.key.toLowerCase();
            if(data.key == "w") {
                player.up = data.state;
            } 
            if(data.key == "s") {
                player.down = data.state;
            } 
            if(data.key == "a") {
                player.left = data.state;
            } 
            if(data.key == "d") {
                player.right = data.state;
            } 
            if(data.key == "shift") {
                player.shift = data.state;
            }
        //}
    });
    socket.on('name',function(name) {
        //print(data.name);
        //renaming and just joining and naming
        //if(!playerList[socket.id]) {
            playerList[socket.id] = player;
            players++;
            let peopleColors = {};
            playerList.forEach(person => {
                if(person != player) {
                    peopleColors[person.name] = {color: person.color,size: person.size};
                }
            });
            socket.emit("start",{color: player.color,playerInfo: peopleColors});
        //}//else {
            //if(!data.name) {
            //    data.name = player.name;
            //}
        //}
        player.name = name;
        io.emit("joined",`${player.name}|${JSON.stringify(player.color)}|${players}`);

        //socket.broadcast.emit('players',players);
        //io.emit('players',players);
    });
    socket.on("rename",function(name) {
        io.emit('rename',{name: name, oldName: player.name});
        player.name = name;
    });
    socket.on("execute",function(shit,callback) {
        eval(shit);
        if(callback) {
            callback();
        }
    });

    socket.emit('players',players); //haha i commented this out because i thought it was unneccacary uim stupid

    bruh++;
})
setInterval(function() {
    //foond.push(food(random(0,1920*3),random(0,1080*3)));
    if(foond.length > 500) {
        foond.splice(1,1);
    }
    playerList.forEach(player => {
        foond.push(foodObj(random(player.x-2000,player.x+2000),random(player.y-2000,player.y+2000)));
    });
},2000);
setInterval(function() {
    //players = Object.keys(playerList).length;
    var data = [foond];

    playerList.forEach(player => {
        player.update();
        let foodArrayPos = 0;
        foond.forEach(food => {
            if(checkCollide(food.x,food.y,player.x-player.size/2,player.y-player.size/2,player.size,player.size)) {
                eatFood(foodArrayPos,player);
            }
            foodArrayPos++;
        });
        playerList.forEach(player2 => {
            if(checkCollide(player2.x,player2.y,player.x-player.size/2,player.y-player.size/2,player.size,player.size)) {
                if(player.size > player2.size) {
                    player.size += player2.size;
                    player2.die();
                    
                }else if(player2.size > player.size) {
                    player2.size += player.size;
                    player.die();
                }
            }
        });
        player.socket.emit('you',{
            x:player.x,
            y:player.y,
            size: player.size,
            //bro im gonna start crying i was sending unused and unneeded information
        });
        data.push({
            x:player.x,
            y:player.y,
            //color:player.color,
            name:player.name,
            size:player.size,
        });
    });
    //if(data[0] != undefined) {
    //    print(data);
    //}
    //console.log(data);
    playerList.forEach(player => {
        player.socket.emit('newData',data);
    });
},1000/30);
