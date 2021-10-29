const EventEmitter = require('events');
const Uuid = require('uuid');

class Token extends EventEmitter {

  constructor(username, timeout){
    super();
    this.username = username;
    this.uuid = Uuid.v4();
    this.timeout = timeout;
    this.expired = false;
    this.webSockets = {};
    console.log('Token ' + this.uuid + ' created');
  }
  
  expireByTimeout = () => {
    // if there is active websocket for this token
    // then keep it alive
    if (this.webSockets.length > 0) {
      this.prolongate();
    } else {
      this.expire();
    }
  }

  expire = () => {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }    
    this.expired = true;
    this.emit('expire', this);
  }
  
  prolongate = () => {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.timeoutTimer = setTimeout(this.expireByTimeout, this.timeout);
  }
  
  bindWebSocket = (ws) => {
    ws.token = this;
    var map = this.webSockets;
    map[ws] = ws;
    ws.on('close', function() {
      delete map[ws];
    });
  }
  
}

module.exports = Token;