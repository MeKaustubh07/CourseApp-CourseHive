require("dotenv").config() ;

const JWT_SECRET_USER = process.env.JWT_USER ;
const JWT_SECRET_ADMIN = process.env.JWT_ADMIN ;

module.exports = {

    JWT_SECRET_ADMIN ,
    JWT_SECRET_USER
    
}
