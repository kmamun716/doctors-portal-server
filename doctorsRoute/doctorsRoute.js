const router = require('express').Router();
const client = require('../config').client;


let db;
router.all('*',(req, res, next)=>{
    client.connect((err, database)=>{
        console.log('database connected')
        // db=client.db('doctors-portal').collection('services');
        db=database.db('doctors-portal')
        next()
    })
})

router.get('/',(req, res)=>{
    res.send('doctors route working')
})

async function run(){
   
    router.get('/services', async(req, res)=>{
        const serviceCollection = db.collection('services');
        const query = {};
        const cursor = serviceCollection.find(query);
        const services = await cursor.toArray();
        res.send(services)
    })
}
run().catch(console.dir)

module.exports = router;