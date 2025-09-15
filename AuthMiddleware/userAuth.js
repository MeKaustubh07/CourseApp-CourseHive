const jwt = require("jsonwebtoken") ;

const { JWT_SECRET_USER } = require("../config") ;

async function userAuthe(req, res, next) {
    try {
      const authHeader = req.headers.authorization || "";
      const token =
        authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  
      if (!token) {
        return res.status(401).json({ message: "No token provided!" });
      }
  
      const userdetails = jwt.verify(token, JWT_SECRET_USER);
      if (userdetails && userdetails.id) {
        req.userId = userdetails.id; // match your routes that read req.userId
        return next();
      }
  
      return res.status(401).json({ message: "Invalid token!" });
    } catch (error) {
      return res.status(401).json({ message: "Invalid token!" });
    }
  }

module.exports = {
  userAuthe ,
  JWT_SECRET_USER 
};