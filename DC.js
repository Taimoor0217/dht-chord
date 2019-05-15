var app = require('express')();
const bodyparser = require('body-parser')
var cors = require('cors');
var http = require('http').Server(app);
var Server_Io = require('socket.io')(http);
var ClientIo = require('socket.io-client');
const readline = require('readline');
const axios = require('axios')
const save = require('save-file')
const fs = require('fs')
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }))
app.use(cors())

Finger_Table = {}

my_IP = 'http://127.0.0.1'
PORT = process.argv[2]
var pingcount = 5
var IamLargest = false
var myPredecessor = {
    ip : my_IP ,
    port : PORT
}
var LastRejected = ""
var mySuccessor = {
    ip : my_IP ,
    port : PORT
}
var myGrandSuccessor = {
    ip : my_IP ,
    port : PORT
}

const QUERY = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const question = (Q)=>{
    return new Promise((r)=>{
        QUERY.question(Q,(answer) => {
          r(answer) 
        })
     })
  }
function printNeigbours(){
    console.log('P :', myPredecessor.port)
    console.log('S :', mySuccessor.port)
    console.log('G :', myGrandSuccessor.port)
    console.log('IamLargest :', IamLargest)
}
function print_table(){
    console.log(Finger_Table)
}
function hold(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function share(){
    if( ( Number(mySuccessor.port) == Number(PORT) ) && ( Number(myPredecessor.ip) == Number(PORT) ) ){
        return
    }
    fs.readdir('./', async (err, files) => {
        var SUC = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port)
        var PRE = ClientIo.connect( myPredecessor.ip + ':'+ myPredecessor.port)
        if(err){
            console.log(err)
        }else{
                for (i = 0; i < files.length ; i++){
                    if(files[i] !== "DC.js" && (!files[i].includes('mp4')) && (!files[i].includes('jpg')) && (!files[i].includes('png')) && !(fs.lstatSync(files[i]).isDirectory())){
                        SUC.emit('get-file', {
                            FileName : files[i],
                            Sender :{
                                ip : my_IP ,
                                port : PORT
                            },
                            count : 0
                        })
                        if(Number(PORT) !== Number(myGrandSuccessor.port)){
                            PRE.emit('get-file', {
                                FileName : files[i],
                                Sender :{
                                    ip : my_IP ,
                                    port : PORT
                                },
                                count : 0
                            })
                        }
                    await hold(1000)
                }
            }  
        }
    })
}
function update_table(){
    var conn = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port)             
    conn.emit('PingTable' , {
        index : 1,
        p : {
            ip : my_IP,
            port : PORT
        }
    })
}
function HashCode(s) {
    for(var i = 0, h = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    if (h < 0){
        h = h *-1
    }
    var hash =  h/100000;
    if (hash < 3000){
        hash += 3000
    }
    return hash;
}
function ping(){
    if(mySuccessor === myGrandSuccessor){
        return           
    }
    if(pingcount == 0){
        console.log('My Sucessor Left')
        pingcount = 5
        mySuccessor = myGrandSuccessor
        var conn = ClientIo.connect( myPredecessor.ip + ':'+ myPredecessor.port)             
        conn.emit('update-grandsuccessor' , myGrandSuccessor)
        var conn = ClientIo.connect( myGrandSuccessor.ip + ':'+ myGrandSuccessor.port)
        conn.emit('update-predecessor' , {
            ip: my_IP,
            port: PORT
        })
        conn.emit('set-mygrandsucc-to-your-succ' , {
            ip: my_IP,
            port: PORT
        })                     

    }else{
        pingcount --;
        var conn = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port)             
        conn.emit('alive-check' , {
            ip: my_IP,
            port: PORT
        })
    }
}
async function ask(){
    while(1){
        // console.log("Pro")
        Input = await question('>: ')

        if(Input == 'connect'){
          Ip = await question('IP ?: ')
          port_no = await question('PORT ? :') 
          Ip = my_IP //comment this later on
          var socket = ClientIo.connect( Ip+':'+ port_no)
          socket.emit('JOIN' , {
              ip: Ip,
              port: PORT
            })
        //    setTimeout(share , 1000) 
        }else if(Input == 'Leave'){
            share()
            var conn = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port )
            conn.emit('update-predecessor' , myPredecessor)

            conn = ClientIo.connect( myPredecessor.ip + ':'+ myPredecessor.port )
            if(IamLargest){
                conn.emit('update-largest' , {val: true} )
            }
            conn.emit('update-successor' , mySuccessor)
            conn.emit('update-grandsuccessor' , myGrandSuccessor)
            
            conn = ClientIo.connect( myPredecessor.ip + ':'+ myPredecessor.port )
            conn.emit('update-your-pred' , myPredecessor)
            
        }else if(Input == "Download"){
            FileName = await question('FileName ?: ')
            var conn = ClientIo.connect(mySuccessor.ip + ':'+ mySuccessor.port)
            conn.emit('Download' , {
                FileName :FileName,
                Request : {
                    ip : my_IP,
                    port : PORT
                }
            })
        }else if(Input == "Upload"){
            FileName = await question('FileName ?: ')
            var hash = Math.floor(HashCode(FileName))
            console.log(hash)
            fs.access(FileName , fs.F_OK , (err)=>{
                if(err){
                    console.log('You dont even have this File !!')
                }else{
                        if( Number(hash) <= Number(PORT) && Number(hash) > Number(myPredecessor.port) ){
                            var conn = ClientIo.connect(mySuccessor.ip + ':'+ mySuccessor.port)
                            conn.emit('get-file' ,{
                                FileName : FileName,
                                Sender :{
                                    ip : my_IP ,
                                    port : PORT
                                },
                                count : 0
                            })
                        }else{
                            var conn = ClientIo.connect(mySuccessor.ip + ':'+ mySuccessor.port)
                            conn.emit('upload' , {
                                Hash : hash ,
                                FileName :FileName,
                                Request : {
                                    ip : my_IP,
                                    port : PORT
                                },
                                count : 0
                            })
                        }
                    
                }
                
            })
        }else if(Input == 'Neighbours'){
          printNeigbours()
        }else if(Input == "Table"){
            print_table()
        }
    }
}


Server_Io.on('connection', function (socket){
    socket.on('JOIN' , (p) =>{
     if( ( Number(myPredecessor.port) == Number(PORT)) && ( Number(mySuccessor.port) == Number(PORT) ) ){ //IF I AM THE ONLY NODE IN THE NETWORK
        //Make it as my predecessor,Succesor and it as mine
        console.log('...')
        myPredecessor = p
        mySuccessor = p
        var conn = ClientIo.connect( p.ip + ':'+ p.port )
        conn.emit('update-predecessor' , {
            ip : my_IP,
            port : PORT
        })
        conn.emit('update-successor' , {
            ip : my_IP,
            port : PORT
        })
        if( Number(p.port) > Number(PORT)){
            conn.emit('update-largest' , {val: true})
            IamLargest = false
        }else{
            IamLargest = true
        }
        printNeigbours()
  
    }else if( Number(mySuccessor.port) >  Number(PORT) ){
        if( (Number(p.port) > Number(PORT)) && ( Number(p.port) < Number(mySuccessor.port)) ){
            var conn = ClientIo.connect( p.ip + ':'+ p.port)             
            conn.emit('update-predecessor' , { //Make me the predecesor of the requesting node.
                ip : my_IP,
                port : PORT
            })
            conn.emit('update-successor' , mySuccessor )
            var mySUC = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port ) 
            mySUC.emit('update-predecessor' , p )
            mySUC.emit('set-grandsuccessor' , p)
            myGrandSuccessor = mySuccessor
            mySuccessor = p
            var conn = ClientIo.connect( myPredecessor.ip + ':'+ myPredecessor.port) 
            conn.emit('update-grandsuccessor' , p)
            printNeigbours()

        }else{
            var conn = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port)
            conn.emit('JOIN' , p)
        }
    }else if( Number(mySuccessor.port) < Number(PORT) ){
        if( Number(p.port) > Number(PORT) || Number(p.port) < Number(mySuccessor.port)){
            var conn = ClientIo.connect( p.ip + ':'+ p.port)             
                conn.emit('update-predecessor' , { //Make me the predecesor of the requesting node.
                    ip : my_IP,
                    port : PORT
                })
                conn.emit('update-successor' , mySuccessor )
                if( (Number(p.port) > Number(PORT)) && IamLargest){
                    conn.emit('update-largest' , {val :true})
                    IamLargest = false
                }
                var mySUC = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port ) 
                mySUC.emit('update-predecessor' , p )
                mySUC.emit('set-grandsuccessor' , p)
                myGrandSuccessor = mySuccessor
                mySuccessor = p
                var conn = ClientIo.connect( myPredecessor.ip + ':'+ myPredecessor.port) 
                conn.emit('update-grandsuccessor' , p)
                printNeigbours()
        }else{
            var conn = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port)
            conn.emit('JOIN' , p)
        }
    }
     
    })
    socket.on('upload', data=>{
        hash = data.Hash
        FileName = data.FileName
        p = data.Request
        if( (( Number(hash) > Number(myPredecessor.port)) && ( Number(hash) <= Number(PORT))) || ( ( Number(myPredecessor.port) > Number(PORT) ) && ( Number(hash) > Number(myPredecessor.port) )) ){
            console.log(`Downloading ${FileName} From ${p.port}..`)
            axios({
                method:'get',
                url: `${p.ip}:${p.port}/file`,
                responseType:'stream',
                data: {
                    FileName : FileName 
                }
              })
            .then(function(response) {
                response.data.pipe(fs.createWriteStream(FileName))
            })
            .catch(err=>{
                console.log(err)
            })
        }else{
            var conn = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port)
            conn.emit('upload' , data)
        }
    
    })
    socket.on('Download' , data =>{
        p = data.Request
        if(data.FileName !== LastRejected){
            FileName = './'+data.FileName
            fs.access(FileName , fs.F_OK , (err)=>{
                if(err){
                    // FORWARD TO SUCCESSOR
                    LastRejected = data.FileName
                    hash = HashCode(data.FileName)
                    keys = Object.keys(Finger_Table)
                    var i = 0
                    for(i = 0 ; i < keys.length ; i++){
                        var n = keys[i]
                        if( Number(Finger_Table[n].port) >= hash ){
                            var conn = ClientIo.connect( Finger_Table[n].ip + ':'+ Finger_Table[n].port) 
                            conn.emit('Download' , data)
                            break;
                        }
                    }
                    if (i == keys.length){
                        var conn = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port)
                        conn.emit('Download' , data)
                    }
                }else{
                    LastRejected = ""
                    var conn = ClientIo.connect( p.ip + ':'+ p.port)
                    conn.emit('get-file' ,{
                        FileName : data.FileName,
                        Sender :{
                            ip : my_IP ,
                            port : PORT
                        },
                        count : 0
                    })
                    // console.log('FILE EXISTS')
                }
            })
        }else{
            var conn = ClientIo.connect( p.ip + ':'+ p.port)
            conn.emit('FileNotPresent' ,`404: ${data.FileName} does not exist in the Network`)
        }
    })
    socket.on('FileNotPresent' , d=>{
        console.log(d)
    })
    socket.on('get-file' , data =>{
        FileName = data.FileName
        p = data.Sender
        console.log(`Downloading ${FileName} From ${p.port}..`)
        axios({
            method:'get',
            url: `${p.ip}:${p.port}/file`,
            responseType:'stream',
            data: {
                FileName : FileName 
            }
          })
        .then(function(response) {
            response.data.pipe(fs.createWriteStream(FileName))
        })
        .catch(err=>{
            console.log(err)
        })
        // setTimeout(()=>{
        //     if(data.count < 3){
        //         var conn = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port)
        //         conn.emit('get-file' ,{
        //             FileName : data.FileName,
        //             Sender :{
        //                 ip : my_IP ,
        //                 port : PORT
        //             },
        //             count : data.count + 1
        //         })
        //     }
        // } , 10000 )
        // console.log(data.count ,typeof(data.count))
    })
    socket.on('PingTable' , data =>{
        // console.log('PING')
        n = Number(data.index)
            // console.log(data.p.port)
        if( Number(data.p.port) !== Number(PORT) ){
            if( (Math.log(n)/Math.log(2)) % 1 === 0){
                recvr = data.p
                var conn = ClientIo.connect( recvr.ip + ':'+ recvr.port)             
                conn.emit('update-table' , {
                    index : n,
                    p : {
                        ip : my_IP ,
                        port : PORT
                    }
                }) 
            }
            var conn = ClientIo.connect( mySuccessor.ip + ':'+ mySuccessor.port)             
            conn.emit('PingTable' , {
                index : n+1,
                p : data.p
            })
        }
        
    })
    socket.on('update-table' , data =>{
        v = Number(data.index)
        node = data.p
        Finger_Table[v] = node
        // console.log('Finger_Table[v]')
    })
    socket.on('alive-check' , p =>{
        var conn = ClientIo.connect( p.ip + ':'+ p.port)             
        conn.emit('alive-ack' , '')
    })
    socket.on('alive-ack' , d =>{
        pingcount ++ ;
        if(pingcount > 5){
            pingcount = 5
        }
    })
    socket.on('set-grandsuccessor' , p =>{
        var conn = ClientIo.connect( p.ip + ':'+ p.port)             
        conn.emit('update-grandsuccessor' , mySuccessor)
    })
    socket.on('update-your-pred' , d =>{
        var conn = ClientIo.connect( myPredecessor.ip + ':'+ myPredecessor.port)             
        conn.emit('update-grandsuccessor' , mySuccessor)
    })
    socket.on('set-mygrandsucc-to-your-succ' , p =>{
        var conn = ClientIo.connect( p.ip + ':'+ p.port)             
        conn.emit('update-grandsuccessor' , mySuccessor)
    })
    socket.on('update-predecessor' , data =>{
        myPredecessor = data
        console.log('P :' , myPredecessor.port)
    })
    socket.on('update-successor' , data=>{
      mySuccessor = data
      console.log('S :' , mySuccessor.port)
    })
    socket.on('update-largest' , (data)=>{
        IamLargest = data.val
        console.log('IamLargest :' , IamLargest)
    })
    socket.on('update-grandsuccessor' , data =>{
        myGrandSuccessor = data
    })

 });
app.get('/file' , (req , res)=>{
    // console.log(req.body)
    res.download('./'+req.body.FileName , (err)=>{
        if(err){
            console.log(err)
        }else{
            console.log(req.body.FileName + ' BEING SENT...')
        }
        // res.end()
    })
})
http.listen(PORT,'0.0.0.0', function () {
    console.log('MY HASH IS: ' , PORT);
    ask()
    setInterval(ping , 500)
    setInterval(update_table , 3000)
});