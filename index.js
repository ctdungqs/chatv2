var express = require("express");
var app = express();
const router = express.Router();
var crypto = require('crypto');
const https = require("https");
var mysql = require('mysql');
var fs = require('fs');
var dateTime = require('node-datetime');
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");
var server = require("http").Server(app);
var io = require("socket.io")(server);
server.listen(3000);

var mangUserOnline = [];
var mangUserOnline1 = [];
var mangManagerSocketUser = new Array();
var mangChat = Array();
var mangChatadmin = Array();
var laydata = "";
var messenger_chat = "";

var dt = dateTime.create();

var con = mysql.createConnection({
  host     : '192.168.1.102',
  user     : 'webvua_chat',
  password : 'W0so9gJtWF',
  database : 'webvua_chat'
});

io.on("connection", function(socket){
  socket.on("disconnect", function(){
    //console.log(socket.id + " Ngắt kết nối !!!!!");
    if((socket.keyshop in mangChatadmin)){//Xoá mảng chat cua admin khi admin ngắt kết nối
      delete mangChatadmin[socket.keyshop];
    }
    const myObjStr = JSON.stringify(mangChat[socket.room]);//Lây mảng chat của user hiện và chuyển về chuỗi json encode đê luu trữ
    if (!io.sockets.adapter.rooms[socket.room])//Nếu mà không có ai ở trong room này
    {
      delete mangChat[socket.room];//Xoá mảng chat hiện tại của room
    }

    if(socket.keyshop != "" && socket.room != "" && socket.keyshop != "undefined" && socket.room != "undefined"){//Nếu mà tồn tại tại socket id thì lưu chuoix json encode ở trên vào file
      try{
        if(socket.keyshop != null && socket.room != null){//Nếu mà socket id đã kết nối và ở trong room
          savefile(socket.keyshop, socket.room, myObjStr);//Luu lại vào file
        }
      }
      catch(error){
        console.log(error);
      }
      if(socket.keyshop != null && socket.room != null){//Lưu trữ room chat vào cơ sở dữ liệu
        con = mysql.createConnection({//Két nối csdl mysql
          host     : '192.168.1.102',
          user     : 'webvua_chat',
          password : 'W0so9gJtWF',
          database : 'webvua_chat'
        });
        if(myObjStr != ""){
          var count = 0;
          try{
            count = JSON.parse(myObjStr).length;
          }
          catch(error){}
          if(count > 0){
            con.connect(function(err) {
              if (err) throw err;
              console.log("Connected!");
              con.query("select * from `tbl_groupchat` where `keyshop`='"+socket.keyshop+"' and `groupchat`='"+socket.room+"'", function (err, result, fields) {
                if (err) throw err;
                if(result.length <= 0){
                  con.query("INSERT INTO `tbl_groupchat` (`keyshop`, `groupchat`, `sort`, `date_added`, `date_modified`, `last_messenge`, `status`) VALUES ('"+socket.keyshop+"', '"+socket.room+"', '1', now(), now(), '"+messenger_chat+"', '1')", function (err, result, fields) {
                  if (err) throw err;
                  //console.log(result);
                  });
                }
                else{
                  con.query("update `tbl_groupchat` set `date_modified`=now(),`status`='1'  where `keyshop`='"+socket.keyshop+"' and `groupchat`='"+socket.room+"'", function (err, result, fields) {
                  if (err) throw err;
                  //console.log(result);
                  });
                }
                con.end();
              });
            });
          }
        }
      }
    }
  });

  function handleDisconnect(connection) {
    connection.on('error', function(err) {
      if (!err.fatal) {
        return;
      }

      if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
        throw err;
      }

      console.log('Re-connecting lost connection: ' + err.stack);

      connection = mysql.createConnection(connection.config);
      handleDisconnect(connection);
      connection.connect();
    });
  }

  function savefile(keyshop, room, content){//Hàm lưu file
    var path = 'public/uploads/'+keyshop+'/'+room+".wvua",
    buffer = new Buffer(content);

    fs.open(path, 'w+', function(err, fd) {
        if (err) {
            throw 'error opening file: ' + err;
        }

        fs.write(fd, buffer, 0, buffer.length, null, function(err) {
            if (err) throw 'error writing file: ' + err;
            fs.close(fd, function() {
                console.log('file written');
            })
        });
    });
  }

  socket.on("lay-noidung-chat", function(data){//Khi admin yêu cầu lấy nội dung của cuộc live chat 
    var keys = data.keyshop;
    var groupc = data.groupc;
    var laydata = "";
    if((groupc in mangChat)){
      if(mangChat[groupc].length <= 0){
        fs.readFile('public/uploads/'+keys+'/'+groupc+'.wvua', 'utf8', function(err, contents) {
          if(err == null){
            laydata = contents;
            try{mangChat[groupc] = JSON.parse(laydata);} catch(error){}
            io.to(socket.id).emit("return-noidung-chat", {laydata: laydata, groupc: groupc});
          }
        });
      }
      else{
        laydata = JSON.stringify(mangChat[groupc]);
        try{mangChat[groupc] = JSON.parse(laydata);} catch(error){}
        io.to(socket.id).emit("return-noidung-chat", {laydata: laydata, groupc: groupc});
      }
    }
    else{
      fs.readFile('public/uploads/'+keys+'/'+groupc+'.wvua', 'utf8', function(err, contents) {
        if(err == null){
          laydata = contents;
          try{mangChat[groupc] = JSON.parse(laydata);} catch(error){}
          io.to(socket.id).emit("return-noidung-chat", {laydata: laydata, groupc: groupc});
        }
        else{
          io.to(socket.id).emit("return-noidung-chat", {laydata: "", groupc: groupc});
        }
      });
    }
  });

  socket.on("save-hostorychat", function(data){//Save lại cuộc hội thoại (Admin yêu cầu)
    var keyshop = data.keyshop;
    var groupc = data.groupc;
    if(1==1){
      if(2==2){
        try{
          const myObjStr = JSON.stringify(mangChat[groupc]);
          savefile(keyshop, groupc, myObjStr);
          if (!io.sockets.adapter.rooms[socket.room]) 
          {
            delete mangChat[socket.room];
          }
        }
        catch(error){}
      }
    }
  });

  socket.on("client_gui_username", function(data){
    if(mangUserOnline.indexOf(data) >= 0){
      socket.emit("server-send-thatbai", data);
    }
    else{
      mangUserOnline.push(data);
      mangUserOnline1.push(socket.id);
      mangManagerSocketUser[data] = socket.id;
      socket.username = data;
      io.sockets.emit("server-send-dangki-thanhcong", {username:data, id:socket.id});
    }

  });

  socket.on("group-chat", function(data){//Khi user bắt đầu kết nối lên server thì gắn socket của user đó cho 1 room chat và keyshop. Keyshop để xác định user này đang chat với shop nào
    socket.room = data.groupchat;
    socket.keyshop = data.keyshop;
    mangChat[socket.room] = mangChat[socket.room] || [];
    var dir = 'public/uploads/'+data.keyshop+"/";
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    fs.readFile('public/uploads/'+socket.keyshop+'/'+socket.room+'.wvua', 'utf8', function(err, contents) {
      if(err == null){
        mangChat[socket.room] = JSON.parse(contents);
      }
    });
  });

  socket.on("group-chat-admin", function(data){//Khi admin bắt đàu kết nối lên server thì gắn socket của admin 1 keyshop 
    socket.keyshop = data.keyshop;
    mangChatadmin[data.keyshop] = socket.id;
  });

  socket.on("client_gui_message",function(data){//Khi người dùng bắt đầu chat
    io.sockets.emit("server_goi_message", {username:socket.username, msg:data});
  });

  socket.on("admin-chat-socketid-khac", function(data){//Khi admin chat với user
    var groupchat = data.rgroup;
    socket.room == groupchat;
    var rname = data.rname;
    var messenger = data.messenger;
    dt = dateTime.create();
    var datecurrnet = dt.format('Y-m-d H:M:S');
    var keys = data.keys;
    var datecurrnet = dt.format('Y-m-d H:M:S');
    var ojb = {};
    ojb['rname'] = rname;
    ojb['messenger'] = messenger;
    ojb['date'] = datecurrnet;
    messenger_chat = messenger;
    if(!(groupchat in mangChat)){//Kiem tra xem key array có tồn tại không. Nếu không thì khởi tạo lại và lấy nội dung chat lên từ file
      mangChat[groupchat] = mangChat[groupchat] || [];
      fs.readFile('public/uploads/'+keys+'/'+groupchat+'.wvua', 'utf8', function(err, contents) {
        if(err == null){
          mangChat[socket.room] = JSON.parse(contents);
        }
      });
    }
    mangChat[groupchat].push(ojb);
    io.to(groupchat).emit("server_xuli_chat", {messenger:messenger,rname:rname, date: datecurrnet});//Gơi về cho người dùng
    io.to(socket.id).emit("goi-chat-cho-admin",{nameroom:groupchat,messenger:messenger, date:datecurrnet, rname: rname});//Gởi lại cho admin để xử lí
    console.log(groupchat);
  })

  socket.on("user-chat-socketid-khac", function(data){//Khi user chat. Sẽ lưu cuộc chat vào 1 mảng và chat lần đàu se lưu vào csdl. Gởi lại cho user vừa chat và gơi cho admin để xử lí
    //var id_socket = mangManagerSocketUser[data.id];
    var nameroom = data.rweb;
    dt = dateTime.create();
    var datecurrnet = dt.format('Y-m-d H:M:S');
    var ojb = {};
    ojb['rname'] = data.rname;
    ojb['messenger'] = data.messenger;
    ojb['date'] = datecurrnet;
    messenger_chat = data.messenger;
    if(mangChat[nameroom].length <= 0){
      con = mysql.createConnection({
        host     : '192.168.1.102',
        user     : 'webvua_chat',
        password : 'W0so9gJtWF',
        database : 'webvua_chat'
      });

      con.connect(function(err) {
        if (err) throw err;
        console.log("Connected!");
        con.query("select * from `tbl_groupchat` where `keyshop`='"+socket.keyshop+"' and `groupchat`='"+socket.room+"'", function (err, result, fields) {
          if (err) throw err;
          if(result.length <= 0){
            con.query("INSERT INTO `tbl_groupchat` (`keyshop`, `groupchat`, `sort`, `date_added`, `date_modified`, `last_messenge`,`status`) VALUES ('"+socket.keyshop+"', '"+socket.room+"', '1', now(), now(),'"+messenger_chat+"', '1')", function (err, result, fields) {
            if (err) throw err;
            //console.log(result);
            });
          }
          else{
            con.query("update `tbl_groupchat` set `date_modified`=now(),`status`='1'  where `keyshop`='"+socket.keyshop+"' and `groupchat`='"+socket.room+"'", function (err, result, fields) {
            if (err) throw err;
            //console.log(result);
            });
          }
          con.end();
        });
      });
    }
    mangChat[nameroom].push(ojb);
    var message = data.messenger;
    var user = data.rname;
    socket.join(nameroom);
    dt = dateTime.create();
    var datecurrnet = dt.format('Y-m-d H:M:S');
    io.to(nameroom).emit("server_xuli_chat", {messenger:message,rname:user, date: datecurrnet});
    try{
        socket.to(mangChatadmin[socket.keyshop]).emit("goi-chat-cho-admin",{nameroom:nameroom,messenger:message, date:datecurrnet, rname: user, date: datecurrnet});
    }
    catch(error){
        console.log("error+ " + error);
    }
    
    //var soc = io.sockets.connected[id_socket];
    //console.log(soc);
    //soc.join(nameroom);
    //var count_mumber_roomchat = io.sockets.in(socket.username+data.id).count();
    /*console.log("So nguoi trong room:" + io.sockets.adapter.rooms[nameroom].length);
    var count_mumber_roomchat = io.sockets.adapter.rooms[nameroom].length;
    if(count_mumber_roomchat < 2){
      console.log("Chat ca nhanh");
      io.to(id_socket).emit("server_xuli_chat", {mssage_return:data.chat_item_msg,id_return:data.id,idto_return:socket.id, nameuser_return:nameroom, name_chat:socket.username});
    }
    else{
      console.log("Da vao group de chat");
      io.sockets.in(nameroom).emit("server_xuli_chat",{mssage_return:data.chat_item_msg,id_return:data.id,idto_return:socket.id, nameuser_return:nameroom, name_chat:socket.username});
    }*/
    //io.to(id_socket).emit("server_xuli_chat", {mssage_return:data.chat_item_msg,id_return:data.id,idto_return:socket.id, nameuser_return:socket.username});
  });

  socket.on("get_list_user_online", function(data){
    mangManagerSocketUser[data] = socket.id;
    io.to(socket.id).emit("xuli-get-list-user-online", {mang1:mangUserOnline, mang2:mangUserOnline1});
  })
});

app.get("/", function(req, res){
  res.render("trangchu");
});
