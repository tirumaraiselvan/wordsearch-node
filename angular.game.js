/**
 * Created by tselvan on 5/15/2015.
 */

var app = angular.module('game',[]);

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

app.factory('move', function(){

    return function(board, gameId, playerId){

        console.log('inside move service for gameId ' + gameId );
        console.log(board);
        var len = board.length;
        var isRow = false;
        var isCol = false;
        var rowId = -1;
        var colId = -1;
        for(var i = 0 ; i< len; i++){
            for(var j= 0 ; j< len; j++){
                if(board[i][j] == 2){
                    if((j < len-1) && (board[i][j+1]==2) ) {
                        isRow = true;
                        rowId = i;
                        break;
                    }
                    else if((i< len-1) && (board[i+1][j]==2) ) {
                        isCol = true;
                        colId = j;
                        break;
                    }}}
        }

      return {'id': gameId, 'playerId': playerId, 'isRow': isRow, 'isCol': isCol, 'startxy':{'x':1, 'y':1}, 'endxy':{'x':1,'y':4}};

    }
});


app.controller('AdminCtrl', ['$scope', 'socket','move', function ($scope, socket, move) {

    $scope.gameId = -1;
    $scope.players = [];
    $scope.started = false;
    $scope.initialized = false;
    $scope.currPlayer = -1;
    $scope.myId = -1;
    $scope.finished = false;
    $scope.nick = "";

    //0 is unselected, 1 is selected past game, 2 is currently selection
    $scope.changeClass = function(row,col){
        switch( $scope.boardClass[row][col] ){
            case 2:
                $scope.boardClass[row][col] = $scope.boardState[row][col];
                break;
            default:
                $scope.boardClass[row][col] = 2;
        }
    };

    $scope.createGame = function() {
        console.log('nick is ' + $scope.nick);
        if($scope.nick === "")
            $scope.nick = "player" + Math.floor(1000*Math.random() + 1);
        socket.emit('new:game', $scope.nick);
    };

    $scope.startGame = function() {
        if($scope.players.length > 1)
            socket.emit('start:game', {id: $scope.gameId});
        else alert('Need atleast 2 players to start the game!');
    };

    $scope.makeMove = function() {
        var moveObj = move($scope.boardClass, $scope.gameId, $scope.myId);
        console.log(moveObj);
        if(!(moveObj.isRow || moveObj.isCol)){
            alert('Not Valid Move...Try again!');
            $scope.boardClass = $scope.boardState.map(function(arr) {return arr.slice();});
        }
        else{
            socket.emit('make:move',moveObj);
        }
    };

    $scope.makePass = function(){
        var passObj = {'id': $scope.gameId, 'playerId': $scope.myId};
        socket.emit('make:pass',passObj);
    };

    socket.on('new:game init', function (game){
        $scope.gameId = game.id;
        $scope.initialized = true;
        console.log(game);
        socket.emit('new:player', {id: $scope.gameId, nick: $scope.nick});
    });

    socket.on('new:player', function (players){
        console.log(players);
        $scope.players = players;
    });

    socket.on('game:started', function(state){
        console.log(state);
        $scope.started = true;
        $scope.board = state.board;
        $scope.boardClass = state.boardState.map(function(arr) {return arr.slice();});
        $scope.boardState = state.boardState.map(function(arr) {return arr.slice();});
        $scope.currPlayer = state.currPlayer;
        $scope.score = state.score;
    });

    socket.on('id:player', function(uniqId){
        console.log(uniqId);
        $scope.myId = uniqId;
    });

    socket.on('move:made', function(state){
        console.log(state);
        $scope.boardClass = state.boardState.map(function(arr) {return arr.slice();});
        $scope.boardState = state.boardState.map(function(arr) {return arr.slice();});
        $scope.currPlayer = state.currPlayer;
        $scope.score = state.score;
    });

    socket.on('game:over', function(){
        $scope.finished = true;
        alert('game over');
    });

}]);


app.controller('ClientCtrl', ['$scope', 'socket', 'move', function ($scope, socket, move) {

    $scope.players = [];
    $scope.started = false;
    $scope.initialized = false;
    $scope.currPlayer = -1;
    $scope.myId = -1;
    $scope.myIndex = -1;
    $scope.nick ="";

    $scope.changeClass = function(row,col){
        switch( $scope.boardClass[row][col] ){
            case 2:
                $scope.boardClass[row][col] = $scope.boardState[row][col];
                break;
            default:
                $scope.boardClass[row][col] = 2;
        }
    };

    $scope.joinGame = function () {
        console.log('nick is ' + $scope.nick);
        if($scope.gameId === undefined){
            alert('GameID is mandatory!');
            return;
        }
        if($scope.nick === "")
            $scope.nick = "player" + Math.floor(1000*Math.random() + 1);
        $scope.initialized = true;
        socket.emit('new:player', {id: $scope.gameId, nick: $scope.nick});
    };


    $scope.makeMove = function() {
        var moveObj = move($scope.boardClass, $scope.gameId, $scope.myId);
        console.log(moveObj);
        if(!(moveObj.isRow || moveObj.isCol)){
            alert('Not Valid Move...Try again!');
            $scope.boardClass = $scope.boardState.map(function(arr) {return arr.slice();});
        }
        else{
            socket.emit('make:move',moveObj);
        }
    };

    $scope.makePass = function(){
        var passObj = {'id': $scope.gameId, 'playerId': $scope.myId}
        socket.emit('make:pass',passObj);
    };

     socket.on('new:player', function (players){
        console.log(players);
        $scope.players = players;
    });

    socket.on('game:started', function(state){
        console.log(state);
        $scope.started = true;
        $scope.board = state.board;
        $scope.boardClass = state.boardState.map(function(arr) {return arr.slice();});
        $scope.boardState = state.boardState.map(function(arr) {return arr.slice();});
        $scope.currPlayer = state.currPlayer;
        $scope.score = state.score;

    });

    socket.on('id:player', function(uniqId){
        console.log(uniqId);
        $scope.myId = uniqId;
    });

    socket.on('move:made', function(state){
        console.log(state);
        $scope.boardClass = state.boardState.map(function(arr) {return arr.slice();});
        $scope.boardState = state.boardState.map(function(arr) {return arr.slice();});
        $scope.currPlayer = state.currPlayer;
        $scope.score = state.score;
    });

    socket.on('game:over', function(){
        $scope.finished = true;
        alert('game over');
    });

    socket.on('undefined:game', function(){
        alert('Server could not find the required GameId');
        $scope.initialized=false;
    });

    socket.on('already:started', function(){
        alert('The required game is already in progress!');
        $scope.initialized=false;
    });

}]);
