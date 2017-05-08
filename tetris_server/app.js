var io = require('socket.io')();
const config =
{
	checkAddressEnabled: false,
	maxUserCount: 2
};
var connectedUsers = {};
var gameRoom = {waitRoom: {}, readyRoom: {}, startedRoom: {}};

setInterval(function()
{
	console.log('START-----------------------------------------------------');
	console.log('user = ');
	console.log(connectedUsers);
	console.log('room = ');
	console.log(JSON.stringify(gameRoom));
	console.log('END-------------------------------------------------------');
}, 5000);

io.sockets.on('connection', function(socket)
{
	// socket.emit('connected', {clientId: socket.id});
	// 사용자가 Multi Play 대기 큐에 합류
	socket.on('joinQueue', function(data)
	{
		var clientId = socket.id;
		// 다른 방에 참여중일 경우 방을 빠져나옴.
		exitRoomHandler(clientId);
		// 사용자가 한번도 서버에 접근한 적이 없을 경우 서버에 clientId를 등록
		if(!connectedUsers.hasOwnProperty(socket.id))
		{
			connectedUsers[clientId] = {status: 'connected', roomId: null};
		}
		connectedUsers[clientId].status = 'waiting';

		var room = null;
		// 대기 상태인 방 중 사용자가 요청한 인원 수와 일치하는 방이 있는지 체크하고 있을 경우 해당 방으로 진입
		for(var key in gameRoom.waitRoom)
		{
			if(data.maxUserCount == gameRoom.waitRoom[key].maxUserCount)
			{
				room = gameRoom.waitRoom[key];
				break;
			}
		}
		// 대기 상태인 방이 없거나 사용자가 요청한 인원 수의 방이 없을 경우 사용자가 방을 생성
		if(gameRoom.waitRoom.length == 0 || room == null)
		{
			room = new Room();
			room.maxUserCount = data.maxUserCount;
			gameRoom.waitRoom[room.roomId] = room;
		}
		room.players.push(clientId);
		connectedUsers[clientId].roomId = room.roomId;
		// 같은 방에 진입한 사용자들 단위로 브로드캐스팅을 위하여 소켓에 join
		socket.join(room.roomId);
		io.sockets.in(room.roomId).emit('responseRoomInfo', {maxUserCount: room.maxUserCount, currentUserCount: room.players.length});

		// 해당 방의 인원 수가 꽉 찰 경우
		if(room.players.length == room.maxUserCount)
		{
			// 방에 참여한 인원들의 상태를 'unready'로 변경
			for(var i = 0; i < gameRoom.waitRoom[room.roomId].players.length; i++)
			{
				connectedUsers[gameRoom.waitRoom[room.roomId].players[i]].status = 'unready';
			}
		  // 해당 방을 대기열에서 삭제
			gameRoom.readyRoom[room.roomId] = copyObject(room);
			delete gameRoom.waitRoom[room.roomId];
			io.sockets.in(room.roomId).emit('standby');
		}
	});
	// 사용자의 방 정보 요청
	socket.on('requestRoomInfo', function()
	{
		var clientId = socket.id;
		// 사용자의 방 정보 요청에 대한 응답
		if(connectedUsers[clientId].roomId != null && gameRoom.readyRoom[connectedUsers[clientId].roomId] != null)
			socket.emit('responseRoomInfo', {clientId: clientId, roomInfo: gameRoom.readyRoom[connectedUsers[clientId].roomId]});
	});
	// 게임에 합류한 사용자의 게임 준비
	socket.on('ready', function()
	{
		var clientId = socket.id;
		var roomId = connectedUsers[clientId].roomId;
		if(gameRoom.readyRoom[roomId] == null)
			return;

		if(gameRoom.readyRoom[roomId].isDestroyed)
		{
			socket.emit('roomDestroyed');
			delete gameRoom.readyRoom[roomId];
			return;
		}

		connectedUsers[clientId].status = 'ready';
		gameRoom.readyRoom[roomId].readyCount += 1;

		// 모든 사용자가 준비하여 게임 시작
		if(gameRoom.readyRoom[roomId].maxUserCount ==
			 gameRoom.readyRoom[roomId].readyCount)
		{
			gameRoom.startedRoom[roomId] = copyObject(gameRoom.readyRoom[roomId]);
			delete gameRoom.readyRoom[roomId];

			// 방에 참여한 인원들의 상태를 'started'로 변경
			for(var i = 0; i < gameRoom.startedRoom[roomId].players.length; i++)
			{
				connectedUsers[gameRoom.startedRoom[roomId].players[i]].status = 'started';
			}
			io.sockets.in(connectedUsers[clientId].roomId).emit('startMultiGame');
		}
	});
	// 게임 준비 취소
	socket.on('unready', function()
	{
		var clientId = socket.id;

		if(connectedUsers[clientId].roomId == null || gameRoom.readyRoom[connectedUsers[clientId].roomId] == null)
			return;

		connectedUsers[clientId].status = 'unready';
		gameRoom.readyRoom[connectedUsers[clientId].roomId].readyCount -= 1;
	});
	// 사용자의 타일 상태와 점수를 같은 방 사용자들에게 전송
	socket.on('sendFormAndScore', function(data)
	{
		var clientId = socket.id;
		socket.broadcast.to(connectedUsers[clientId].roomId).emit('formAndScore', {sender: clientId, data: data});
	});
	// 사용자 Game over
	socket.on('playerDie', function()
	{
		var clientId = socket.id;
		var roomId = connectedUsers[clientId].roomId;
		var room = gameRoom.startedRoom[roomId];
		var isGameEnd = true;

		if(room == null)
			return;
		connectedUsers[clientId].status = 'die';
		console.log('player Die');

		// 방 내의 모든 사용자가 죽은 상태인지 확인
		for(var idx in room.players)
		{
			if(connectedUsers[room.players[idx]] != null && connectedUsers[room.players[idx]].status != 'die')
			{
				isGameEnd = false;
				break;
			}
		}
		// 게임 종료
		if(isGameEnd)
		{
			console.log('all die');
			room.readyCount = 0;
			room.dieCount = 0;
			gameRoom.readyRoom[roomId] = copyObject(gameRoom.startedRoom[roomId]);
			delete gameRoom.startedRoom[roomId];
			io.sockets.in(roomId).emit('gameEnd');
		}
	});
	socket.on('exitQueue', function()
	{
		var clientId = socket.id;
		var room = getRoom(clientId);
		if(connectedUsers[clientId] != null && connectedUsers[clientId].roomId != null)
			socket.leave(connectedUsers[clientId].roomId);
		socket.broadcast.to(connectedUsers[clientId].roomId).emit('roomInfo', {maxUserCount: room.maxUserCount, currentUserCount: room.players.length - 1});
		exitRoomHandler(clientId);
		afterExitRoom();
	});
	// 사용자의 접속 해제
	socket.on('disconnect', function()
	{
		var clientId = socket.id;
		if(connectedUsers[clientId] == null || connectedUsers[clientId].roomId == null)
			return;

		var room = gameRoom.readyRoom[connectedUsers[clientId].roomId] || gameRoom.startedRoom[connectedUsers[clientId].roomId];

		if(room != null && connectedUsers[clientId] != null && connectedUsers[clientId].roomId != null)
		{
			room.isDestroyed = true;
			socket.leave(connectedUsers[clientId].roomId);
			delete room.players[clientId];
		}

		exitRoomHandler(clientId);
		disconnectUser(clientId);
	});
	socket.on('forceDisconnect', function()
	{
		socket.disconnect();
	});
	function getRoom(id)
	{
		if(connectedUsers.hasOwnProperty(id) && connectedUsers[id].roomId != null)
		{
			var roomId = connectedUsers[id].roomId;
			if(connectedUsers[id].status == 'waiting')
			{
				return gameRoom.waitRoom[roomId];
			}
			else if(connectedUsers[id].status == 'ready')
			{
				return gameRoom.readyRoom[roomId];
			}
			else if(connectedUsers[id].status == 'started')
			{
				return gameRoom.startedRoom[roomId];
			}
		}
	}
	function copyObject(obj)
	{
		return JSON.parse(JSON.stringify(obj));
	}
	function Room()
	{
		this.createDate = new Date().getTime();
		this.roomId = this.createDate;
		this.players = [];
		this.readyCount = 0;
		this.maxUserCount = 0;
		this.isDestroyed = false;
	}
	function disconnectUser(id)
	{
		if(connectedUsers.hasOwnProperty(id))
		{
			delete connectedUsers[id];
		}
	}
	function exitRoomHandler(id)
	{
		if(connectedUsers[id] != null && connectedUsers[id].roomId != null)
			socket.leave(connectedUsers[id].roomId, null);
		if(connectedUsers.hasOwnProperty(id) && connectedUsers[id].roomId != null)
		{
			var roomId = connectedUsers[id].roomId;
			if(roomId == null)
				console.log('room is null');
			else
			{
				var room = gameRoom.waitRoom[roomId] ||
					         gameRoom.readyRoom[roomId] ||
					         gameRoom.startedRoom[roomId];
				exitRoom(room.players, id);
			}
			connectedUsers[id].status = 'connected';
			connectedUsers[id].roomId = null;
		}
		afterExitRoom();
	}
	function exitRoom(players, id)
	{
		for(var idx in players)
		{
			if(players[idx] == id)
			{
				players.splice(idx, 1);
				break;
			}
		}
	}
	function afterExitRoom()
	{
		for(var status in gameRoom)
		{
			for(var key in gameRoom[status])
			{
				if(gameRoom[status][key].players.length == 0)
				{
					delete gameRoom[status][key];
				}
			}
		}
	}
});
io.listen(8081);