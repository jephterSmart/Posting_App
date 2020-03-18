const path = require('path')

const express = require('express');

const app = express();

const pathToBuild = path.join(__dirname,'..','build')
app.use(express.static(pathToBuild))
app.use('*',(req,res)=>{
    res.sendFile( path.join(pathToBuild,'index.html'));
   })

app.listen(process.env.PORT || 8080)