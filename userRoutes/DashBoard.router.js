
const express=require("express")
const router=express.Router();
const dashBoardController=require("../userControllers/DashBoard.Controller");
const { isAuthenticated } = require("../Middlewares/auth");
// const authMiddleWare=require("../Middlewares/auth")



router.get("/dashboard/all-orders",dashBoardController.allOrders)
router.get("/dashboard/all",dashBoardController.all)
router.get("/dashboard/all/organizations/search", dashBoardController.searchOrganizations);
router.get("/dashboard/all/organizationstype/search", dashBoardController.searchByOrganizationType);
router.get("/dashboard/status/:status/:userUUID",dashBoardController.statusOrder)


module.exports = router