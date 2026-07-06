import express from 'express'
import { actualizarConfiguracion, obtenerConfiguracion } from '../controllers/configuracionController.js'

const router = express.Router()

router.get('/', obtenerConfiguracion)
router.put('/:id', actualizarConfiguracion)

export default router
