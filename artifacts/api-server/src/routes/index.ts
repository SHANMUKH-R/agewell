import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agewellRouter from "./agewell";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agewellRouter);

export default router;
