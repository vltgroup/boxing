class HttpUtils {
  
  constructor() {
  }
  
  readJson(request, cb) {
    let data = '';
    request.on('data', chunk => {
      data += chunk;
    })
    request.on('end', () => {
      cb(JSON.parse(data));
    });
  }

  writeError(response, errorMessage, headers) {
    headers["Content-Type"] = "application/json";
    response.writeHead(500, headers);
    response.write(JSON.stringify({error: true, "errorMessage": errorMessage}));
    response.end();     
  }
  
  writeJson(response, resp, headers) {
    headers["Content-Type"] = "application/json";
    response.writeHead(200, headers);
    response.write(JSON.stringify(resp));
    response.end();
  }
  
  writeWsError(ws, request, ex) {
    var msg = {
      "type": "response",
      "requestId": request.id,
      "error": true,
      "errorMessage": ex.message
    }
    ws.send(JSON.stringify(msg));
  }

  writeWsResponse(ws, request, response) {
    var msg = {
      "type": "response",
      "requestId": request.id,
      "response": response
    }
    ws.send(JSON.stringify(msg));
  }

  writeWsStatus(ws, status) {
    var msg = status;
    msg.type = "state";
    ws.send(JSON.stringify(msg));
  }
  
}

module.exports = new HttpUtils();
