const EventEmitter = require('events');
const UserState = require('./userState');
const UserStateStatus = require('./userStateStatus');
const Settings = require('./settings');
const Game = require('./game');

const USER_STATE_TIMEOUT = 5*60000;

class UserStates extends EventEmitter {
  
  constructor(){
    super();
    this.users = new Map();
  }
  
  onStateExpire = (state) => {
    var activeState = this.users.get(state.username);
    if (activeState === state) {
      this.users.delete(state.username);
    }
  }
  
  getUserState = (username) => {
    var state = this.users.get(username);
    if (state == null) {
      state = new UserState(username, USER_STATE_TIMEOUT);
      state.on('expire', this.onStateExpire);
      this.users.set(username, state);
    }
    return state;
  }
  
  startNewGameJob = () => {
    var waitingUsers = Array.from(this.users.values()).filter(function(user) {
      return user.status === UserStateStatus.WAIT;
    });
    if (waitingUsers.length >= 2) {
      var i1 = Math.floor(Math.random() * waitingUsers.length);
      var user1 = waitingUsers[i1];
      waitingUsers.splice(i1, 1); 
      var i2 = Math.floor(Math.random() * waitingUsers.length);
      var user2 = waitingUsers[i2];
      var game = new Game(user1, user2);
      game.start();
    }
  }
  
  getWaitingCount = () => {
    var waitingUsers = Array.from(this.users.values()).filter(function(user) {
      return user.status === UserStateStatus.WAIT;
    });
    return waitingUsers.length;
  }
}

var states = new UserStates();
setInterval(states.startNewGameJob, Settings.GAME_START_TIMEOUT);

module.exports = states;