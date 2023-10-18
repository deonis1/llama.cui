//Installation
// git clone https://github.com/ggerganov/llama.cpp.git
// cd llama.cpp
// sed -i 's/-arch=native/-arch=all/g' Makefile
// make clean && LLAMA_CUBLAS=1 make  -j
//Copyright Denis Spasyuk
//License MIT

const express = require("express");
const { spawn } = require("child_process");
const http = require("http");
const socketIO = require("socket.io");
var cors = require("cors");
const path = require("path");
const vdb = require("./db.js");
const fs = require('fs');

const version = 0.15;
var session = require("express-session");
// const { parseOutput } = require('langchain/output_parser');
const config = require("./config.js");
if (config.login) {
  var hash = require("./hash.js");
}
function ser() {}

ser.init = function (error) {
  // console.time("processing");
  this.connectedClients = new Map();
  this.socketId = null;
  this.messageQueue = []; // Queue to store messages from clients
  this.isProcessing = false; // Flag to track if a message is being proce
  this.llamachild = spawn(config.llamacpp, config.params, {
    stdio: ["pipe", "pipe", process.stderr],
  });
  console.log(config.llamacpp + " " + config.params.join(" "));
  this.buffer = "";
  if(config.piper.enabled){
    this.fullmessage = "";
    this.piperChild();
    this.aplayChild();
    this.FileStream();
    this.piper.stdout.pipe(this.aplay.stdin);
    // this.piper.stdout.pipe(this.wavFileStream);
  }

  this.llamachild.stdout.on("data", (msg) => this.handleLlama(msg));

  // Listen for the 'exit' event to handle process exit.
  this.llamachild.on("exit", (code, signal) => {
    if (code !== null) {
      console.log(`Child process exited with code ${code}`);
    } else if (signal !== null) {
      console.log(`Child process terminated by signal ${signal}`);
    }
  });
  this.serverIpAddress = config.IP;
  this.serverPort = config.PORT;

  this.app = express();
  this.server = http.createServer(this.app);
  this.app.use(
    session(config.session)
  );
  this.app.use(cors());
  this.io = socketIO(this.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  this.io.on("connection", (socket) => this.handleSocketConnection(socket));
  this.app.use(express.json());
  this.app.use(express.urlencoded({ extended: true }));
  this.app.set("views", path.join(__dirname, "views"));
  this.app.set("view engine", "ejs");
  // Serve static files from the 'public' folder
  this.app.use(express.static(path.join(__dirname, "public")));
  // Define a route to render the EJS view
  this.app.get("/", ser.loggedIn, (req, res, next) => {
    res.render("index", {
      title: "Chat UI",
      version: version,
      hostname: this.serverIpAddress,
      port: this.serverPort,
      datachannel: JSON.stringify(Object.keys(Object.fromEntries(config.dataChannel))),
    });
  });

  this.app.post("/stopper", async (request, response) => {
    console.log("STOPPING");
    ser.llamachild.kill("SIGINT");
    response.send({ message: "stopped" });
  });

  this.app.get("/login", (req, res) => {
    if (!config.login) {
      return res.redirect("/");
    } else {
      res.render("login", { title: "login" });
    }
  });

  this.app.get("/logout", async (req, res) => {
    req.session.destroy();
    res.render('logout', {user: config.username });
  });

  this.app.post("/login", async (req, res) => {
    if (!config.login) {
      return res.redirect("/");
    } else {
      const username = req.body.username;
      const password = req.body.password;
      try {
        if (!username || !password) {
          console.log("allgossss");
          res.render("login", { title: "login" });
        } else {
          // Query your database to get user credentials
          //const results = await db.find("users", { "username": username });
          const results = [
            { username: config.username, password: config.password },
          ]; //replace this with database query
          if (results.length === 0) {
            res.render("login", { title: "login" });
          } else {
            // Compare the provided password with the stored password

            if (await hash.comparePassword(password, results[0].password)) {
              // Authentication successful
              req.session.loggedin = true;
              req.session.username = username;
              res.redirect("/");
            } else {
              console.log("allgoodsdfde33");
              res.render("login", { title: "login" });
            }
          }
        }
      } catch (error) {
        // Handle errors gracefully
        console.error("Error during login:", error);
        res.status(500).send("Internal Server Error");
      }
    }
  });

  this.start();
};

ser.loggedIn = function (req, res, next) {
  if (!config.login) {
    req.session.loggedin = true;
  }
  if (req.session.loggedin) {
    next();
  } else {
    res.redirect("/login");
  }
};

ser.handleLlamaError = function (error) {
  console.error("An error occurred in the llama child process:", error);
  // Handle the error appropriately, e.g., logging, cleanup, etc.
};

ser.aplayChild = function(){
  this.aplay = spawn('aplay', [
    '-r', '24050',
    '-f', 'S16_LE',
    '-t', 'raw', '-'
  ]);
}

ser.piperChild =  function () {
  this.piper = spawn(config.piper.exec, [
    '--model', config.piper.model,
    '--output-raw'
  ]);
}

ser.FileStream =  function () {
  this.wavFileStream = fs.createWriteStream('output.wav');
}



ser.runPiper = function(output){
  if (config.piper.enabled) {
    this.fullmessage += " " + output;
    if (this.fullmessage.includes(".") || this.fullmessage.includes(":") || this.fullmessage.includes(";") || this.fullmessage.includes("!") || this.fullmessage.includes("?")) {
      this.piper.stdin.write(this.fullmessage + "\n");
      console.log("fullmesd", this.fullmessage);
      this.fullmessage = "";
    }
  }
    
}

ser.handleLlama = function (msg) {
  this.buffer += msg.toString("utf-8");
  let lastSpaceIndex = this.buffer.lastIndexOf(" ");
  if (lastSpaceIndex !== -1) {
    let output = this.buffer.substring(0, lastSpaceIndex);
    this.buffer = this.buffer.substring(lastSpaceIndex + 1);
    // output = parseOutput(output);
    if (output) {
      clearTimeout(this.streamTimeout);
    }
    this.io.to(this.socketId).emit("output", output);
    this.runPiper(output);
    if (output.includes("\n>")) {
      this.messageQueue.splice(0, 1);
      this.isProcessing = false;
      this.processMessageQueue();
    }
  }
};

ser.processMessageQueue = function () {
  if (this.messageQueue.length === 0) {
    this.isProcessing = false;
    return;
  }
  this.isProcessing = true;
  const message = this.messageQueue[0];
  const { socketId, input } = message;
  this.socketId = socketId;
  // Send the message to the child process
  this.llamachild.stdin.write(input + "\n");
};

ser.handleTimeout = function () {
  console.log("Timeout");
  this.isProcessing = false;
  this.llamachild.kill("SIGINT");
};

ser.handleSocketConnection = async function (socket) {
  socket.on("message", async (data) => {
    var input = data.message;
    if (data.embedding) {
      console.log("embedding");
      var embed = await vdb.init(input);
      if (embed) {
        input = embed;
      }
    }
    input = input + "\\";
    var socketId = data.socketid;
    console.log("input", input);
    // console.time("processing");
    this.connectedClients.set(socketId, input);
    // Add the incoming message to the queue
    this.messageQueue.push({ socketId, input });
    this.streamTimeout = setTimeout(this.handleTimeout, config.timeout);
    // Process messages if the queue is not being processed currently
    if (!this.isProcessing) {
      this.processMessageQueue();
    }
  });
  socket.on("error", function () {
    console.log("Error", error);
  });
  socket.on("disconnect", () => {
    this.connectedClients.delete(socket.id);
  });
};

ser.start = function () {
  this.server.listen(this.serverPort, this.serverIpAddress, () => {
    console.log(
      "Server Running on:",
      this.serverIpAddress + ":" + this.serverPort
    );
  });
};

ser.init();
