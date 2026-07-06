import express from 'express'
import { actualizarDestino, crearDestino, eliminarDestino, obtenerDestinos } from '../controllers/destinoController.js'

const router = express.Router()

router.get('/', obtenerDestinos)
router.post('/', crearDestino)
router.put('/:id', actualizarDestino)
router.delete('/:id', eliminarDestino)

export default router
