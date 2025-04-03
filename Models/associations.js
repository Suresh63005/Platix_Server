const TblOrganizationType = require("./TblOrganizationType.model");
const Organization = require("./Organization.model");
const OrderReports = require("./ReportsModel/OrderReport.model");
const User = require("./ReportsModel/User.model");
const Roles = require("./TblRoles.model");
const Services = require("./TblServices.model");
const TblOrganization_Service = require("./tblOrganizationService");
const OrderServices = require("./ReportsModel/OrderServices.model");

Organization.belongsTo(TblOrganizationType, {
  foreignKey: "organizationType_id",
  as: "organizationType",
  onDelete:"CASCADE",
});

TblOrganizationType.hasMany(Organization, {
  foreignKey: "organizationType_id",
  onDelete:"CASCADE",
});




Organization.hasMany(OrderReports, {
  foreignKey: "fromOrganization",
  as: "fromOrders",
});

// Organization.hasMany(OrderReports, {
//   foreignKey: "toOrganization",
//   as: "toOrders",
// });


OrderReports.belongsTo(Organization, {
  foreignKey: "fromOrganization",
  as: "fromOrg",
});

OrderReports.belongsTo(Organization, {
  foreignKey: "toOrganization",
  as: "toOrg",
});

// OrderReports.belongsTo(Organization,{foreignKey:'toOrganization',as: "toOrganizationDetails" })
Organization.hasMany(OrderReports,{foreignKey:'toOrganization'})
Organization.hasMany(OrderReports,{foreignKey:'fromOrganization'})
OrderReports.belongsTo(Services,{foreignKey: "serviceId", as: "service"})

User.belongsTo(TblOrganizationType, {
  foreignKey: "organizationType_id",
  as: "organizationType1",
});
TblOrganizationType.hasMany(User, { foreignKey: "organizationType_id" });

User.belongsTo(Organization, {
  foreignKey: "organization_id",
  as: "organization",
});
Organization.hasMany(User, {
  foreignKey: "organization_id",
  as: "users",
});

User.belongsTo(Roles, { foreignKey: "role_id", as: "role" });
Roles.hasMany(User, { foreignKey: "role_id", as: "users" });

// TblOrganizationType.hasMany(Services,{foreignKey:"service_id", as:"services"})
// Services.belongsTo(TblOrganizationType,{foreignKey:"service_id"})

TblOrganizationType.belongsToMany(Services, {
  through: "OrganizationTypeServices", // Correct junction table
  as: "services",
  foreignKey: "organizationType_id", // Correct foreign key
  otherKey: "service_id",
});

Services.belongsToMany(TblOrganizationType, {
  through: "OrganizationTypeServices",
  as: "organizationTypes",
  foreignKey: "service_id",
  otherKey: "organizationType_id",
});




OrderServices.belongsTo(TblOrganization_Service,{foreignKey:"orgserviceId",as:"orgservice"})

TblOrganization_Service.belongsTo(Services, { foreignKey: "service_id", as: "servicess" });
Services.hasMany(TblOrganization_Service,{foreignKey:"service_id"});
 // ✅ Singular alias



TblOrganization_Service.belongsTo(Organization, {
  foreignKey: 'organization_id',
  as: 'organization_service'
});

Organization.hasMany(TblOrganization_Service, {
  foreignKey: 'organization_id',
  as: 'organization_service'
});

Services.belongsToMany(TblOrganizationType, {
  through: 'OrganizationTypeServices', // or the actual junction table name
  foreignKey: 'service_id', // The foreign key in the junction table
});

TblOrganizationType.belongsToMany(Services, {
  through: 'OrganizationTypeServices', // or the actual junction table name
  foreignKey: 'organizationType_id', // The foreign key in the junction table
});

OrderServices.belongsTo(OrderReports,{foreignKey:'orderId',as:"orderServices"})
OrderReports.hasMany(OrderServices,{foreignKey:'orderId',as: "orderServices",})

OrderServices.belongsTo(Services,{foreignKey:'orgserviceId',as:"serviceDetails"})
Services.hasMany(OrderServices,{foreignKey:'orgserviceId'})

OrderReports.belongsTo(User,{foreignKey:"userUUID",as:"userDetails"})
User.hasMany(OrderReports,{foreignKey:"userUUID"})