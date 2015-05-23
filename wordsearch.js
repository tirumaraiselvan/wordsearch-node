/**
 * Created by tselvan on 5/15/2015.
 */

var app = angular.module('game', []);

app.factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});

app.factory('move', function () {

    return function (board, gameId, playerId, boardState) {

        console.log('inside move service for gameId ' + gameId);
        console.log(board);
        var len = board.length;
        var isRow = false;
        var isCol = false;
        var found = false;
        var x = -1;
        var y = -1;
        var lastx = -1;
        var lasty = -1;

        //this block finds if there are two contiguous row or col selections
        for (var i = 0; i < len; i++) {
            for (var j = 0; j < len; j++) {
                if (board[i][j] == 2 && j < len - 1 && board[i][j + 1] == 2) {
                    x = i;
                    y = j;
                    found = true;
                    isRow = true;
                    break;
                }
                else if (board[i][j] == 2 && i < len - 1 && board[i + 1][j] == 2) {
                    x = i;
                    y = j;
                    found = true;
                    isCol = true;
                    break;
                }
            }
            if (found)
                break;
        }

        console.log('start coord: ' + x + ',' + y);

        //if two contiguous row or col selections were found, make sure there are on other selections
        //apart from the selected row or col
        if (found) {
            if (isRow) {
                for (var i = 0; i < len; i++) {
                    if (x == i) continue;
                    for (var j = 0; j < len; j++) {
                        if (board[i][j] == 2) {
                            found = false;
                            break;
                        }
                    }
                }
            }

            if (isCol) {
                for (var j = 0; j < len; j++) {
                    if (j == y) continue;
                    for (var i = 0; i < len; i++) {
                        if (board[i][j] == 2) {
                            found = false;
                            break;
                        }

                    }
                }
            }
        }

        //make sure the row or col selected has only one continuous chunk
        if (found) {
            if (isRow) {
                lastx = x;
                for (var j = 0; j < y; j++)  //nothing before the continuous chunk
                    if (board[x][j] == 2) found = false;
                for (var j = y; j < len; j++)
                    if (board[x][j] != 2 && lasty == -1) lasty = j-1;
                if(lasty == -1) lasty = len-1;
                for(var j = lasty+1; j < len; j++)  //nothing after the continuous chunk
                    if(board[x][j] == 2) found = false;
            }

            if (isCol) {
                lasty = y;
                for (var i = 0; i < x; i++)
                    if (board[i][y] == 2) found = false;
                for (var i = x; i < len; i++)
                    if (board[i][y] != 2 && lastx == -1) lastx = i-1;
                if(lastx == -1) lastx = len-1;
                for(var i=lastx+1; i<len; i++)
                    if(board[i][y] == 2) found = false;
            }
        }

        console.log('end coord: ' + lastx + ', ' + lasty);

        //make sure it is not a previous selection
        if (found) {
            var newSelection = false;
            if (isRow) {
                for (var j = y; j <= lasty; j++) {
                    if (boardState[x][j] != 1) {
                        newSelection = true;
                        break;
                    }
                }
                if (!newSelection)
                    found = false;
            }
            if (isCol) {
                for (var i = x; i <= lastx; i++) {
                    if (boardState[i][y] != 1) {
                        newSelection = true;
                        break;
                    }
                }
                if (!newSelection)
                    found = false;
            }
            console.log('new selection is ' + newSelection);
        }
        return {
            'id': gameId,
            'playerId': playerId,
            'found': found,
            'isRow': isRow,
            'isCol': isCol,
            'startxy': {'x': x, 'y': y},
            'endxy': {'x': lastx, 'y': lasty}
        };
    }
});


app.controller('AdminCtrl', ['$scope', 'socket', 'move', function ($scope, socket, move) {

    $scope.gameId = -1;
    $scope.players = [];
    $scope.started = false;
    $scope.initialized = false;
    $scope.currPlayer = -1;
    $scope.currPlayerIndex = -1;
    $scope.myId = -1;
    $scope.finished = false;
    $scope.nick = "";

    //0 is unselected, 1 is selected past game, 2 is currently selection
    $scope.changeClass = function (row, col) {
        switch ($scope.boardClass[row][col]) {
            case 2:
                $scope.boardClass[row][col] = $scope.boardState[row][col];
                break;
            default:
                $scope.boardClass[row][col] = 2;
        }
    };

    $scope.createGame = function () {
        console.log('nick is ' + $scope.nick);
        if ($scope.nick === "")
            $scope.nick = "player" + Math.floor(1000 * Math.random() + 1);
        socket.emit('new:game', $scope.nick);
    };

    $scope.startGame = function () {
        if ($scope.players.length > 1)
            socket.emit('start:game', {id: $scope.gameId});
        else alert('Need atleast 2 players to start the game!');
    };

    $scope.makeMove = function () {
        var moveObj = move($scope.boardClass, $scope.gameId, $scope.myId, $scope.boardState);
        console.log('move obj is ');
        console.log(moveObj);
        if (!moveObj.found) {
            alert('Not Valid Move...Try again!');
            $scope.boardClass = $scope.boardState.map(function (arr) {
                return arr.slice();
            });
        }
        else {

            socket.emit('make:move', moveObj);
        }
    };

    $scope.makePass = function () {
        var passObj = {'id': $scope.gameId, 'playerId': $scope.myId};
        socket.emit('make:pass', passObj);
    };

    socket.on('new:game init', function (game) {
        $scope.gameId = game.id;
        $scope.initialized = true;
        console.log(game);
        socket.emit('new:player', {id: $scope.gameId, nick: $scope.nick});
    });

    socket.on('new:player', function (players) {
        console.log(players);
        $scope.players = players;
    });

    socket.on('game:started', function (state) {
        console.log(state);
        $scope.started = true;
        $scope.board = state.board;
        $scope.boardClass = state.boardState.map(function (arr) {
            return arr.slice();
        });
        $scope.boardState = state.boardState.map(function (arr) {
            return arr.slice();
        });
        $scope.currPlayer = state.currPlayer;
        $scope.score = state.score;
        $scope.currPlayerIndex = state.currPlayerIndex;
        $scope.wordsRemaining = state.wordsRemaining;

    });

    socket.on('id:player', function (uniqId) {
        console.log(uniqId);
        $scope.myId = uniqId;
    });

    socket.on('move:made', function (state) {
        console.log(state);
        $scope.boardClass = state.boardState.map(function (arr) {
            return arr.slice();
        });
        $scope.boardState = state.boardState.map(function (arr) {
            return arr.slice();
        });
        $scope.currPlayer = state.currPlayer;
        $scope.score = state.score;
        $scope.currPlayerIndex = state.currPlayerIndex;
        $scope.wordsRemaining = state.wordsRemaining;
    });

    socket.on('game:over', function () {
        $scope.finished = true;
        alert('game over');
    });

}]);


app.controller('ClientCtrl', ['$scope', 'socket', 'move', function ($scope, socket, move) {

    $scope.players = [];
    $scope.started = false;
    $scope.initialized = false;
    $scope.currPlayer = -1;
    $scope.currPlayerIndex = -1;
    $scope.myId = -1;
    $scope.myIndex = -1;
    $scope.nick = "";
    $scope.wordsRemaining = -1;

    $scope.changeClass = function (row, col) {
        switch ($scope.boardClass[row][col]) {
            case 2:
                $scope.boardClass[row][col] = $scope.boardState[row][col];
                break;
            default:
                $scope.boardClass[row][col] = 2;
        }
    };

    $scope.joinGame = function () {
        console.log('nick is ' + $scope.nick);
        if ($scope.gameId === undefined) {
            alert('GameID is mandatory!');
            return;
        }
        if ($scope.nick === "")
            $scope.nick = "player" + Math.floor(1000 * Math.random() + 1);
        $scope.initialized = true;
        socket.emit('new:player', {id: $scope.gameId, nick: $scope.nick});
    };


    $scope.makeMove = function () {
        var moveObj = move($scope.boardClass, $scope.gameId, $scope.myId, $scope.boardState);
        console.log('move obj is ');
        console.log(moveObj);
        if (!moveObj.found) {
            alert('Not Valid Move...Try again!');
            $scope.boardClass = $scope.boardState.map(function (arr) {
                return arr.slice();
            });
        }
        else {

            socket.emit('make:move', moveObj);
        }
    };

    $scope.makePass = function () {
        var passObj = {'id': $scope.gameId, 'playerId': $scope.myId}
        socket.emit('make:pass', passObj);
    };

    socket.on('new:player', function (players) {
        console.log(players);
        $scope.players = players;
    });

    socket.on('game:started', function (state) {
        console.log(state);
        $scope.started = true;
        $scope.board = state.board;
        $scope.boardClass = state.boardState.map(function (arr) {
            return arr.slice();
        });
        $scope.boardState = state.boardState.map(function (arr) {
            return arr.slice();
        });
        $scope.currPlayer = state.currPlayer;
        $scope.score = state.score;
        $scope.currPlayerIndex = state.currPlayerIndex;
        $scope.wordsRemaining = state.wordsRemaining;

    });

    socket.on('id:player', function (uniqId) {
        console.log(uniqId);
        $scope.myId = uniqId;
    });

    socket.on('move:made', function (state) {
        console.log(state);
        $scope.boardClass = state.boardState.map(function (arr) {
            return arr.slice();
        });
        $scope.boardState = state.boardState.map(function (arr) {
            return arr.slice();
        });
        $scope.currPlayer = state.currPlayer;
        $scope.score = state.score;
        $scope.currPlayerIndex = state.currPlayerIndex;
        $scope.wordsRemaining = state.wordsRemaining;

    });

    socket.on('game:over', function () {
        $scope.finished = true;
        alert('game over');
    });

    socket.on('undefined:game', function () {
        alert('Server could not find the required GameId');
        $scope.initialized = false;
    });

    socket.on('already:started', function () {
        alert('The required game is already in progress!');
        $scope.initialized = false;
    });

}]);
