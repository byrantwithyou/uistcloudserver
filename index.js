const express = require('express');
const socketIO = require('socket.io');
const path = require('path');
const PORT = process.env.PORT || 3000;
const server = express()
  .use(express.static(path.join(__dirname, "public")))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
const io = socketIO(server);


let studentProfile = [];
let behaviorsForAll = [];
let stepsForAll = [];
let subsectionsForAll = [];
let settingsForAll = [];
let teacherID = "";


io.on("connection", function (socket) {
  

  
  
  socket.on("sendFeedback", function(comment, name) {
    const index = studentProfile.findIndex((element) => (element.name == name));
    if (index >= 0) {
      if (io.sockets.connected[studentProfile[index].id] && studentProfile[index].online) {
        io.sockets.connected[studentProfile[index].id].emit("sendFeedback", comment);
      }
    }
  })

  socket.on("styleData", function(style, name, result) {
    
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("styleLog", style, name, result);
    }
    
  })






  socket.on("pr", function(studentName) {
    const index = studentProfile.findIndex(element => element.name == studentName);
    if (index >= 0) {
      let ss = studentProfile[index].id;
      if (io.sockets.connected[ss] && studentProfile[index].online) {
        io.sockets.connected[ss].emit("pr");
      }
    }
    
  })

  socket.on("sendMobilePhoto", function(img, studentName) {
    const index = studentProfile.findIndex((element) => (element.name == studentName));
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("studentView", img, studentName);
    }
    let socketId = "";
    console.log("sendMobilePhoto");
    console.log(studentName);
    console.log(index);
    if (index >= 0) {
      socketId = studentProfile[index].id;
      console.log(socketId);
      console.log("greater than zero");
    }
    if (io.sockets.connected[socketId]) {
      console.log("emit to original student");
      io.sockets.connected[socketId].emit('photo', img, studentName);
    }
  })

  socket.on("authoring", function (behaviors, steps, subsections, settings) {
    behaviorsForAll = behaviors;
    stepsForAll = steps;
    subsectionsForAll = subsections;
    settingsForAll = settings;
  });
  //when a teacher login
  socket.on("teacherLogin", function () {
    teacherID = socket.id;
    socket.emit("authoring", behaviorsForAll, stepsForAll, subsectionsForAll, settingsForAll);
  });

  //when a student login
  socket.on("studentLogin", function (studentName) {
    if (behaviorsForAll.length == 0) {
      if (io.sockets.connected[socket.id]) {
        socket.emit("notAuthored");
        return;
      }
      return;
    }
    if (!studentProfile.map((element) => (element.name)).includes(studentName)) {
      studentProfile.push({
        id: socket.id,
        name: studentName,
        step: 1,
        stepContent: subsectionsForAll[0].steps[0],
        currentSection: 1
      });
    } else {
      studentProfile[studentProfile.findIndex((element) => (element.name == studentName))].id = socket.id;
    }
    
    if (io.sockets.connected[socket.id]) {
      socket.emit("authoring", behaviorsForAll, stepsForAll, subsectionsForAll, settingsForAll, studentProfile.find((element) => (element.name == studentName)).step);
    }
    
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("studentProfile", studentProfile.map((element) => ([element.name, element.step])));
    }
    if ( teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("studentLogin", studentName);
    }
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("studentStepProfile", studentProfile);
    }
  });

  //when disconnect
  socket.on("disconnect", function () {
    let deleteStudentIndex = studentProfile.findIndex((element) => (element.id == socket.id));
    if (deleteStudentIndex >= 0) {
      studentProfile[deleteStudentIndex].online = false;
      //studentProfile.splice(deleteStudentIndex, 1);
      if (teacherID && io.sockets.connected[teacherID]) {
        io.sockets.connected[teacherID].emit("studentProfile", studentProfile.map((element) => ([element.name, element.step])));
      }

    }

    if (socket.id == teacherID) {
      teacherID = "";
    }
  });
  
  socket.on("addStep", function(name, section, step) {
    if (studentProfile.find((element) => (element.name == name))) {
      studentProfile.find((element) => (element.name == name)).step += 1;
      studentProfile.find((element) => (element.name == name)).stepContent = step;
      studentProfile.find((element) => (element.name == name)).currentSection = section;
    }
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("studentStepProfile", studentProfile);
    }
  });

  socket.on("feedBack2Stu", function(result, behaviorName, studentName) {
    if (studentProfile.find((element) => (element.name == studentName))) {
      io.sockets.connected[studentProfile.find((element) => (element.name == studentName)).id].emit("feedBack2Stu", result, behaviorName);
    }
    
  });

  


  socket.on("photo", function (data, behavior) {
    console.log("to the server");
    //when finished table is 1, the state is "submitted" but not "approv
    //target is influenced by reviewTimes, time and random factor
    console.log(studentProfile.length);
    let random = JSON.parse(JSON.stringify(studentProfile));
    if (random.findIndex((element) => (element.id == socket.id)) >= 0) {
      random.splice(random.findIndex((element) => (element.id == socket.id)), 1);
    }
    let ra = 0;
    if (random.length > 0) {
      ra = Math.floor(Math.random() * random.length)
    }
    if (io.sockets.connected[random[ra].id]) {
      console.log("emitted to the reviewing reviewing student");
      io.sockets.connected[random[ra].id].emit("photoToJudge", data, behavior);

    }
  });
  




  socket.on("reviewResult", function(reviewResult, reviewStudentName, reviewBehavior, reviewComment, reviewImg) {
    //console.log(studentProfile[0].id);
    
    if (studentProfile.find((element) => (element.name == reviewStudentName))) {
      if (io.sockets.connected[studentProfile.find((element) => (element.name == reviewStudentName)).id]) {
        io.sockets.connected[studentProfile.find((element) => (element.name == reviewStudentName)).id].emit("reviewResult", reviewResult, reviewStudentName, reviewBehavior, reviewComment, reviewImg);
      }
    }

    if ( teacherID && io.sockets.connected[teacherID] ) {
      io.sockets.connected[teacherID].emit("styleLog", reviewBehavior.name, reviewStudentName, reviewResult);
    }
    
  });
  socket.on("teacherFeedback", function(reviewResultImg, reviewResultBehavior, reviewResult, studentName) {
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("teacherFeedback", reviewResultImg, reviewResultBehavior, reviewResult, studentName);
    }
  })



  socket.on("review2Teacher", function(reviewResultImg, reviewResultBehavior, studentName) {
    if (teacherID && io.sockets.connected[teacherID]) {
      io.sockets.connected[teacherID].emit("review2Teacher", reviewResultImg, reviewResultBehavior, studentName);
    }
  });
  
});
