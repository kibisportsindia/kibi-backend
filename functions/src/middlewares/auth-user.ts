import { NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config.json";

module.exports = (req: any, res: any, next: NextFunction) => {
  const token = req.header("auth-user");
  if (!token) {
    return res.status(401).send("Unauthorized!");
  }

  try {
    const decoded = jwt.verify(token, config.TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).send("Invalid Token!");
  }
}
