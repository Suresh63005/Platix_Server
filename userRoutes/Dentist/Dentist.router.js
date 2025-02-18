const express=require("express")
const router=express.Router();
const DentistController=require("../../userControllers/Dentist/Dentist.Controller")

router.route("/upsert/:cancel?").post(DentistController.fromDentist).put(DentistController.fromDentist);
router.get("/getbyid/:id",DentistController.orderDetails);
router.get("/order/report/:fromdate?/:todate?",DentistController.orderReport)
module.exports=router