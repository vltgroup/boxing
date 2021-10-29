const Url = require('url');
const WebSocket = require('ws');
const Http = require('http');
const FileSystem = require('fs');
const Tokens = require('./server/tokens');
const UserStates = require('./server/userStates');
const HttpUtils = require('./server/httpUtils');
const Settings = require('./server/settings');
const mime = require('mime-types')

const TOKEN_EXPIRED_CLOSURE_REASON = "TOKEN_EXPIRED";

const webSocketServer = new WebSocket.Server({ noServer: true });
const httpServer = Http.createServer(function(request, response) {
  const { pathname } = Url.parse(request.url);
  if (pathname === '/login' && request.method === 'POST') {
    HttpUtils.readJson(request, function(req) {
      if (!req.username) {
        HttpUtils.writeError(response, "Absent or invalid username");
      } else if (!req.password || req.password != Settings.USERS_PASSWORD) {
        HttpUtils.writeError(response, "Password mismatch");
      } else {
        var token = Tokens.createToken(req.username, Settings.TOKEN_TTL);
        HttpUtils.writeJson(response, {"token": token.uuid});
      }
    });
  } else if (pathname.startsWith('/assets/')) {
    // assets file download (unsafe)
    FileSystem.readFile('.' + pathname, function(err, data) {
      if (err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write('Failed to load ' + pathname + '. Details: ' + err.message);
        response.end();
      } else {
        response.writeHead(200, {"Content-Type": mime.lookup(pathname.substr(1))});
        response.write(data);  
        response.end();
      }
    });
    
  } else {
    // other urls might be path inside HTML5 app routining, so return index.html
    FileSystem.readFile('./index.html', function(err, html) {
      if (err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write('Failed to load index.html. Details: ' + err.message);
        response.end();
      } else {
        response.writeHead(200, {"Content-Type": "text/html"});
        response.write(html);  
        response.end();
      }
    });
  }
});

webSocketServer.on('connection', function connection(ws) {
  var userState = UserStates.getUserState(ws.token.username);
  userState.on('change', function() {
    writeUserState(ws, userState);
  });
  writeUserState(ws, userState);
  ws.on('message', function(message) {
    try {
      const request = JSON.parse(message);
      try {
        var userState = UserStates.getUserState(ws.token.username);
        if (request.action === 'join') {
          userState.joinGame();
        } else if (request.action === 'undo_join') {
          userState.undoJoinGame();
        } else if (request.action === 'game_set_block') {
          userState.setBlock(request.block);
        } else if (request.action === 'game_set_kick') {
          userState.setKick(request.kick);
        } else if (request.action === 'logout') {
          ws.token.expire();
        } else {
          throw new Error("Unsupported action: " + request.action);
        }
        HttpUtils.writeWsResponse(ws, request, "OK");
      } catch (ex) {
        HttpUtils.writeWsError(ws, request, ex);
      }
    } catch (parseError) {
      console.log(parseError.message);
    }
  });
});

httpServer.on('upgrade', function upgrade(request, socket, head) {
  const { pathname, query } = Url.parse(request.url, true);
  if (pathname === '/websocket') {
    const token = Tokens.findTokenByUuid(query.token);
    if (!token) {
      console.log('Attempt to open websocket for expired token: ' + query.token);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    webSocketServer.handleUpgrade(request, socket, head, function done(ws) {
      // token might expire while handshake, recheck if it is still valid
      if (token.expired) {
        console.log('Attempt to open websocket for expired token (2): ' + token.uuid);
        ws.close(1000, TOKEN_EXPIRED_CLOSURE_REASON);
        return;
      }
      token.bindWebSocket(ws);
      ws.on('close', function() {
        ws.isClosed = true;
      });
      token.on('expire', function() {
        if (ws.isClosed) {
          return;
        }
        console.log('Closing websocket due to expired token: ' + token.uuid);        
        ws.close(1000, TOKEN_EXPIRED_CLOSURE_REASON);
      });
      webSocketServer.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

function writeUserState(ws, userState) {
  var msg = {};
  msg.state = userState.status;
  msg.username = userState.username;
  if (userState.game) {
    msg.game = {};
    msg.game.round = userState.game.currentRound;
    msg.game.completed = userState.game.completed;
    msg.game.roundCompleted = userState.game.roundCompleted;
    msg.game.mine = {};
    var p1 = userState.getPlayer();
    var p2 = userState.getEnemyPlayer();
    msg.game.mine.kick = p1.currentKick;
    msg.game.mine.block = p1.currentBlock;
    msg.game.mine.score = p1.score;
    msg.game.mine.username = p1.userState.username;
    msg.game.enemy = {};
    msg.game.enemy.username = p2.userState.username;
    msg.game.enemy.score = p2.score;
    if (msg.game.roundCompleted) {
      msg.game.mine.hit = p1.lastRoundHit;
      msg.game.enemy.kick = p2.currentKick;
      msg.game.enemy.block = p2.currentBlock;
      msg.game.enemy.hit = p2.lastRoundHit;      
    }
    if (msg.game.completed) {
      msg.game.mine.winner = p1.winner;
      msg.game.enemy.winner = p2.winner;
    }
    if (userState.game) {
      msg.game.timeout = userState.game.timeout;
      msg.game.timeoutPassed = new Date().getTime() - userState.game.timeoutTs;
    }
  } else {
    msg.waitingCount = UserStates.getWaitingCount();
  }
  HttpUtils.writeWsStatus(ws, msg);
}

httpServer.listen(8080);
console.log("Listening on 8080 port. WebSocket path: /websocket");
