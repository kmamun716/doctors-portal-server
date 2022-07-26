const jwt = require("jsonwebtoken");

const accessMiddleWare = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const splitToken = authorization.split(" ")[1];
    jwt.verify(splitToken, process.env.SECRET,(err, decoded)=>{
        if(err){
            return res.status(403).send({message: 'Forbidden Access'})
        }else{
            req.user = decoded;
            next()
        }
    });
    
  }else{
    res.status(401).send({ message: "unauthorized access" });
  }
};

module.exports = { accessMiddleWare };
