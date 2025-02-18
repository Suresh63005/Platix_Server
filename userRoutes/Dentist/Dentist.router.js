const express=require("express")
const router=express.Router();
const DentistController=require("../../userControllers/Dentist/Dentist.Controller")

router.route("/upsert/:cancel?").post(DentistController.fromDentist).put(DentistController.fromDentist);
router.get("/getbyid/:id",DentistController.orderDetails);

module.exports=router