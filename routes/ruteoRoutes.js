import express from 'express'
import { obtenerRutaSugerida } from '../controllers/ruteoController.js'

const router = express.Router()

router.post('/sugerida', obtenerRutaSugerida)

export default router
