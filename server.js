/**
 * Created by tselvan on 5/9/2015.
 */

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.get('/client', function (req, res) {
    res.sendFile('client.html', {root: __dirname});
});
app.get('/angular.game.js', function (req, res) {
    res.sendFile('angular.game.js', {root: __dirname})
});
app.get('/admin', function (req, res) {
    res.sendFile('admin.html', {root: __dirname});
});
app.get('/includes/angular.js', function (req, res) {
    res.sendFile('includes/angular.js', {root: __dirname});
});
app.get('/includes/jquery-1.11.2.min.js', function (req, res) {
    res.sendFile('includes/jquery-1.11.2.min.js', {root: __dirname});
});
app.get('/includes/bootstrap.min.css', function (req, res) {
    res.sendFile('includes/bootstrap.min.css', {root: __dirname});
});
app.get('/includes/main.css', function (req, res) {
    res.sendFile('includes/main.css', {root: __dirname});
});
app.get('/includes/jquery-ui.css', function (req, res) {
    res.sendFile('includes/jquery-ui.css', {root: __dirname});
});
app.get('/includes/jquery-ui.js', function (req, res) {
    res.sendFile('includes/jquery-ui.js', {root: __dirname});
});

function createNewBoard(len) {
    var charlist = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    board = zero2D(len, len, 'a');
    for (var i = 0; i < len; i++)
        for (var j = 0; j < len; j++)
            board[i][j] = charlist[Math.floor((Math.random() * 25) + 1)]

    return board
}


function zero2D(rows, cols, num) {
    var array = [], row = [];
    while (cols--) row.push(num);
    while (rows--) array.push(row.slice());
    return array;
}


function GameQueue() {
    this.q = {}
}

GameQueue.prototype.addGame = function (game) {
    this.q[game.id] = game;
};

GameQueue.prototype.getNewGameId = function () {
    return Math.floor((Math.random() * 100) + 1);
};

GameQueue.prototype.getGame = function (id) {
    if (this.q.hasOwnProperty(id))
        return this.q[id];
    else return null
};


GameQueue.prototype.deleteGame = function (id) {
    this.q[id] = null;
};

//Global queue for all games
var gameQueue = new GameQueue();

function Player(uniqId, nick) {
    this.uniqId = uniqId;
    this.nick = nick;
}

function GameNode(id, admin) {
    this.id = id;
    this.admin = admin;
    this.state = null;
    this.players = [];
    this.started = false;
}

GameNode.prototype.addPlayer = function (uniqId, nick) {
    this.players.push(new Player(uniqId, nick));
};

GameNode.prototype.getAllPlayers = function () {
    return this.players.map(function (obj) {
        return obj.nick;
    });
};

GameNode.prototype.updateState = function (gameState) {
    this.state = gameState;
};

GameNode.prototype.notifyAll = function (signal, data) {
    for (var i = 0; i < this.players.length; i++)
        io.to(this.players[i].uniqId).emit(signal, data);
};

function GameState(id) {
    var game = gameQueue.getGame(id);
    this.id = id;
    this.board = createNewBoard(15);
    this.boardState = zero2D(this.board.length, this.board.length, 0);
    this.score = Array.apply(null, new Array(game.players.length)).map(Number.prototype.valueOf, 0);
    this.wordsRemaining = 5;
    this.currPlayer = -1;
    this.currPlayerIndex = -1;
    this.numPlayers = game.players.length;
    game.started = true;
}

GameState.prototype.updateScore = function (playerIndex, score) {
    console.log('updating score of playerid ' + this.currPlayerIndex + ' to ' + score);
    this.score[playerIndex] += score;
};

GameState.prototype.makeMove = function (moveObj) {
    if (moveObj.isRow) {
        var start = moveObj.startxy.y;
        var end = moveObj.endxy.y;
        var rowId = moveObj.startxy.x;
        for (var j = start; j <= end; j++)
            this.boardState[rowId][j] = 1;
        this.updateScore(this.currPlayerIndex, end - start + 1);
    }
    else {
        var start = moveObj.startxy.x;
        var end = moveObj.endxy.x;
        var colId = moveObj.startxy.y;
        for (var i = start; i <= end; i++)
            this.boardState[i][colId] = 1;
        this.updateScore(this.currPlayerIndex, end - start + 1);
    }
    this.wordsRemaining--;
};

GameState.prototype.getNextPlayer = function () {
    this.currPlayerIndex++;
    if (this.currPlayerIndex == this.numPlayers)
        this.currPlayerIndex = 0;
    var game = gameQueue.getGame(this.id);
    this.currPlayer = game.players[this.currPlayerIndex].uniqId;
};

GameState.prototype.printState = function () {
    var obj = this;
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            console.log("Property: " + property + " Obj: " + obj);
        }
    }
};

io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('new:game', function (nick) {
        console.log('rcved signal to create new game');
        var id = gameQueue.getNewGameId();
        var game = new GameNode(id, nick);
        gameQueue.addGame(game);
        console.log('added new game in gameQueue:' + gameQueue.getGame(id).id);
        io.to(socket.id).emit('new:game init', game);
    });

    socket.on('new:player', function (msg) {
        var uniqId = socket.id;
        var game = gameQueue.getGame(msg.id);   //get the game the new player wants to join
        if (game === null) {
            io.to(socket.id).emit('undefined:game');    //if gameid doesn't exist
            return
        }
        if (game.started) {
            io.to(socket.id).emit('already:started');
            return;
        }
        game.addPlayer(uniqId, msg.nick);
        console.log('new player nick and id:' + msg.nick + ' ' + uniqId);
        io.to(socket.id).emit('id:player', uniqId);
        game.notifyAll('new:player', game.getAllPlayers());
    });

    socket.on('start:game', function (msg) {
        console.log('creating new game state');
        var id = msg.id;
        var game = gameQueue.getGame(id);
        var gameState = new GameState(id);
        gameState.getNextPlayer();
        game.updateState(gameState);
        game.notifyAll('game:started', gameState);
    });

    socket.on('make:move', function (msg) {
        console.log('making a move for gameid ' + msg.id);
        var game = gameQueue.getGame(msg.id);
        var gameState = game.state;
        if (gameState.currPlayer != socket.id) {
            console.log('invalid player made move');
            return;
        }
        gameState.makeMove(msg);
        gameState.getNextPlayer();
        game.updateState(gameState);
        game.notifyAll('move:made', gameState);
        if (gameState.wordsRemaining == 0) {
            game.notifyAll('game:over', []);
            gameQueue.deleteGame(msg.id);
        }
    });

    socket.on('make:pass', function (msg) {
        console.log('making a pass for gameid ' + msg.id);
        var game = gameQueue.getGame(msg.id);
        var gameState = game.state;
        if (gameState.currPlayer != socket.id) {
            console.log('invalid player made move');
            return;
        }
        gameState.getNextPlayer();
        game.notifyAll('move:made', gameState);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

http.listen(3000, function () {
        console.log('listening on port:3000');
    }
);

