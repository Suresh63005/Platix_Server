const Organization=require("./Organization.model")
const Service=require("./TblServices.model")
const TblOrganization_Service=require("./tblOrganizationService")


TblOrganization_Service.belongsTo(Organization,{foreignKey:"organization_id",as:"organization"})
Organization.hasMany(TblOrganization_Service,{foreignKey:"organization_id",as:"organization"})

TblOrganization_Service.belongsTo(Service,{foreignKey:"service_id",as:"service"})
Service.hasMany(TblOrganization_Service,{foreignKey:"service_id",as:"service"})
