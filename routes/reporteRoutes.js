import express from 'express'
import { obtenerReportes } from '../controllers/reporteController.js'

const router = express.Router()

router.get('/', obtenerReportes)

export default router
