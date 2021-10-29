const EventEmitter = require('events');
const UserStateStatus = require('./userStateStatus');
const Tokens = require('./tokens');

class UserState extends EventEmitter {

  constructor(username, timeout){
    super();
    this.username = username;
    this.timeout = timeout;
    this.status = UserStateStatus.INIT;
  }

  expire = () => {
    if (this.status === UserStateStatus.INIT && !Tokens.findTokenByUsername(this.username)) {
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }    
      this.emit('expire', this);
    } else {
      // if user inside game prolongate or there is active token for this user,
      // then prolongate timeout
      this.prolongate();
    }
  }
  
  prolongate = () => {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.timeoutTimer = setTimeout(this.expire, this.timeout);
  }  
  
  joinGame = () => {
    if (this.status === UserStateStatus.INIT) {
      this.status = UserStateStatus.WAIT;
      this.emit('change');
    } else {
      throw new Error("Action is not support for this state");
    }
  }
  
  undoJoinGame = () => {
    if (this.status === UserStateStatus.WAIT) {
      this.status = UserStateStatus.INIT;
      this.emit('change');
    }    
  }
  
  setBlock = (block) => {
    if (this.game) {
      this.game.setBlock(this.playerNo, block);
    }
  }

  setKick = (kick) => {
    if (this.game) {
      this.game.setKick(this.playerNo, kick);
    }
  }
  
  bindGame = (game, playerNo) => {
    if (this.status === UserStateStatus.WAIT) {
      this.game = game;
      this.playerNo = playerNo;
      this.status = UserStateStatus.GAME;
      this.game.on('change', this.onGameStateChange);
      this.game.on('close', this.onGameClose);
    } else {
      throw new Error("Attempt to start game in invalid state: " + this.status);
    }
  }
  
  onGameStateChange = () => {
    this.emit('change');
  }
  
  onGameClose = () => {
    this.status = UserStateStatus.INIT;
    this.game = null;
    this.playerNo = null;
    this.emit('change');
  }
  
  getPlayer() {
    return this.game.getPlayer(this.playerNo);
  }
  
  getEnemyPlayer() {
    return this.game.getEnemyPlayer(this.playerNo);
  }  
}

module.exports = UserState;