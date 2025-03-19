const Organization = require("../../Models/Organization.model");
const OrderReports = require("../../Models/ReportsModel/OrderReport.model")


const getAll = async (req, res) => {
  const uid = req.user?.id;

  if(!uid){
    return res.status(401).json({message: "Unauthorized"})
  }


  try {
    const [activeOrders, completedOrders] = await Promise.all([
      OrderReports.count({ where: { orderStatus: "processing",delivery_boy:uid } }),
      OrderReports.count({ where: { orderStatus: "completed" , delivery_boy:uid} })
    ]);

    const orderList = await OrderReports.findAll({
      include: [
        {
          model: Organization, 
          attributes: ['name'], 
          as: 'toOrg',
          required: false 
        }
      ],
      where:{
        delivery_boy: uid
      }
    });

    const response = {
      activeOrders,
      completedOrders,
      orderList: orderList.map(order => ({
        ...order.toJSON(),
      }))
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching order counts:', error);

    return res.status(500).json({
      message: 'Failed to retrieve order counts. Please try again later.',
      error: error.message
    });
  }
};

  

module.exports={ getAll }