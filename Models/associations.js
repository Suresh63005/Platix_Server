const Organization=require("./Organization.model")
const OrderReports = require("./ReportsModel/OrderReport.model")
const User = require("./ReportsModel/User.model")
const UserReports = require("./ReportsModel/User.model")
const TblOrganizationType = require("./TblOrganizationType.model")
const Roles = require("./TblRoles.model")


Organization.belongsTo(TblOrganizationType, {foreignKey: "organizationType_id", as: "organizationType",});
TblOrganizationType.hasMany(Organization, {foreignKey: "organizationType_id", });

OrderReports.belongsTo(UserReports, { foreignKey: "userUUID", as: "user" });
UserReports.belongsTo(OrderReports, { foreignKey: "userUUID", as: "user" });

OrderReports.belongsTo(Organization, { foreignKey: "fromOrganization", as: "fromOrg" });
Organization.belongsTo(OrderReports, { foreignKey: "fromOrganization", as: "fromOrg" });

OrderReports.belongsTo(Organization, { foreignKey: "toOrganization", as: "toOrg" });
Organization.belongsTo(OrderReports, { foreignKey: "toOrganization", as: "toOrg" });


User.belongsTo(TblOrganizationType, { foreignKey: "organizationType_id", as: "organizationType1", });
TblOrganizationType.belongsTo(User, { foreignKey: "organizationType_id",  });
  
User.belongsTo(Organization, {foreignKey: "organization_id", as: "organization",});
Organization.belongsTo(User, {foreignKey: "organization_id", as: "organization",});
  
User.belongsTo(Roles, { foreignKey: "role_id", as: "role",});
Roles.belongsTo(User, { foreignKey: "role_id", as: "role",});
