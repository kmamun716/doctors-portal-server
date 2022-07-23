const express = require('express');
const cors = require('cors');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());

app.use('/doctorsRoute', require('./doctorsRoute/doctorsRoute'));

const port = process.env.PORT || 4000;



app.listen(port,()=>{
    console.log(`doctors server is running at port : ${port}`)
})