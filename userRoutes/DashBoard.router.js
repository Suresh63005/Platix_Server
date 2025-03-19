const express=require("express")
const router=express.Router();
const dashBoardController=require("../userControllers/DashBoard.Controller")
const authMiddleWare=require("../Middlewares/auth")

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

router.get("/all-orders",dashBoardController.allOrders)
router.get("/all",dashBoardController.all)
router.get("/all/organizations/search", dashBoardController.searchOrganizations);
router.get("/all/organizationstype/search",verifyUser, dashBoardController.searchByOrganizationType);
router.get("/status/:status/:userUUID",dashBoardController.statusOrder)

module.exports=router