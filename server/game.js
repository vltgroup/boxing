const EventEmitter = require('events');
const Settings = require('./settings');

const ROUND_TIMEOUT = 15000;

class PlayerInfo {
  
  constructor(userState){
    this.userState = userState;
    this.currentBlock = 0;
    this.currentKick = 0;
    this.lastRoundHit = false;
    this.score = 0;
    this.winner = false;
  }
}

class Game extends EventEmitter {

  constructor(user1, user2){
    super();
    this.player1 = new PlayerInfo(user1);
    this.player2 = new PlayerInfo(user2);
    this.players = [this.player1, this.player2];
    this.currentRound = 0;       
    this.roundCompleted = true;
    this.completed = false;
    this.timeout = 0;
    this.timeoutTs = new Date().getTime();
  }
  
  start = () => {
    this.player1.userState.bindGame(this, 1);
    this.player2.userState.bindGame(this, 2);
    this.roundStart();
  }

  roundStart = () => {
    this.currentRound++;
    this.roundCompleted = false;
    this.player1.currentBlock = 0;
    this.player1.currentKick = 0;
    this.player1.lastRoundHit = false;
    this.player2.currentBlock = 0;
    this.player2.currentKick = 0;
    this.player2.lastRoundHit = false;
    this.timeout = Settings.GAME_ROUND_TIMEOUT;
    this.timeoutTs = new Date().getTime();
    setTimeout(this.roundEnd, Settings.GAME_ROUND_TIMEOUT);
    this.emit('change', this);
  }
  
  roundEnd = () => {
    this.roundCompleted = true;
    if (this.player1.currentKick && this.player1.currentKick != this.player2.currentBlock) {
      this.player1.score++;
      this.player1.lastRoundHit = true;
    }
    if (this.player2.currentKick && this.player2.currentKick != this.player1.currentBlock) {
      this.player2.score++;
      this.player2.lastRoundHit = true;
    }
    if (this.currentRound === Settings.GAME_ROUNDS) {
      this.gameEnd();
    } else {
      this.timeout = Settings.GAME_RESULT_TIMEOUT;
      this.timeoutTs = new Date().getTime();
      setTimeout(this.roundStart, Settings.GAME_RESULT_TIMEOUT);    
    }
    this.emit('change', this);
  }
  
  gameEnd = () => {
    this.completed = true;
    if (this.player1.score > this.player2.score) {
      this.player1.winner = true;
    } else if (this.player2.score > this.player1.score) {
      this.player2.winner = true;
    }
    this.timeout = Settings.GAME_RESULT_TIMEOUT;
    this.timeoutTs = new Date().getTime();
    setTimeout(this.gameClose, Settings.GAME_RESULT_TIMEOUT);    
  }
  
  gameClose = () => {
    this.emit('close', this);
  }
  
  setBlock = (playerNo, block) => {
    if (block < 0 || block > 3) {
      throw new Error("Invalid block value");
    }
    if (playerNo < 1 || playerNo > 2) {
      throw new Error("Invalid player number");
    }
    if (this.roundCompleted) {
      throw new Error("Round completed and block can not be changed");
    }
    this.players[playerNo-1].currentBlock = block;
  }
  
  setKick = (playerNo, kick) => {
    if (kick < 0 || kick > 3) {
      throw new Error("Invalid kick value");
    }
    if (playerNo < 1 || playerNo > 2) {
      throw new Error("Invalid player number");
    }
    if (this.roundCompleted) {
      throw new Error("Round completed and kick can not be changed");
    }
    this.players[playerNo-1].currentKick = kick;
  } 

  getPlayer = (playerNo) => {
    return this.players[playerNo-1];
  }
  
  getEnemyPlayer = (playerNo) => {
    if (playerNo == 1) {
      playerNo = 2;
    } else {
      playerNo = 1;
    }
    return this.players[playerNo-1];
  }
  
}

module.exports = Game;