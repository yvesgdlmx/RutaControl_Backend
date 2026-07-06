import express from 'express'
import { obtenerResumen } from '../controllers/tableroController.js'

const router = express.Router()

router.get('/resumen', obtenerResumen)

export default router
