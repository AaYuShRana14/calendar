const jwt=require('jsonwebtoken');
require('dotenv').config();
const jwtsecret=process.env.JWT_SECRET;
module.exports=isLoggedin=(req,res,next)=>{
    if(req.headers.authorization===undefined){
        return res.status(401).json({error:"Unauthorized"});
    }
    const token=req.headers.authorization.split(" ")[1];
    if(token===undefined){
        return res.status(401).json({error:"Unauthorized"});
    }
    try {
        const decoded=jwt.verify(token,jwtsecret);
        const{ email } = decoded;
        res.user=email;
        next();
    } catch (error) {
        return res.status(401).json({error:"Unauthorized"});
    }
};
