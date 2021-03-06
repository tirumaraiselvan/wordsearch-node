/**
 * Created by tselvan on 5/15/2015.
 */


var express  = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');

app.use(express.static(__dirname+'/public'));

app.get('/', function (req, res) {
    res.sendFile('index.html', {root: __dirname})
});

app.get('/admin', function (req, res) {
    res.sendFile('admin.html', {root: __dirname})
});

app.get('/client', function (req, res) {
    res.sendFile('client.html', {root: __dirname})
});

GameState.prototype.createNewBoard = function (len) {
    var charList = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    var board = zero2D(len, len, '.');
    var filePath = path.join(__dirname, 'words.txt');
    var allWords = fs.readFileSync(filePath, 'ascii').toString().split("\n");
    var maxWords = 15;

    for (var i = 0; i < maxWords; i++) {
        var random = Math.floor(Math.random() * 3000) + 1;
        this.boardWords.push(allWords[random]);
        console.log(this.boardWords[i]);
    }
    var isRow = true;
    var checkFit = false;
    var countBoardWords = 0;
    for (var wordIndex = 0; wordIndex < maxWords; wordIndex++) {
        var wordLen = this.boardWords[wordIndex].length;
        var countTry = 3;

        while (countTry--) {
            var x = Math.floor(Math.random() * len);
            console.log('Row? ' + isRow + ', x: ' + x + ' ' + this.boardWords[wordIndex]);
            checkFit = false;
            if (isRow) {
                for (var i = Math.floor(Math.random() * len); i < len; i++) {
                    if (wordLen + x - 1 < len) {
                        checkFit = true;
                        console.log('fits in row ' + i + ': ' + checkFit);
                        for (var k = x, l = 0; l < wordLen; k++, l++)
                            if ((board[i][k] != '.') && (board[i][k] != this.boardWords[wordIndex][l]))
                                checkFit = false;
                        console.log('compatible: ' + checkFit);
                        if (checkFit) {
                            for (var k = x, l = 0; l < wordLen; k++, l++)
                                board[i][k] = this.boardWords[wordIndex][l];
                            break;
                        }
                    }
                }
                if (checkFit) break;
            }
            else {
                for (var j = Math.floor(Math.random() * len); j < len; j++) {
                    if (wordLen + x - 1 < len) {
                        checkFit = true;
                        console.log('fits in col ' + j + ': ' + checkFit);
                        for (var k = x, l = 0; l < wordLen; k++, l++)
                            if ((board[k][j] != '.') && (board[k][j] != this.boardWords[wordIndex][l]))
                                checkFit = false;
                        console.log('compatible: ' + checkFit);
                        if (checkFit) {
                            for (var k = x, l = 0; l < wordLen; k++, l++)
                                board[k][j] = this.boardWords[wordIndex][l];
                            break;
                        }
                    }
                }
                if (checkFit) break;
            }
        }
        if (checkFit) countBoardWords++;
        isRow = !isRow;
    }
    for (var i = 0; i < len; i++)
        for (var j = 0; j < len; j++)
            if( board[i][j] == '.')
                board[i][j] = charList[Math.floor((Math.random() * 25) + 1)];

    console.log('num words on board is ' + countBoardWords);
    this.wordsRemaining = countBoardWords;
    return board;
};


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
    this.boardWords = [];
    this.wordsRemaining = -1;
    this.board = this.createNewBoard(15);
    this.boardState = zero2D(this.board.length, this.board.length, 0);
    this.score = Array.apply(null, new Array(game.players.length)).map(Number.prototype.valueOf, 0);
    this.currPlayer = -1;
    this.currPlayerIndex = -1;
    this.numPlayers = game.players.length;
    game.started = true;
}

GameState.prototype.validateMove = function (moveObj) {

    if (moveObj.isRow) {
        var start = moveObj.startxy.y;
        var end = moveObj.endxy.y;
        var rowId = moveObj.startxy.x;
        var word = "";
        for (var j = start; j <= end; j++)
            word += this.board[rowId][j];
        return (this.boardWords.indexOf(word) != -1);
    }
    else {
        var start = moveObj.startxy.x;
        var end = moveObj.endxy.x;
        var colId = moveObj.startxy.y;
        var word = "";
        for (var i = start; i <= end; i++)
            word += this.board[i][colId];
        return (this.boardWords.indexOf(word) != -1);
    }
};

GameState.prototype.updateScore = function (playerIndex, score) {
    console.log('updating score of playerid ' + this.currPlayerIndex + ' to ' + score);
    this.score[playerIndex] += score;
};

GameState.prototype.makeMove = function (moveObj) {
    if (!this.validateMove(moveObj)) {
        return false;
    }
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

var port = process.env.PORT || 3000;
http.listen(port, function () {
        console.log('listening on port:' + port);
    }
);

