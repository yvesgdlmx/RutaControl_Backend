import express from 'express'
import { actualizarOrigen, crearOrigen, eliminarOrigen, obtenerOrigenes } from '../controllers/origenController.js'

const router = express.Router()

router.get('/', obtenerOrigenes)
router.post('/', crearOrigen)
router.put('/:id', actualizarOrigen)
router.delete('/:id', eliminarOrigen)

export default router
