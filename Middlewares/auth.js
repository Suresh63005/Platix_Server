const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Admin = require("../Models/Adminmodel");
const User = require("../Models/ReportsModel/User.model");
const Roles = require("../Models/TblRoles.model");
const { use } = require("../userRoutes/DashBoard.router");
dotenv.config();
const JWT_SECRET = process.env.JWT_TOKEN;

const generateToken = (admin) => {
  return jwt.sign(
    { id: admin.id, email: admin.email },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

const verifyAdmin = async (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const bearerToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const decoded = jwt.verify(bearerToken, JWT_SECRET);
    const admin = await Admin.findByPk(decoded.id);

    if (!admin) {
      return res.status(403).json({ message: "Access denied. Admin not found." });
    }
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired." });
    }
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

const verifyUser=async(req,res,next)=>{
  const token=req.header("Authorization");
  if(!token){
    return res.status(401).json({message:"Access denied. No token provided."})
  }
  try {
    const bearerToken=token.startsWith("Bearer ") ? token.slice(7) : token;
    const decoded=jwt.verify(bearerToken,JWT_SECRET);
    const user=await User.findByPk(decoded.userRecordId)
    if(!user){
      return res.status(403).json({message:"Acess denied. User not found."})
    }
    req.user=user;
    next()
  } catch (error) {
      if(error.name === "TokenExpiredError"){
        return res.status(403).json({message:"Token expired."})
      }
      return res.status(403).json({message:"Invalid or Token Expired"})
  }
}


const checkRoleAccess = (requiredRole) => {
  return async (req, res, next) => {
    const token = req.header("Authorization");

    if (!token) {
      console.log("No token provided.");
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
      const bearerToken = token.startsWith("Bearer ") ? token.slice(7) : token;

      const decoded = jwt.verify(bearerToken, JWT_SECRET);

      console.log("Decoded token:", decoded);

      const user = await User.findByPk(decoded.id);

      if (!user) {
        console.log("User not found in database");
        return res.status(403).json({ message: "Access denied. User not found." });
      }

      const role = await Roles.findOne({
        where: {
          id: user.role_id,
          rolename: requiredRole,
        },
      });

      if (!role) {
        console.log(`User does not have the required role '${requiredRole}'`);
        return res.status(403).json({
          message: `Access denied. User does not have the required role '${requiredRole}'.`,
        });
      }

      req.user = user;
      req.role = role;

      console.log("Role verified, proceeding to next middleware");
      next();

    } catch (error) {
      console.log("Token verification failed:", error);
      if (error.name === "TokenExpiredError") {
        return res.status(403).json({ message: "Token expired." });
      }
      return res.status(403).json({ message: "Invalid or expired token." });
    }
  };
};


const isAuthenticated = async(req,res,next)=>{
  const token = req.headers.authorization?.split(" ")[1];
  
  // console.log(token,"token from headers");

  if(!token){
    return res.status(401).json({message:"Access denied. No token provided."});
  }

  try {

    const decode = jwt.verify(token, process.env.JWT_TOKEN);

    console.log(decode ,"decode from token");

    const user = await User.findByPk(decode?.userId);

    // console.log(user, "user from decode");

    if(!user){
      return res.status(401).json({message:"Access denied. User not found."});
    }

    req.user = user;

    next();
    

  } catch (error) {
    console.log(error);
    if(error.name === "TokenExpiredError"){
      return res.status(403).json({message:"Token expired."})
    }
    return res.status(403).json({message:"Invalid or Token Expired"})
    
  }

}

const isOwner = async(req,res,next)=>{
  const token = req.headers.authorization?.split(" ")[1];
  
  // console.log(token,"token from headers");

  if(!token){
    return res.status(401).json({message:"Access denied. No token provided."});
  }

  try {

    const decode = jwt.verify(token, process.env.JWT_TOKEN);

    console.log(decode ,"decode from token");

    const user = await User.findByPk(decode?.userId, {
      include:[
        {
          model:Roles,
          as:"role"
        }
      ]
    });




    // console.log(user,"userrrrrrrrrrrrrrrrrrrrr")

    // console.log(user, "user from decode");

    if(!user){
      return res.status(401).json({message:"Access denied. User not found."});
    }



    if(user.role.rolename === "Owner" || "owner"  ){
      req.user = user;
      
    }

    
    else{
      return res.status(403).json({message:"Access denied. You are not the owner."})
    }


    next();
    

  } catch (error) {
    console.log(error);
    if(error.name === "TokenExpiredError"){
      return res.status(403).json({message:"Token expired."})
    }
    return res.status(403).json({message:"Invalid or Token Expired"})
    
  }

}

module.exports = { generateToken, verifyAdmin ,verifyUser, checkRoleAccess,isAuthenticated,isOwner};