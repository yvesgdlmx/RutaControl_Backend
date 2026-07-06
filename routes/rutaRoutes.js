import express from 'express'
import { actualizarRuta, crearRuta, obtenerRutas } from '../controllers/rutaController.js'

const router = express.Router()

router.get('/', obtenerRutas)
router.post('/', crearRuta)
router.put('/:id', actualizarRuta)

export default router
