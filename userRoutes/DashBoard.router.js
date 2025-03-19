const express=require("express")
const router=express.Router();
const dashBoardController=require("../userControllers/DashBoard.Controller")

router.get("/all-orders",dashBoardController.allOrders)
router.get("/all",dashBoardController.all)
router.get("/all/organizations/search", dashBoardController.searchOrganizations);
// router.get("/all/organizationstype/search", dashBoardController.searchByOrganizationType);
router.get("/status/:status/:userUUID",dashBoardController.statusOrder)

module.exports=router