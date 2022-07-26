const express = require('express');
const cors = require('cors');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());


const port = process.env.PORT || 4000;

//external route setup
app.use('/doctorsRoute', require('./doctorsRoute/doctorsRoute'));



app.listen(port,()=>{
    console.log(`doctors server is running at port : ${port}`)
})