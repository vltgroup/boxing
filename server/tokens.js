const EventEmitter = require('events');
const Uuid = require('uuid');
const Token = require('./token');

class Tokens extends EventEmitter {
  
  constructor() {
    super();    
    this.username2token = {};
    this.uuid2token = {};
  }
  
  onTokenExpire = (token) => {
    var activeToken = this.username2token[token.username];
    if (activeToken === token) {
      delete this.username2token[token.username];
    }
    delete this.uuid2token[token.uuid];
  }
  
  createToken = (username, timeout) => {
    var prevToken = this.username2token[username];
    if (prevToken) {
      prevToken.expire();
    }
    var token = new Token(username, timeout);
    this.username2token[username] = token;
    this.uuid2token[token.uuid] = token;
    token.prolongate();
    token.on('expire', this.onTokenExpire);
    return token;
  }
  
  findTokenByUuid = (uuid) => {
    if (!uuid) {
      return null;
    }
    return this.uuid2token[uuid];
  }
  
  findTokenByUsername = (username) => {
    if (!username == null) {
      return null;
    }
    return this.username2token[username];    
  }
    
}

module.exports = new Tokens();
