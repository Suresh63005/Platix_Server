

const asyncHandler=(fn)=>{
    return (req,res,next)=>{
        Promise.resolve(fn(req,res,next)).catch((error)=>{
            console.error("Error",error)
            res.status(500).json({ message: "Internal Server Error" })
        })
    }
}

module.exports=asyncHandler